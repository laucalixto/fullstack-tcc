import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RED: AssetManager — cache, preloadAll, validateScale ────────────────────
//
// Singleton que carrega glTF e textures com cache em memória.
// Valida escala 1 unit = 1 metro emitindo warning quando o bbox do modelo
// foge da faixa esperada para a categoria.

// Mock do GLTFLoader — simula carga assíncrona e retorna um Group configurável.
const loadedGroups = new Map<string, { sizeX: number; sizeY: number; sizeZ: number }>();

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  class GLTFLoader {
    load(
      url: string,
      onLoad: (gltf: { scene: unknown }) => void,
      _onProgress?: unknown,
      _onError?: (err: unknown) => void,
    ) {
      const size = loadedGroups.get(url) ?? { sizeX: 1, sizeY: 0.3, sizeZ: 1 };
      // Simula THREE.Group com um único mesh cujo bbox temos como base.
      const fakeGroup = {
        __size: size,
        clone: vi.fn(),
        traverse: vi.fn(),
      };
      // async callback para simular fetch real
      setTimeout(() => onLoad({ scene: fakeGroup }), 0);
    }
  }
  return { GLTFLoader };
});

// Mock do THREE mínimo — Box3.setFromObject usa __size do fake group.
vi.mock('three', () => {
  class Box3 {
    min = { x: 0, y: 0, z: 0 };
    max = { x: 0, y: 0, z: 0 };
    setFromObject(obj: { __size: { sizeX: number; sizeY: number; sizeZ: number } }) {
      this.max = { x: obj.__size.sizeX, y: obj.__size.sizeY, z: obj.__size.sizeZ };
      return this;
    }
    getSize(target: { x: number; y: number; z: number }) {
      target.x = this.max.x - this.min.x;
      target.y = this.max.y - this.min.y;
      target.z = this.max.z - this.min.z;
      return target;
    }
  }
  class Vector3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  }
  class TextureLoader {
    load(_url: string, onLoad: (t: unknown) => void) {
      setTimeout(() => onLoad({ __fakeTexture: true }), 0);
    }
  }
  class CanvasTexture {
    constructor(public canvas: unknown) {}
  }
  return { Box3, Vector3, TextureLoader, CanvasTexture };
});

import { AssetManager } from '../../three/assets/AssetManager';

describe('AssetManager', () => {
  let mgr: AssetManager;

  beforeEach(() => {
    mgr = new AssetManager();
    loadedGroups.clear();
  });

  it('loadGLTF retorna o Group carregado', async () => {
    loadedGroups.set('/models/tile.glb', { sizeX: 1, sizeY: 0.3, sizeZ: 1 });
    const group = await mgr.loadGLTF('/models/tile.glb', 'tile');
    expect(group).toBeDefined();
  });

  it('loadGLTF cacheia por URL — segunda chamada não instancia loader de novo', async () => {
    loadedGroups.set('/models/tile.glb', { sizeX: 1, sizeY: 0.3, sizeZ: 1 });
    const a = await mgr.loadGLTF('/models/tile.glb', 'tile');
    const b = await mgr.loadGLTF('/models/tile.glb', 'tile');
    expect(a).toBe(b);
  });

  it('loadTexture cacheia por URL', async () => {
    const a = await mgr.loadTexture('/textures/wood.png');
    const b = await mgr.loadTexture('/textures/wood.png');
    expect(a).toBe(b);
  });

  it('loadTexture aceita .png e .jpg via TextureLoader', async () => {
    const a = await mgr.loadTexture('/textures/foo.jpg');
    const b = await mgr.loadTexture('/textures/foo.jpeg');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it('loadTexture aceita .svg via fetch + canvas (CanvasTexture)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="red"/></svg>'),
    } as unknown as Response);

    // jsdom Image: define onload sincronicamente quando src é setado
    const origImage = globalThis.Image;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      width = 64;
      height = 64;
      private _src = '';
      set src(value: string) { this._src = value; setTimeout(() => this.onload?.(), 0); }
      get src() { return this._src; }
    }
    (globalThis as unknown as { Image: typeof origImage }).Image = FakeImage as unknown as typeof origImage;
    // jsdom: createObjectURL/revokeObjectURL stubs
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:fake';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => undefined;

    try {
      const tex = await mgr.loadTexture('/textures/icon.svg');
      expect(tex).toBeDefined();
      // SVG passa pelo fetch (não pelo TextureLoader): garante o caminho específico.
      expect(fetchSpy).toHaveBeenCalledWith('/textures/icon.svg');
    } finally {
      (globalThis as unknown as { Image: typeof origImage }).Image = origImage;
      fetchSpy.mockRestore();
    }
  });

  it('loadTexture com .png NÃO chama fetch (vai pelo TextureLoader)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      await mgr.loadTexture('/textures/raster.png');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('preloadAll resolve com array vazio (no-op)', async () => {
    await expect(mgr.preloadAll([])).resolves.toBeUndefined();
  });

  it('preloadAll carrega múltiplos assets em paralelo', async () => {
    loadedGroups.set('/models/tile.glb', { sizeX: 1, sizeY: 0.3, sizeZ: 1 });
    loadedGroups.set('/models/pawn.glb', { sizeX: 0.4, sizeY: 0.7, sizeZ: 0.4 });
    await mgr.preloadAll(['/models/tile.glb', '/models/pawn.glb']);
    // Ambos devem estar no cache
    const a = await mgr.loadGLTF('/models/tile.glb', 'tile');
    const b = await mgr.loadGLTF('/models/pawn.glb', 'pawn');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it('validateScale não emite warning para tile dentro da faixa (0.5–2m)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/tile.glb', { sizeX: 1, sizeY: 0.3, sizeZ: 1 });
    await mgr.loadGLTF('/models/tile.glb', 'tile');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('validateScale emite warning para tile fora da faixa (10m)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/huge-tile.glb', { sizeX: 10, sizeY: 0.3, sizeZ: 10 });
    await mgr.loadGLTF('/models/huge-tile.glb', 'tile');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('validateScale emite warning para peão fora da faixa (5m)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/giant-pawn.glb', { sizeX: 2, sizeY: 5, sizeZ: 2 });
    await mgr.loadGLTF('/models/giant-pawn.glb', 'pawn');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('validateScale aceita peão pequeno (0.25m) — faixa relaxada para 0.1–2.5m', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/small-pawn.glb', { sizeX: 0.15, sizeY: 0.25, sizeZ: 0.15 });
    await mgr.loadGLTF('/models/small-pawn.glb', 'pawn');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('validateScale ainda emite warning para peão muito pequeno (0.05m, abaixo de 0.1m)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/tiny-pawn.glb', { sizeX: 0.05, sizeY: 0.05, sizeZ: 0.05 });
    await mgr.loadGLTF('/models/tiny-pawn.glb', 'pawn');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('validateScale pula verificação quando category é "unknown"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    loadedGroups.set('/models/whatever.glb', { sizeX: 100, sizeY: 100, sizeZ: 100 });
    await mgr.loadGLTF('/models/whatever.glb', 'unknown');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('dispose limpa os caches', async () => {
    loadedGroups.set('/models/tile.glb', { sizeX: 1, sizeY: 0.3, sizeZ: 1 });
    await mgr.loadGLTF('/models/tile.glb', 'tile');
    mgr.dispose();
    // Após dispose, carregar novamente deve produzir nova instância
    loadedGroups.set('/models/tile.glb', { sizeX: 1.1, sizeY: 0.3, sizeZ: 1 });
    const after = await mgr.loadGLTF('/models/tile.glb', 'tile');
    expect(after).toBeDefined();
  });
});
