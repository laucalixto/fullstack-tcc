import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraController } from '../camera';
import { PawnManager } from '../PawnManager';
import { DicePhysics } from '../dice/DicePhysics';
import { buildTiles } from '../builders/tileBuilder';
import { buildGround } from '../builders/groundBuilder';
import { buildDecorations } from '../builders/decorationsBuilder';
import { setupLighting } from './lighting';
import { startAnimationLoop } from './animationLoop';
import { bindGameEvents } from './eventBindings';
import { DEFAULT_THEME, resolveLayout } from '../theme/boardTheme';
import type { BoardTheme } from '../theme/boardTheme';
import { assetManager } from '../assets/AssetManager';

/**
 * Monta a cena Three.js completa e retorna cleanup. Substitui o antigo
 * monolito scene.ts. O tema controla quais builders usam glTF vs procedural.
 */
export function createScene(container: HTMLDivElement, theme: BoardTheme = DEFAULT_THEME): () => void {
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

  // Lighting + background + fog + tone mapping + environment (lê do tema)
  const lightRefs = setupLighting(renderer, scene, theme);

  // Camera
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 4;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2;
  const cameraController = new CameraController(camera, controls);
  cameraController.snapToOverview();

  // Exposição em dev — usado por BoardPreview/lil-gui
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__previewCamera__   = camera;
    (window as unknown as Record<string, unknown>).__previewControls__ = controls;
    (window as unknown as Record<string, unknown>).__previewScene__    = scene;
    (window as unknown as Record<string, unknown>).__previewTheme__    = theme;
  }

  // Pawns
  const pawnManager = new PawnManager(scene, theme, assetManager);

  // Tiles, chão, decorações — tile/ground/decoração podem ser assíncronos (glTF)
  // Não aguardamos aqui: preload centralizado é feito antes, em GameLoadingPage.
  const tilesRefHolder: { tiles: THREE.Object3D[] } = { tiles: [] };
  buildTiles(scene, theme, assetManager).then((ts) => { tilesRefHolder.tiles = ts; });
  buildGround(scene, theme, assetManager);
  buildDecorations(scene, theme, assetManager);

  // Handles em dev: permitem ao /preview GUI aplicar tuning em realtime.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__previewHandles__ = {
      setTileScale(s: number) {
        for (const t of tilesRefHolder.tiles) t.scale.set(s, s, s);
      },
      setAmbientIntensity(v: number) { lightRefs.ambient.intensity = v; },
      setSunIntensity(v: number)     { lightRefs.sun.intensity = v; },
      setFogNear(v: number) { lightRefs.fog.near = v; },
      setFogFar(v: number)  { lightRefs.fog.far = v; },
      setPawnScale(s: number) { pawnManager.setGlobalScale(s); },
      setToneMappingExposure(v: number) { renderer.toneMappingExposure = v; },
      setToneMapping(name: 'none' | 'linear' | 'aces' | 'reinhard' | 'cineon') {
        const map: Record<string, THREE.ToneMapping> = {
          none:     THREE.NoToneMapping,
          linear:   THREE.LinearToneMapping,
          aces:     THREE.ACESFilmicToneMapping,
          reinhard: THREE.ReinhardToneMapping,
          cineon:   THREE.CineonToneMapping,
        };
        renderer.toneMapping = map[name] ?? THREE.ACESFilmicToneMapping;
        // Materiais usando shader-based tone mapping precisam do flag para recompilar.
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => { (m as THREE.Material).needsUpdate = true; });
          else if (mat) (mat as THREE.Material).needsUpdate = true;
        });
      },
    };
  }

  // Dado
  const dicePhysics = new DicePhysics(scene, theme, assetManager);

  // Event bindings (gameBus) — usa layout efetivo (custom do tema ou default).
  const layout = resolveLayout(theme);
  const activePos = new THREE.Vector3(layout[0].x, layout[0].y, layout[0].z);
  const unbindEvents = bindGameEvents({
    pawnManager,
    dicePhysics,
    layout,
    cameraController,
    activePos,
    onDiceRollingChange: () => undefined, // reservado para expansão futura
  });

  // Animation loop
  const stopLoop = startAnimationLoop((delta) => {
    dicePhysics.update(delta);
    pawnManager.update(delta);
    cameraController.update(activePos);
    renderer.render(scene, camera);
  });

  // Resize
  function onResize() {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return () => {
    stopLoop();
    if (import.meta.env.DEV) {
      delete (window as unknown as Record<string, unknown>).__previewCamera__;
      delete (window as unknown as Record<string, unknown>).__previewControls__;
      delete (window as unknown as Record<string, unknown>).__previewScene__;
      delete (window as unknown as Record<string, unknown>).__previewTheme__;
      delete (window as unknown as Record<string, unknown>).__previewHandles__;
    }
    window.removeEventListener('resize', onResize);
    unbindEvents();
    dicePhysics.dispose();
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}

// Mantém o export antigo para compatibilidade com testes/ThreeCanvas
// que ainda referenciam `initThreeScene`.
export const initThreeScene = createScene;
