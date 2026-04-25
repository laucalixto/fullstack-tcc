import * as THREE from 'three';
import type { BoardTheme } from '../theme/boardTheme';
import type { AssetLoader } from './tileBuilder';

/**
 * Adiciona elementos decorativos estáticos ao cenário conforme theme.decorations[].
 * Cada decoração = { url, position[m], rotation?[rad], scale? }.
 * Modelos glTF são clonados; URLs repetidas reusam o template cacheado pelo AssetManager.
 */
export async function buildDecorations(
  scene: THREE.Scene,
  theme: BoardTheme,
  assets: AssetLoader,
): Promise<void> {
  for (const deco of theme.decorations) {
    const template = await assets.loadGLTF(deco.url, 'decoration');
    const clone = template.clone() as THREE.Group;
    clone.position.set(deco.position[0], deco.position[1], deco.position[2]);
    if (deco.rotation) clone.rotation.set(deco.rotation[0], deco.rotation[1], deco.rotation[2]);
    const s = deco.scale ?? 1.0;
    clone.scale.set(s, s, s);
    scene.add(clone);
  }
}
