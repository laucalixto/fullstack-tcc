import * as THREE from 'three';
import type { BoardTheme } from '../theme/boardTheme';

/**
 * Aplica iluminação, fog e background ao scene a partir do tema.
 * Retorna um cleanup opcional (hoje no-op — luzes persistem com a cena).
 */
export function setupLighting(scene: THREE.Scene, theme: BoardTheme): void {
  scene.background = new THREE.Color(theme.background.color);
  scene.fog = new THREE.Fog(theme.background.fog.color, theme.background.fog.near, theme.background.fog.far);

  const ambient = new THREE.AmbientLight(0xffffff, theme.lighting.ambientIntensity);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, theme.lighting.sunIntensity);
  const [sx, sy, sz] = theme.lighting.sunPosition;
  sun.position.set(sx, sy, sz);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);
}
