import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { BoardTheme, ToneMapping } from '../theme/boardTheme';

export interface LightingRefs {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  fog: THREE.Fog;
}

const TONE_MAPPING_MAP: Record<ToneMapping, THREE.ToneMapping> = {
  none:     THREE.NoToneMapping,
  linear:   THREE.LinearToneMapping,
  aces:     THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon:   THREE.CineonToneMapping,
};

/**
 * Aplica iluminação, fog, background e tone mapping/environment.
 * Retorna refs para tuning em realtime (usado pelo /preview GUI).
 */
export function setupLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  theme: BoardTheme,
): LightingRefs {
  // ── Color space + tone mapping ──────────────────────────────────────────
  // sRGB output garante cores corretas; ACES dá visual cinematográfico.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const toneKey = theme.lighting.toneMapping ?? 'aces';
  renderer.toneMapping = TONE_MAPPING_MAP[toneKey] ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = theme.lighting.toneMappingExposure ?? 1.0;

  // ── Background + fog ────────────────────────────────────────────────────
  scene.background = new THREE.Color(theme.background.color);
  const fog = new THREE.Fog(theme.background.fog.color, theme.background.fog.near, theme.background.fog.far);
  scene.fog = fog;

  // ── Luzes diretas ───────────────────────────────────────────────────────
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

  // ── Environment map (PBR reflections) ───────────────────────────────────
  applyEnvironment(renderer, scene, theme);

  return { ambient, sun, fog };
}

function applyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, theme: BoardTheme): void {
  const env = theme.lighting.environment;
  if (!env || env.type === 'none') return;

  if (env.type === 'room') {
    // RoomEnvironment built-in: zero arquivos, leve, melhora muito materiais PBR.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envTex = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTex;
    if (env.intensity !== undefined && 'environmentIntensity' in scene) {
      // r163+ — fallback silencioso se não suportado.
      (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = env.intensity;
    }
    pmrem.dispose();
    return;
  }

  if (env.type === 'hdr' && env.url) {
    // RGBELoader é assíncrono — aplica quando concluído.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(env.url, (hdr) => {
      const envTex = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = envTex;
      if (env.intensity !== undefined && 'environmentIntensity' in scene) {
        (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = env.intensity;
      }
      hdr.dispose();
      pmrem.dispose();
    });
  }
}
