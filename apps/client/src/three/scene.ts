import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BOARD_PATH } from '@safety-board/shared';
import type { Player } from '@safety-board/shared';
import { CameraController } from './camera';
import { PawnManager } from './PawnManager';
import { gameBus } from './EventBus';

// ─── Constantes de cena ───────────────────────────────────────────────────────

const TILE_COLORS: Record<number, number> = {
  0: 0x4caf50, // grupo 1 — verde (NR-06)
  1: 0x2196f3, // grupo 2 — azul (NR-35)
  2: 0xe53935, // grupo 3 — vermelho (NR-33)
  3: 0xff9800, // grupo 4 — laranja (subida final)
};

function tileGroup(index: number): number {
  return Math.min(Math.floor(index / 10), 3);
}

// ─── Scene builder ────────────────────────────────────────────────────────────

export function initThreeScene(container: HTMLDivElement): () => void {
  // Renderer — usa window.inner* como fallback se o container ainda não tiver dimensões
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const initW = container.clientWidth  || window.innerWidth;
  const initH = container.clientHeight || window.innerHeight;
  renderer.setSize(initW, initH);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    40,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(18, 14, 18);
  camera.lookAt(4.5, 0, 4.5);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  // OrbitControls + CameraController
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 4;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2;

  const cameraController = new CameraController(camera, controls);

  // PawnManager — gerencia peões no tabuleiro
  const pawnManager = new PawnManager(scene);
  const knownPlayers = new Set<string>();

  // Posição do jogador ativo — câmera segue este ponto
  const activePos = new THREE.Vector3(BOARD_PATH[0].x, BOARD_PATH[0].y, BOARD_PATH[0].z);

  // gameBus: sincroniza peões com o estado do jogo (emitido pelo GamePage via socket)
  const unsubPlayers = gameBus.on<Player[]>('players:sync', (players) => {
    players.forEach((player, i) => {
      if (!knownPlayers.has(player.id)) {
        pawnManager.addPawn(player.id, i);
        knownPlayers.add(player.id);
      }
      pawnManager.movePawn(player.id, player.position);
    });
  });

  // gameBus: câmera salta para o peão do jogador ativo na troca de turno
  const unsubActive = gameBus.on<{ tileIndex: number }>('active:player', ({ tileIndex }) => {
    const tile = BOARD_PATH[tileIndex] ?? BOARD_PATH[0];
    activePos.set(tile.x, tile.y, tile.z);
    cameraController.snapToPlayer(activePos);
  });

  // Board tiles
  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
  BOARD_PATH.forEach((tile) => {
    const mat = new THREE.MeshStandardMaterial({
      color: TILE_COLORS[tileGroup(tile.index)],
      roughness: 0.7,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.position.set(tile.x, tile.y, tile.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Ground plane (base block visual)
  const groundGeo = new THREE.BoxGeometry(12, 0.2, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(4.5, -0.25, 4);
  ground.receiveShadow = true;
  scene.add(ground);

  // Animation loop
  let animId: number;

  function animate() {
    animId = requestAnimationFrame(animate);
    cameraController.update(activePos);
    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  function onResize() {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Cleanup
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    unsubPlayers();
    unsubActive();
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
