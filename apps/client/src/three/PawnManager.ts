import * as THREE from 'three';
import { BOARD_PATH } from '@safety-board/shared';

const PAWN_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261] as const;

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

interface PawnStep {
  from: number; // tile index de origem
  to:   number; // tile index de destino
}

interface PawnAnim {
  steps:    PawnStep[];
  stepIdx:  number;  // passo atual em execução
  t:        number;  // progresso [0, 1] dentro do passo atual
}

export class PawnManager {
  private readonly pawns        = new Map<string, THREE.Mesh>();
  private readonly colorIndexes = new Map<string, number>();
  private readonly animations   = new Map<string, PawnAnim>();
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addPawn(playerId: string, colorIndex: number): void {
    const geometry = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: PAWN_COLORS[colorIndex % PAWN_COLORS.length],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.pawns.set(playerId, mesh);
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

  /**
   * Anima o peão de `fromIndex` até `toIndex` passando tile a tile.
   * Aciona arco em Y quando a diferença de altura entre tiles é ≥ JUMP_THRESHOLD.
   */
  animatePawn(playerId: string, fromIndex: number, toIndex: number): void {
    if (!this.pawns.has(playerId)) return;
    if (fromIndex === toIndex) return;

    const steps: PawnStep[] = [];
    for (let i = fromIndex; i < toIndex; i++) {
      steps.push({ from: i, to: i + 1 });
    }
    this.animations.set(playerId, { steps, stepIdx: 0, t: 0 });
  }

  /** Retorna `true` enquanto houver animação ativa para este jogador. */
  isAnimating(playerId: string): boolean {
    return this.animations.has(playerId);
  }

  /** Avança todas as animações ativas. Chamar a cada frame com delta em segundos. */
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

      // Interpolação X e Z com offset de quadrante constante
      const x = fromTile.x + ox + (toTile.x - fromTile.x) * t;
      const z = fromTile.z + oz + (toTile.z - fromTile.z) * t;

      // Interpolação Y com arco opcional quando o tile muda de nível
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
          // Snap final exato ao tile de destino
          this.movePawn(playerId, step.to);
          this.animations.delete(playerId);
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
}
