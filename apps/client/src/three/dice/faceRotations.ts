import * as THREE from 'three';

// Quaternion que posiciona cada face (1–6) olhando para cima (+Y)
// BoxGeometry padrão: face +Y = 1, -Y = 6, +Z = 2, -Z = 5, +X = 3, -X = 4
export const FACE_QUATERNIONS: Record<number, THREE.Quaternion> = {
  1: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
  2: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
  3: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
  4: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2)),
  5: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
  6: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)),
};
