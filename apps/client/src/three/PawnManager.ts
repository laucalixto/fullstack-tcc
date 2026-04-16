import * as THREE from 'three';
import { BOARD_PATH } from '@safety-board/shared';

const PAWN_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261] as const;

export class PawnManager {
  private readonly pawns = new Map<string, THREE.Mesh>();
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
    mesh.position.set(0, 0.65, 0);
    this.scene.add(mesh);
    this.pawns.set(playerId, mesh);
  }

  movePawn(playerId: string, tileIndex: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    const tile = BOARD_PATH[tileIndex];
    pawn.position.set(tile.x, tile.y + 0.65, tile.z);
  }

  removePawn(playerId: string): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    this.scene.remove(pawn);
    this.pawns.delete(playerId);
  }

  getPawnCount(): number {
    return this.pawns.size;
  }
}
