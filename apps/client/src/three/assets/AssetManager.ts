import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AssetCategory = 'tile' | 'pawn' | 'ground' | 'decoration' | 'unknown';

// Faixas esperadas (maior eixo do bounding box, em metros) — convenção 1 unit = 1m.
// Fora da faixa: warning no console para o dev reexportar do Blender.
const SCALE_RANGES: Record<AssetCategory, [number, number] | null> = {
  tile:       [0.5, 2],
  pawn:       [0.3, 2.5],
  ground:     [5, 50],
  decoration: [0.1, 10],
  unknown:    null,
};

export class AssetManager {
  private gltfCache    = new Map<string, THREE.Group>();
  private textureCache = new Map<string, THREE.Texture>();
  private gltfLoader:    GLTFLoader | null = null;
  private textureLoader: THREE.TextureLoader | null = null;

  async loadGLTF(url: string, category: AssetCategory = 'unknown'): Promise<THREE.Group> {
    const cached = this.gltfCache.get(url);
    if (cached) return cached;

    if (!this.gltfLoader) this.gltfLoader = new GLTFLoader();
    const loader = this.gltfLoader;

    const group = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene as unknown as THREE.Group),
        undefined,
        (err) => reject(err),
      );
    });

    this.validateScale(group, category, url);
    this.gltfCache.set(url, group);
    return group;
  }

  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(url);
    if (cached) return cached;

    if (!this.textureLoader) this.textureLoader = new THREE.TextureLoader();
    const loader = this.textureLoader;

    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, (t) => resolve(t), undefined, (err) => reject(err));
    });
    this.textureCache.set(url, tex);
    return tex;
  }

  async preloadAll(urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    await Promise.all(
      urls.map((url) => {
        if (url.endsWith('.glb') || url.endsWith('.gltf')) {
          return this.loadGLTF(url);
        }
        return this.loadTexture(url);
      }),
    );
  }

  dispose(): void {
    this.gltfCache.clear();
    this.textureCache.clear();
    this.gltfLoader = null;
    this.textureLoader = null;
  }

  // Valida escala 1:1 — só emite warning, não corrige.
  // Ajuste em Blender antes de reexportar se disparar.
  private validateScale(group: THREE.Group, category: AssetCategory, url: string): void {
    const range = SCALE_RANGES[category];
    if (!range) return;
    const box  = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z);
    const [min, max] = range;
    if (largest < min || largest > max) {
      console.warn(
        `[AssetManager] ${url} (${category}) tem eixo maior = ${largest.toFixed(2)}m, `
          + `fora da faixa esperada ${min}–${max}m. Verifique a escala no Blender (1 unit = 1 metro).`,
      );
    }
  }
}

export const assetManager = new AssetManager();
