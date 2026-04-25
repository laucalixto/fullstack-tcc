import * as THREE from 'three';
import { BOARD_PATH, tileCategory } from '@safety-board/shared';
import { computeTileHSL } from '../tileColors';
import { resolveTileUrl, type BoardTheme, type TileAtlasConfig } from '../theme/boardTheme';

// Grupos de tiles seguem a divisão do BOARD_PATH (10 em 10).
function tileGroup(index: number): number {
  return Math.min(Math.floor(index / 10), 3);
}

/**
 * Interface mínima do AssetManager consumida pelos builders.
 * Permite injeção em testes sem puxar a instância singleton.
 */
export interface AssetLoader {
  loadGLTF(url: string, category?: 'tile' | 'pawn' | 'ground' | 'decoration' | 'unknown'): Promise<THREE.Group>;
  loadTexture?(url: string): Promise<THREE.Texture>;
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
  // Cascata: para cada tile, decide entre glTF (urlByIndex/urlByCategory/url) ou procedural.
  // Cache local de templates carregados para a sessão de build (cobre tiles que repetem URL).
  const gltfCache = new Map<string, THREE.Group>();

  // Atlas (opção A): carregado uma vez se configurado e clonado por tile.
  // Falha de carga (asset ausente, erro de rede) é silenciada — o builder cai
  // para o modo sem topper. Em testes/jsdom isso evita unhandled rejections.
  let atlasTexture: THREE.Texture | null = null;
  if (theme.tile.atlas && assets.loadTexture) {
    try {
      atlasTexture = await assets.loadTexture(theme.tile.atlas.url);
    } catch {
      atlasTexture = null;
    }
  }

  const tiles: THREE.Object3D[] = [];
  for (const tile of BOARD_PATH) {
    const cat = tileCategory(tile.index);
    const url = resolveTileUrl(theme, tile.index, cat);

    let baseObj: THREE.Object3D;
    if (url) {
      let template = gltfCache.get(url);
      if (!template) {
        template = await assets.loadGLTF(url, 'tile');
        gltfCache.set(url, template);
      }
      const clone = template.clone() as THREE.Group;
      const s = theme.tile.scale;
      clone.position.set(tile.x, tile.y, tile.z);
      clone.scale.set(s, s, s);
      baseObj = clone;
    } else {
      baseObj = buildProceduralTile(tile, theme);
    }
    scene.add(baseObj);
    tiles.push(baseObj);

    // Topper de atlas: aplica acima do tile. Funciona com qualquer base (procedural ou glTF).
    if (atlasTexture && theme.tile.atlas) {
      const topper = buildAtlasTopper(atlasTexture, theme.tile.atlas, tile.index);
      topper.position.set(tile.x, tile.y + 0.16, tile.z); // +0.16 = 0.15 (meia altura do tile) + 0.01 (folga)
      topper.rotation.set(-Math.PI / 2, 0, 0);            // plane horizontal voltado para cima
      scene.add(topper);
    }
  }
  return tiles;
}

function buildProceduralTile(tile: { x: number; y: number; z: number; index: number }, theme: BoardTheme): THREE.Mesh {
  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
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
  return mesh;
}

/**
 * Cria um plane "topper" (0.95×0.95m) com material que mapeia uma célula do atlas.
 * Atlas é uma grid linha-major: tile índice `i` → célula `(i % cols, floor(i / cols))`.
 * UV em Three.js tem origem no canto inferior-esquerdo, então invertemos a linha.
 */
function buildAtlasTopper(template: THREE.Texture, atlas: TileAtlasConfig, tileIndex: number): THREE.Mesh {
  const col = tileIndex % atlas.columns;
  const row = Math.floor(tileIndex / atlas.columns);
  const tex = template.clone();
  tex.repeat.set(1 / atlas.columns, 1 / atlas.rows);
  // UV.y invertido: linha 0 (topo do atlas) corresponde ao topo da imagem em coordenadas UV.
  tex.offset.set(col / atlas.columns, 1 - (row + 1) / atlas.rows);
  const geo = new THREE.PlaneGeometry(0.95, 0.95);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(geo, mat);
}
