import * as THREE from 'three';
import type { BoardTheme } from '../theme/boardTheme';
import type { AssetLoader } from './tileBuilder';

/**
 * Constrói o chão do diorama. Em modo procedural, BoxGeometry com as dimensões
 * e cor definidas no theme.ground. Em modo glTF, carrega e posiciona.
 * Escala 1:1 — theme.ground.size em metros.
 */
export async function buildGround(
  scene: THREE.Scene,
  theme: BoardTheme,
  assets: AssetLoader,
): Promise<THREE.Object3D> {
  if (theme.ground.url) {
    const template = await assets.loadGLTF(theme.ground.url, 'ground');
    const clone = template.clone() as THREE.Group;
    clone.position.set(4.5, -0.25, 4);
    scene.add(clone);
    return clone;
  }

  const [w, d] = theme.ground.size;
  const groundGeo = new THREE.BoxGeometry(w, 0.2, d);
  const groundMat = new THREE.MeshStandardMaterial({ color: theme.ground.color, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(4.5, -0.25, 4);
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
