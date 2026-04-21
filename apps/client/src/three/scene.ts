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
  // Posição inicial configurada pelo CameraController.snapToOverview() abaixo

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
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2;

  const cameraController = new CameraController(camera, controls);
  cameraController.snapToOverview();

  // Expõe câmera e controls para o BoardPreview GUI (apenas em dev)
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__previewCamera__ = camera;
    (window as unknown as Record<string, unknown>).__previewControls__ = controls;
  }

  // PawnManager
  const pawnManager = new PawnManager(scene);
  const knownPlayers  = new Set<string>();
  // Última posição conhecida de cada jogador — para calcular from/to da animação
  const pawnPositions = new Map<string, number>();

  const activePos = new THREE.Vector3(BOARD_PATH[0].x, BOARD_PATH[0].y, BOARD_PATH[0].z);

  let diceRolling = false;
  let localDiceActive = false; // true apenas quando ESTE cliente rolou o dado
  let pendingPawnSync: Player[] | null = null;

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

  const unsubActive = gameBus.on<{ tileIndex: number; playerId?: string }>('active:player', ({ tileIndex }) => {
    const tile = BOARD_PATH[tileIndex] ?? BOARD_PATH[0];
    activePos.set(tile.x, tile.y, tile.z);
    // Não sobrescreve câmera enquanto overview mode está ativo ou dado rolando
    if (!diceRolling && !cameraController.overviewMode) {
      cameraController.snapToPlayer(activePos);
    }
  });

  // ─── gameBus — dado ─────────────────────────────────────────────────────────

  const diceZoneVec = new THREE.Vector3(DICE_ZONE.x, DICE_ZONE.y, DICE_ZONE.z);

  const unsubDiceThrow = gameBus.on<{ position: typeof DICE_ZONE }>('dice:throw', ({ position }) => {
    diceRolling = true;
    localDiceActive = true;
    cameraController.disableOverviewMode();
    dicePhysics.throw(position);
    cameraController.panToDice(diceZoneVec);
  });

  // Todos os clientes veem o dado: dice:rollStart dispara throw() nos não-roladores
  // → dice:done dispara em todos ao término (~2s), sincronizando animação dos peões
  // Câmera NÃO é forçada: jogador não-ativo pode movimentar livremente e ver o dado se quiser
  const unsubRollStart = gameBus.on('dice:rollStart', () => {
    if (localDiceActive) return; // rolador já iniciou via dice:throw
    diceRolling = true;
    dicePhysics.throw(DICE_ZONE);
  });

  // dice:rollEnd ignorado — dice:done (via DicePhysics) sincroniza todos os clientes
  const unsubRollEnd = gameBus.on('dice:rollEnd', () => {
    if (localDiceActive) return; // rolador local: aguarda dice:done
    // não-roladores: animação local iniciada em dice:rollStart; dice:done cuida do buffer
  });

  const unsubDiceResult = gameBus.on<{ face: number }>('dice:result', ({ face }) => {
    dicePhysics.setResult(face);
  });

  const unsubDiceDone = gameBus.on<{ face: number }>('dice:done', () => {
    diceRolling = false;
    localDiceActive = false;
    const synced = pendingPawnSync;
    pendingPawnSync = null;
    // Detecta quem moveu comparando posições conhecidas com o buffer
    const movedPlayer = synced?.find((p) => {
      const oldPos = pawnPositions.get(p.id);
      return oldPos !== undefined && oldPos !== p.position;
    });
    // Pré-computa activePos para destino correto antes de iniciar lerp da câmera
    if (movedPlayer) {
      const tile = BOARD_PATH[movedPlayer.position] ?? BOARD_PATH[0];
      activePos.set(tile.x, tile.y, tile.z);
    }
    cameraController.smoothReturnToPlayer();
    if (!synced) return;
    setTimeout(() => {
      applyPawnPositions(synced, movedPlayer?.id ?? null);
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
  const MAX_DELTA = 0.1; // caps accumulated time when tab loses focus
  let animId: number;

  function animate() {
    animId = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), MAX_DELTA);
    dicePhysics.update(delta);
    pawnManager.update(delta);
    cameraController.update(activePos);
    renderer.render(scene, camera);
  }

  animate();

  // Consume accumulated clock delta when tab regains focus to prevent animation jump
  function onVisibilityChange() {
    if (!document.hidden) clock.getDelta();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

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
    if (import.meta.env.DEV) {
      delete (window as unknown as Record<string, unknown>).__previewCamera__;
      delete (window as unknown as Record<string, unknown>).__previewControls__;
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', onResize);
    unsubPlayers();
    unsubActive();
    unsubDiceThrow();
    unsubRollStart();
    unsubRollEnd();
    unsubDiceResult();
    unsubDiceDone();
    unsubVictory();
    dicePhysics.dispose();
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
