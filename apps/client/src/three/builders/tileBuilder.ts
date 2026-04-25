import * as THREE from 'three';
import { BOARD_PATH } from '@safety-board/shared';
import { computeTileHSL } from '../tileColors';
import type { BoardTheme } from '../theme/boardTheme';

// Grupos de tiles seguem a divisão do BOARD_PATH (10 em 10).
function tileGroup(index: number): number {
  return Math.min(Math.floor(index / 10), 3);
}

/**
 * Interface mínima do AssetManager consumida pelo builder.
 * Permite injeção em testes sem puxar a instância singleton.
 */
export interface AssetLoader {
  loadGLTF(url: string, category?: 'tile' | 'pawn' | 'ground' | 'decoration' | 'unknown'): Promise<THREE.Group>;
}

/**
 * Constrói os 40 tiles no cenário. Dois modos:
 * - Procedural (theme.tile.url indefinido): BoxGeometry(1, 0.3, 1) + cor HSL por grupo.
 * - glTF (theme.tile.url definido): clona o template carregado para cada posição.
 *
 * Ambos respeitam a convenção 1 unit = 1 metro. theme.tile.scale é multiplicador.
 */
export async function buildTiles(
  scene: THREE.Scene,
  theme: BoardTheme,
  assets: AssetLoader,
): Promise<THREE.Object3D[]> {
  if (theme.tile.url) {
    return buildTilesFromGLTF(scene, theme, assets);
  }
  return buildTilesProcedural(scene, theme);
}

function buildTilesProcedural(scene: THREE.Scene, theme: BoardTheme): THREE.Object3D[] {
  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
  const tiles: THREE.Object3D[] = [];
  for (const tile of BOARD_PATH) {
    let color: THREE.Color;
    if (theme.tile.useProceduralColors) {
      const [h, s, l] = computeTileHSL(tile.index, tileGroup(tile.index));
      color = new THREE.Color().setHSL(h, s, l);
    } else {
      color = new THREE.Color();
    }
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.position.set(tile.x, tile.y, tile.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    tiles.push(mesh);
  }
  return tiles;
}

async function buildTilesFromGLTF(
  scene: THREE.Scene,
  theme: BoardTheme,
  assets: AssetLoader,
): Promise<THREE.Object3D[]> {
  const url = theme.tile.url!;
  const template = await assets.loadGLTF(url, 'tile');
  const s = theme.tile.scale;
  const tiles: THREE.Object3D[] = [];
  for (const tile of BOARD_PATH) {
    const clone = template.clone() as THREE.Group;
    clone.position.set(tile.x, tile.y, tile.z);
    clone.scale.set(s, s, s);
    scene.add(clone);
    tiles.push(clone);
  }
  return tiles;
}
