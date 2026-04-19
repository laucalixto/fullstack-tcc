import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BOARD_PATH } from '@safety-board/shared';
import type { Player } from '@safety-board/shared';
import { CameraController } from './camera';
import { PawnManager } from './PawnManager';
import { DicePhysics, DICE_ZONE } from './dice/DicePhysics';
import { gameBus } from './EventBus';
import { computeTileHSL } from './tileColors';

// ─── Grupos de tiles ──────────────────────────────────────────────────────────

function tileGroup(index: number): number {
  return Math.min(Math.floor(index / 10), 3);
}

// ─── Scene builder ────────────────────────────────────────────────────────────

export function initThreeScene(container: HTMLDivElement): () => void {
  // Renderer
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

  // PawnManager
  const pawnManager = new PawnManager(scene);
  const knownPlayers  = new Set<string>();
  // Última posição conhecida de cada jogador — para calcular from/to da animação
  const pawnPositions = new Map<string, number>();

  const activePos = new THREE.Vector3(BOARD_PATH[0].x, BOARD_PATH[0].y, BOARD_PATH[0].z);

  let diceRolling = false;
  let pendingPawnSync: Player[] | null = null;
  let activePlayerId: string | null = null;

  // DicePhysics — animação tween pura na zona de rolagem
  const dicePhysics = new DicePhysics(scene);

  // ─── gameBus — peões ────────────────────────────────────────────────────────

  function applyPawnPositions(players: Player[], animateOnlyId: string | null = null): void {
    players.forEach((player, i) => {
      if (!knownPlayers.has(player.id)) {
        pawnManager.addPawn(player.id, i);
        knownPlayers.add(player.id);
        pawnManager.movePawn(player.id, player.position);
        pawnPositions.set(player.id, player.position);
      } else {
        const oldPos = pawnPositions.get(player.id) ?? player.position;
        if (oldPos !== player.position) {
          pawnPositions.set(player.id, player.position);
          if (animateOnlyId === null || player.id === animateOnlyId) {
            const onDone = animateOnlyId !== null && player.id === animateOnlyId
              ? () => { gameBus.emit('pawn:done', { playerId: player.id }); }
              : undefined;
            pawnManager.animatePawn(player.id, oldPos, player.position, onDone);
            const tile = BOARD_PATH[player.position] ?? BOARD_PATH[0];
            activePos.set(tile.x, tile.y, tile.z);
          } else {
            pawnManager.movePawn(player.id, player.position);
          }
        }
      }
    });
  }

  const unsubPlayers = gameBus.on<Player[]>('players:sync', (players) => {
    if (diceRolling) {
      // Buffer: apply only after dice animation completes
      pendingPawnSync = players;
      return;
    }
    applyPawnPositions(players);
  });

  const unsubActive = gameBus.on<{ tileIndex: number; playerId?: string }>('active:player', ({ tileIndex, playerId }) => {
    const tile = BOARD_PATH[tileIndex] ?? BOARD_PATH[0];
    activePos.set(tile.x, tile.y, tile.z);
    if (playerId) activePlayerId = playerId;
    if (!diceRolling) {
      cameraController.snapToPlayer(activePos);
    }
  });

  // ─── gameBus — dado ─────────────────────────────────────────────────────────

  const diceZoneVec = new THREE.Vector3(DICE_ZONE.x, DICE_ZONE.y, DICE_ZONE.z);

  const unsubDiceThrow = gameBus.on<{ position: typeof DICE_ZONE }>('dice:throw', ({ position }) => {
    diceRolling = true;
    dicePhysics.throw(position);
    cameraController.panToDice(diceZoneVec);
  });

  const unsubDiceResult = gameBus.on<{ face: number }>('dice:result', ({ face }) => {
    dicePhysics.setResult(face);
  });

  const unsubDiceDone = gameBus.on<{ face: number }>('dice:done', () => {
    diceRolling = false;
    // Pre-compute activePos destination so camera can pan there immediately
    const synced = pendingPawnSync;
    const animId = activePlayerId;
    pendingPawnSync = null;
    if (synced && animId) {
      const active = synced.find((p) => p.id === animId);
      if (active) {
        const tile = BOARD_PATH[active.position] ?? BOARD_PATH[0];
        activePos.set(tile.x, tile.y, tile.z);
      }
    }
    // Smooth camera return (lerp-based, not instant cut)
    cameraController.smoothReturnToPlayer();
    // Delay pawn animation so camera settles before pawn moves
    setTimeout(() => {
      if (synced) applyPawnPositions(synced, animId);
    }, 700);
  });

  // Tile final do tabuleiro — alvo do zoom de vitória
  const finishTile = BOARD_PATH[BOARD_PATH.length - 1];
  const finishPos = new THREE.Vector3(finishTile.x, finishTile.y, finishTile.z);

  const unsubVictory = gameBus.on('camera:victory', () => {
    cameraController.zoomToVictory(finishPos);
  });

  // ─── Board tiles com variação de cor ───────────────────────────────────────

  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
  BOARD_PATH.forEach((tile) => {
    const group = tileGroup(tile.index);
    const [h, s, l] = computeTileHSL(tile.index, group);
    const color = new THREE.Color().setHSL(h, s, l);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.position.set(tile.x, tile.y, tile.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Ground plane
  const groundGeo = new THREE.BoxGeometry(12, 0.2, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(4.5, -0.25, 4);
  ground.receiveShadow = true;
  scene.add(ground);

  // ─── Animation loop ─────────────────────────────────────────────────────────

  const clock = new THREE.Clock();
  let animId: number;

  function animate() {
    animId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    dicePhysics.update(delta);
    pawnManager.update(delta);
    cameraController.update(activePos);
    renderer.render(scene, camera);
  }

  animate();

  // ─── Resize ─────────────────────────────────────────────────────────────────

  function onResize() {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    unsubPlayers();
    unsubActive();
    unsubDiceThrow();
    unsubDiceResult();
    unsubDiceDone();
    unsubVictory();
    dicePhysics.dispose();
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
