import * as THREE from 'three';
import type { TilePosition } from '@safety-board/shared';
import { BOARD_PATH } from '@safety-board/shared';
import { DEFAULT_THEME, resolveLayout, type BoardTheme } from './theme/boardTheme';
import type { AssetLoader } from './builders/tileBuilder';

const FALLBACK_PAWN_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261] as const;

// Offsets de quadrante: até 4 peões no mesmo tile sem sobreposição
const TILE_OFFSETS: ReadonlyArray<[number, number]> = [
  [-0.22, -0.22],
  [ 0.22, -0.22],
  [-0.22,  0.22],
  [ 0.22,  0.22],
];

const STEP_DURATION  = 0.12;  // segundos por tile na animação
/**
 * Offset Y default do peão procedural: metade da altura da CapsuleGeometry
 * (~70cm) — encaixa o fundo da cápsula exatamente sobre o tile. No modo glTF,
 * `PawnManager` mede o bounding box e sobrescreve este valor com `-bbox.min.y`,
 * pousando o fundo do modelo independentemente de onde o pivô foi posicionado
 * no Blender. `theme.pawn.yOffset` (opcional) tem precedência sobre ambos.
 */
const PROCEDURAL_Y_OFFSET = 0.35;
const JUMP_HEIGHT    = 0.4;   // amplitude do arco ao subir de nível
const JUMP_THRESHOLD = 0.3;   // Δy mínimo para acionar o salto

interface PawnStep { from: number; to: number; }
interface PawnAnim { steps: PawnStep[]; stepIdx: number; t: number; onDone?: () => void; }

/**
 * Aplica a cor do jogador ao Object3D do peão. No modo procedural, cria material
 * novo. No modo glTF, procura mesh cujo nome **comece** com
 * `theme.pawn.bodyMaterialName` (case-insensitive) — cobre `pawn-body`,
 * `pawn-body.001` (sufixo do Blender), `Pawn-Body` etc. Quando nada bate,
 * emite warning listando todas as meshes encontradas para o dev renomear no
 * Outliner. Veja `_docs_refs/MODELING.md §4` para a convenção.
 */
function applyPlayerColor(obj: THREE.Object3D, color: number, bodyMeshName: string, isGLTF: boolean): void {
  if (!isGLTF) {
    // Peão procedural é um único Mesh — substitui material direto.
    if ((obj as THREE.Mesh).isMesh) {
      (obj as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color });
    }
    return;
  }
  const target = bodyMeshName.toLowerCase();
  const seen: string[] = [];
  let matched = false;
  obj.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    seen.push(child.name);
    if (child.name.toLowerCase().startsWith(target)) {
      (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color });
      matched = true;
    }
  });
  if (!matched && seen.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[PawnManager] mesh começando com "${bodyMeshName}" não encontrada no glTF; `
        + `cor do jogador não aplicada. Meshes encontradas: [${seen.join(', ')}]. `
        + 'Renomeie a malha do corpo no Outliner do Blender (veja MODELING.md §4).',
    );
  }
}

export class PawnManager {
  private readonly pawns      = new Map<string, THREE.Object3D>();
  /** Slot 0–3 do jogador na ordem de entrada — define o quadrante em TILE_OFFSETS. */
  private readonly slots      = new Map<string, number>();
  /** Cor hex final aplicada (resolvida do avatar; com variação quando duplicado). */
  private readonly colors     = new Map<string, number>();
  private readonly animations = new Map<string, PawnAnim>();
  private readonly scene: THREE.Scene;
  private readonly theme: BoardTheme;
  private readonly assets: AssetLoader | null;
  private readonly layout: TilePosition[];
  private gltfTemplate: THREE.Group | null = null;
  /**
   * Offset Y vigente. Inicia em `theme.pawn.yOffset` (se definido) ou
   * `PROCEDURAL_Y_OFFSET` (fallback). Ao carregar glTF, recalculado via
   * bounding box para pousar o fundo do modelo no tile.
   */
  private yOffset: number;

  constructor(scene: THREE.Scene, theme: BoardTheme = DEFAULT_THEME, assets: AssetLoader | null = null) {
    this.scene = scene;
    this.theme = theme;
    this.assets = assets;
    // Layout efetivo (custom do tema ou BOARD_PATH default).
    // Tolerante a temas truncados em testes que não passam todos os campos.
    this.layout = (theme.boardLayout || theme === DEFAULT_THEME)
      ? resolveLayout(theme)
      : BOARD_PATH;
    // Override do tema tem precedência; senão default procedural.
    this.yOffset = theme.pawn.yOffset ?? PROCEDURAL_Y_OFFSET;

    // Preload assíncrono do template glTF quando configurado. Se o load
    // resolver DEPOIS de addPawn já ter sido chamado, peões capsulares
    // (criados como fallback) são trocados pelo clone do glTF preservando
    // posição e cor — evita corrida em quem usa addPawn antes do preload.
    if (theme.pawn.url && assets) {
      assets.loadGLTF(theme.pawn.url, 'pawn')
        .then((group) => {
          this.gltfTemplate = group;
          // Mede o bbox do template uma vez para descobrir onde está o fundo
          // do modelo (pivô pode estar em qualquer lugar). Override do tema
          // ainda tem precedência se definido explicitamente.
          if (theme.pawn.yOffset === undefined) {
            const min = new THREE.Box3().setFromObject(group).min;
            this.yOffset = -min.y;
          }
          this.upgradeProceduralPawnsToGLTF();
        })
        .catch(() => { this.gltfTemplate = null; /* fallback procedural */ });
    }
  }

  /**
   * Substitui peões capsulares existentes pelo clone do glTF recém-carregado.
   * Posição (x/y/z) e cor por jogador são preservados. Idempotente: peões já
   * trocados no Map saem da iteração porque a cópia da lista é tirada uma vez.
   */
  private upgradeProceduralPawnsToGLTF(): void {
    if (!this.gltfTemplate) return;
    const playerIds = [...this.pawns.keys()];
    for (const playerId of playerIds) {
      const oldPawn = this.pawns.get(playerId);
      if (!oldPawn) continue;
      const color = this.colors.get(playerId) ?? FALLBACK_PAWN_COLORS[0];

      const obj = this.gltfTemplate.clone(true);
      const s = this.theme.pawn.scale;
      obj.scale.set(s, s, s);
      applyPlayerColor(obj, color, this.theme.pawn.bodyMaterialName, true);
      // Preserva posição do peão antigo (em qualquer lugar do tabuleiro).
      obj.position.set(oldPawn.position.x, oldPawn.position.y, oldPawn.position.z);

      this.scene.remove(oldPawn);
      this.scene.add(obj);
      this.pawns.set(playerId, obj);
    }
  }

  /**
   * @param slotIndex 0–3 — quadrante onde o peão se posiciona no tile (até 4
   *  jogadores no mesmo tile sem sobreposição).
   * @param color Cor hex final do peão (resolvida via `pawnColors.resolvePawnColor`).
   *  Se omitido, recai na paleta `theme.pawn.colorsByIndex[slotIndex]` para
   *  preservar comportamento legado em testes/uso direto.
   */
  addPawn(playerId: string, slotIndex: number, color?: number): void {
    const finalColor = color ??
      this.theme.pawn.colorsByIndex[slotIndex % this.theme.pawn.colorsByIndex.length] ??
      FALLBACK_PAWN_COLORS[slotIndex % FALLBACK_PAWN_COLORS.length];

    let obj: THREE.Object3D;
    if (this.theme.pawn.url && this.gltfTemplate) {
      // Clonar modelo glTF e aplicar cor na mesh-alvo.
      obj = this.gltfTemplate.clone(true);
      const s = this.theme.pawn.scale;
      obj.scale.set(s, s, s);
      applyPlayerColor(obj, finalColor, this.theme.pawn.bodyMaterialName, true);
    } else {
      // Procedural: CapsuleGeometry (~70cm altura).
      const geometry = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: finalColor });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      obj = mesh;
    }

    this.scene.add(obj);
    this.pawns.set(playerId, obj);
    this.slots.set(playerId, slotIndex);
    this.colors.set(playerId, finalColor);
  }

  /** Atualiza a cor do peão (usado ao "upgrade" de cor pós-resolução de avatar). */
  setPawnColor(playerId: string, color: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    this.colors.set(playerId, color);
    const isGLTF = !!(this.theme.pawn.url && this.gltfTemplate);
    applyPlayerColor(pawn, color, this.theme.pawn.bodyMaterialName, isGLTF);
  }

  /** Teleporta instantaneamente (para sync inicial ou posição forçada). */
  movePawn(playerId: string, tileIndex: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    const tile = this.layout[tileIndex];
    const idx = this.slots.get(playerId) ?? 0;
    const [ox, oz] = TILE_OFFSETS[idx % TILE_OFFSETS.length];
    pawn.position.set(tile.x + ox, tile.y + this.yOffset, tile.z + oz);
  }

  animatePawn(playerId: string, fromIndex: number, toIndex: number, onDone?: () => void): void {
    if (!this.pawns.has(playerId)) return;
    if (fromIndex === toIndex) return;

    const steps: PawnStep[] = [];
    if (toIndex > fromIndex) {
      for (let i = fromIndex; i < toIndex; i++) steps.push({ from: i, to: i + 1 });
    } else {
      for (let i = fromIndex; i > toIndex; i--) steps.push({ from: i, to: i - 1 });
    }
    this.animations.set(playerId, { steps, stepIdx: 0, t: 0, onDone });
  }

  isAnimating(playerId: string): boolean {
    return this.animations.has(playerId);
  }

  update(delta: number): void {
    for (const [playerId, anim] of this.animations) {
      const pawn = this.pawns.get(playerId);
      if (!pawn) { this.animations.delete(playerId); continue; }

      const step     = anim.steps[anim.stepIdx];
      const fromTile = this.layout[step.from];
      const toTile   = this.layout[step.to];
      const slotIdx = this.slots.get(playerId) ?? 0;
      const [ox, oz] = TILE_OFFSETS[slotIdx % TILE_OFFSETS.length];

      anim.t = Math.min(anim.t + delta / STEP_DURATION, 1);
      const t = anim.t;

      const x = fromTile.x + ox + (toTile.x - fromTile.x) * t;
      const z = fromTile.z + oz + (toTile.z - fromTile.z) * t;

      const yFrom = fromTile.y + this.yOffset;
      const yTo   = toTile.y   + this.yOffset;
      const dyAbs = Math.abs(toTile.y - fromTile.y);
      const arc   = dyAbs >= JUMP_THRESHOLD ? JUMP_HEIGHT * Math.sin(t * Math.PI) : 0;
      const y     = yFrom + (yTo - yFrom) * t + arc;

      pawn.position.set(x, y, z);

      if (t >= 1) {
        anim.stepIdx++;
        anim.t = 0;
        if (anim.stepIdx >= anim.steps.length) {
          this.movePawn(playerId, step.to);
          this.animations.delete(playerId);
          anim.onDone?.();
        }
      }
    }
  }

  removePawn(playerId: string): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    this.scene.remove(pawn);
    this.pawns.delete(playerId);
    this.animations.delete(playerId);
  }

  getPawnCount(): number {
    return this.pawns.size;
  }

  /** Aplica escala uniforme a todos os peões (usado pelo preview em realtime). */
  setGlobalScale(s: number): void {
    for (const pawn of this.pawns.values()) {
      pawn.scale.set(s, s, s);
    }
  }
}
