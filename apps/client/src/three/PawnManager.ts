import * as THREE from 'three';
import { BOARD_PATH } from '@safety-board/shared';
import { DEFAULT_THEME, type BoardTheme } from './theme/boardTheme';
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
const PAWN_Y_OFFSET  = 0.65;  // altura do peão acima da superfície do tile
const JUMP_HEIGHT    = 0.4;   // amplitude do arco ao subir de nível
const JUMP_THRESHOLD = 0.3;   // Δy mínimo para acionar o salto

interface PawnStep { from: number; to: number; }
interface PawnAnim { steps: PawnStep[]; stepIdx: number; t: number; onDone?: () => void; }

/**
 * Aplica a cor do jogador ao Object3D do peão. No modo procedural, cria material
 * novo. No modo glTF, procura mesh com nome `theme.pawn.bodyMaterialName` e
 * substitui o material dessa mesh. Veja `MODELING.md` para convenção de naming.
 */
function applyPlayerColor(obj: THREE.Object3D, color: number, bodyMeshName: string, isGLTF: boolean): void {
  if (!isGLTF) {
    // Peão procedural é um único Mesh — substitui material direto.
    if ((obj as THREE.Mesh).isMesh) {
      (obj as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color });
    }
    return;
  }
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name === bodyMeshName) {
      (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color });
    }
  });
}

export class PawnManager {
  private readonly pawns        = new Map<string, THREE.Object3D>();
  private readonly colorIndexes = new Map<string, number>();
  private readonly animations   = new Map<string, PawnAnim>();
  private readonly scene: THREE.Scene;
  private readonly theme: BoardTheme;
  private readonly assets: AssetLoader | null;
  private gltfTemplate: THREE.Group | null = null;

  constructor(scene: THREE.Scene, theme: BoardTheme = DEFAULT_THEME, assets: AssetLoader | null = null) {
    this.scene = scene;
    this.theme = theme;
    this.assets = assets;

    // Preload assíncrono do template glTF quando configurado.
    if (theme.pawn.url && assets) {
      assets.loadGLTF(theme.pawn.url, 'pawn')
        .then((group) => { this.gltfTemplate = group; })
        .catch(() => { this.gltfTemplate = null; /* fallback procedural */ });
    }
  }

  addPawn(playerId: string, colorIndex: number): void {
    const color = this.theme.pawn.colorsByIndex[colorIndex % this.theme.pawn.colorsByIndex.length]
               ?? FALLBACK_PAWN_COLORS[colorIndex % FALLBACK_PAWN_COLORS.length];

    let obj: THREE.Object3D;
    if (this.theme.pawn.url && this.gltfTemplate) {
      // Clonar modelo glTF e aplicar cor na mesh-alvo.
      obj = this.gltfTemplate.clone(true);
      const s = this.theme.pawn.scale;
      obj.scale.set(s, s, s);
      applyPlayerColor(obj, color, this.theme.pawn.bodyMaterialName, true);
    } else {
      // Procedural: CapsuleGeometry (~70cm altura).
      const geometry = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      obj = mesh;
    }

    this.scene.add(obj);
    this.pawns.set(playerId, obj);
    this.colorIndexes.set(playerId, colorIndex);
  }

  /** Teleporta instantaneamente (para sync inicial ou posição forçada). */
  movePawn(playerId: string, tileIndex: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    const tile = BOARD_PATH[tileIndex];
    const idx = this.colorIndexes.get(playerId) ?? 0;
    const [ox, oz] = TILE_OFFSETS[idx % TILE_OFFSETS.length];
    pawn.position.set(tile.x + ox, tile.y + PAWN_Y_OFFSET, tile.z + oz);
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
      const fromTile = BOARD_PATH[step.from];
      const toTile   = BOARD_PATH[step.to];
      const colorIdx = this.colorIndexes.get(playerId) ?? 0;
      const [ox, oz] = TILE_OFFSETS[colorIdx % TILE_OFFSETS.length];

      anim.t = Math.min(anim.t + delta / STEP_DURATION, 1);
      const t = anim.t;

      const x = fromTile.x + ox + (toTile.x - fromTile.x) * t;
      const z = fromTile.z + oz + (toTile.z - fromTile.z) * t;

      const yFrom = fromTile.y + PAWN_Y_OFFSET;
      const yTo   = toTile.y   + PAWN_Y_OFFSET;
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
