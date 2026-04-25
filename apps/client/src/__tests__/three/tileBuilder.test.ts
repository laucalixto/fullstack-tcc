import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks Three.js sem WebGL
vi.mock('three', () => {
  const MockMesh = vi.fn().mockImplementation((geo, mat) => ({
    geometry: geo, material: mat,
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    castShadow: false, receiveShadow: false, __type: 'mesh',
  }));
  return {
    BoxGeometry: vi.fn().mockImplementation((w, h, d) => ({ __w: w, __h: h, __d: d })),
    PlaneGeometry: vi.fn().mockImplementation((w, h) => ({ __pw: w, __ph: h, __type: 'plane' })),
    MeshStandardMaterial: vi.fn().mockImplementation((opts) => ({ __opts: opts, color: opts?.color, map: opts?.map })),
    MeshBasicMaterial: vi.fn().mockImplementation((opts) => ({ __opts: opts, map: opts?.map, transparent: opts?.transparent })),
    Color: vi.fn().mockImplementation(() => ({ setHSL: vi.fn().mockReturnThis() })),
    Mesh: MockMesh,
    Group: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      scale:    { set: vi.fn() },
      rotation: { set: vi.fn() },
      clone:    vi.fn().mockReturnThis(),
      traverse: vi.fn(),
      __type: 'group',
    })),
  };
});

import { buildTiles } from '../../three/builders/tileBuilder';
import { DEFAULT_THEME, type BoardTheme } from '../../three/theme/boardTheme';
import { BOARD_PATH } from '@safety-board/shared';

function makeFakeScene() {
  const added: unknown[] = [];
  return {
    added,
    add: (obj: unknown) => { added.push(obj); },
  } as unknown as import('three').Scene & { added: unknown[] };
}

describe('tileBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('modo procedural: adiciona 1 Mesh por tile do BOARD_PATH (40 tiles)', () => {
    const scene = makeFakeScene();
    buildTiles(scene, DEFAULT_THEME, { loadGLTF: vi.fn() });
    expect(scene.added).toHaveLength(BOARD_PATH.length);
  });

  it('modo procedural: meshes usam BoxGeometry(1, 0.3, 1) — escala 1:1', async () => {
    const THREE = await import('three');
    const scene = makeFakeScene();
    buildTiles(scene, DEFAULT_THEME, { loadGLTF: vi.fn() });
    expect(THREE.BoxGeometry).toHaveBeenCalledWith(1, 0.3, 1);
  });

  it('modo glTF: carrega modelo do theme.tile.url e clona para cada tile', async () => {
    const scene = makeFakeScene();
    const clonedGroups: unknown[] = [];
    type FakeClone = {
      position: { set: ReturnType<typeof vi.fn> };
      scale:    { set: ReturnType<typeof vi.fn> };
      rotation: { set: ReturnType<typeof vi.fn> };
      traverse: ReturnType<typeof vi.fn>;
    };
    const cloneImpl = (): FakeClone => {
      const g: FakeClone = {
        position: { set: vi.fn() },
        scale:    { set: vi.fn() },
        rotation: { set: vi.fn() },
        traverse: vi.fn(),
      };
      clonedGroups.push(g);
      return g;
    };
    const fakeTemplate = { clone: vi.fn(cloneImpl) };
    const loadGLTF = vi.fn().mockResolvedValue(fakeTemplate);

    await buildTiles(
      scene,
      { ...DEFAULT_THEME, tile: { ...DEFAULT_THEME.tile, url: '/models/tile.glb' } },
      { loadGLTF } as unknown as Parameters<typeof buildTiles>[2],
    );

    expect(loadGLTF).toHaveBeenCalledWith('/models/tile.glb', 'tile');
    expect(clonedGroups).toHaveLength(BOARD_PATH.length);
    expect(scene.added).toHaveLength(BOARD_PATH.length);
  });

  it('modo glTF: aplica theme.tile.scale em cada clone', async () => {
    const scene = makeFakeScene();
    const scaleCalls: unknown[] = [];
    const fakeTemplate = {
      clone: vi.fn(() => ({
        position: { set: vi.fn() },
        scale:    { set: vi.fn((x: number, y: number, z: number) => { scaleCalls.push([x, y, z]); }) },
        rotation: { set: vi.fn() },
        traverse: vi.fn(),
      })),
    };
    const loadGLTF = vi.fn().mockResolvedValue(fakeTemplate);

    await buildTiles(
      scene,
      { ...DEFAULT_THEME, tile: { ...DEFAULT_THEME.tile, url: '/models/tile.glb', scale: 1.5 } },
      { loadGLTF } as unknown as Parameters<typeof buildTiles>[2],
    );

    expect((scaleCalls as Array<[number, number, number]>).every(([x, y, z]) => x === 1.5 && y === 1.5 && z === 1.5)).toBe(true);
  });

  // ─── Atlas (opção A: 40 ícones únicos) ────────────────────────────────────

  it('atlas configurado: adiciona um topper plane sobre cada tile (80 objetos no total)', async () => {
    const makeTex = () => ({ repeat: { set: vi.fn() }, offset: { set: vi.fn() }, clone: vi.fn() });
    const fakeTexture: ReturnType<typeof makeTex> = makeTex();
    fakeTexture.clone.mockImplementation(makeTex);
    const loadTexture = vi.fn().mockResolvedValue(fakeTexture);
    const scene = makeFakeScene();
    const themeWithAtlas: BoardTheme = {
      ...DEFAULT_THEME,
      tile: {
        ...DEFAULT_THEME.tile,
        atlas: { url: '/textures/tile-atlas.png', columns: 8, rows: 5 },
      },
    };
    await buildTiles(scene, themeWithAtlas, { loadGLTF: vi.fn(), loadTexture });
    // 40 tiles base + 40 toppers = 80 adds
    expect(scene.added).toHaveLength(80);
    expect(loadTexture).toHaveBeenCalledWith('/textures/tile-atlas.png');
  });

  it('atlas: cada topper recebe um clone da textura com offset/repeat distintos', async () => {
    // Para testar UVs distintos, o builder precisa CLONAR a textura por tile.
    // Usamos um spy sobre clone() do template retornado.
    type FakeTex = { repeat: { set: ReturnType<typeof vi.fn> }; offset: { set: ReturnType<typeof vi.fn> }; clone: ReturnType<typeof vi.fn> };
    const cloneSpies: FakeTex[] = [];
    const cloneImpl = (): FakeTex => {
      const t: FakeTex = {
        repeat: { set: vi.fn() },
        offset: { set: vi.fn() },
        clone:  vi.fn(),
      };
      cloneSpies.push(t);
      return t;
    };
    const fakeTexture = {
      repeat: { set: vi.fn() },
      offset: { set: vi.fn() },
      clone: vi.fn(cloneImpl),
    };
    const loadTexture = vi.fn().mockResolvedValue(fakeTexture);
    const scene = makeFakeScene();
    await buildTiles(
      scene,
      { ...DEFAULT_THEME, tile: { ...DEFAULT_THEME.tile, atlas: { url: '/atlas.png', columns: 8, rows: 5 } } },
      { loadGLTF: vi.fn(), loadTexture },
    );

    // 1 clone por tile — 40 clones esperados.
    expect(cloneSpies).toHaveLength(BOARD_PATH.length);

    // Tile 0 (linha 0, col 0): offset (0/8, 1 - 1/5 - 0/5) — origem topo-esquerda do atlas (Y é invertido em UV).
    const c0 = cloneSpies[0];
    expect(c0.repeat.set).toHaveBeenCalledWith(1 / 8, 1 / 5);
    expect(c0.offset.set).toHaveBeenCalledWith(0, 1 - 1 / 5);

    // Tile 9 (linha 1, col 1)
    const c9 = cloneSpies[9];
    expect(c9.offset.set).toHaveBeenCalledWith(1 / 8, 1 - 2 / 5);
  });

  // ─── Cascata urlByIndex / urlByCategory / url ─────────────────────────────

  it('cascata: urlByIndex tem precedência sobre urlByCategory e url', async () => {
    const scene = makeFakeScene();
    const calls: string[] = [];
    const fakeTemplate = {
      clone: vi.fn(() => ({
        position: { set: vi.fn() }, scale: { set: vi.fn() }, rotation: { set: vi.fn() }, traverse: vi.fn(),
      })),
    };
    const loadGLTF = vi.fn(async (url: string) => {
      calls.push(url);
      return fakeTemplate;
    });
    await buildTiles(
      scene,
      {
        ...DEFAULT_THEME,
        tile: {
          ...DEFAULT_THEME.tile,
          url: '/models/tile-default.glb',
          urlByCategory: { quiz: '/models/quiz.glb' },
          urlByIndex: { 5: '/models/tile-5-special.glb' }, // 5 também é quiz
        },
      },
      { loadGLTF } as unknown as Parameters<typeof buildTiles>[2],
    );
    // 5 deve usar urlByIndex (mais específico)
    expect(calls).toContain('/models/tile-5-special.glb');
  });

  it('cascata: urlByCategory aplicado aos tiles que matcheiam (sem urlByIndex)', async () => {
    const scene = makeFakeScene();
    const calls: string[] = [];
    const fakeTemplate = {
      clone: vi.fn(() => ({
        position: { set: vi.fn() }, scale: { set: vi.fn() }, rotation: { set: vi.fn() }, traverse: vi.fn(),
      })),
    };
    const loadGLTF = vi.fn(async (url: string) => {
      calls.push(url);
      return fakeTemplate;
    });
    await buildTiles(
      scene,
      {
        ...DEFAULT_THEME,
        tile: {
          ...DEFAULT_THEME.tile,
          urlByCategory: { start: '/models/start.glb', finish: '/models/finish.glb' },
        },
      },
      { loadGLTF } as unknown as Parameters<typeof buildTiles>[2],
    );
    expect(calls).toContain('/models/start.glb');
    expect(calls).toContain('/models/finish.glb');
  });

  it('cascata: cai em procedural se nenhuma URL matchear', async () => {
    const THREE = await import('three');
    const scene = makeFakeScene();
    await buildTiles(
      scene,
      { ...DEFAULT_THEME, tile: { ...DEFAULT_THEME.tile, urlByCategory: { quiz: '/q.glb' } } },
      {
        loadGLTF: vi.fn(async () => ({
          clone: vi.fn(() => ({ position: { set: vi.fn() }, scale: { set: vi.fn() }, rotation: { set: vi.fn() }, traverse: vi.fn() })),
        })),
      } as unknown as Parameters<typeof buildTiles>[2],
    );
    // Tiles não-quiz devem ser BoxGeometry procedural — verifica que BoxGeometry foi chamada.
    expect(THREE.BoxGeometry).toHaveBeenCalled();
  });

  // ─── Layout customizado (Opção B) ─────────────────────────────────────────

  it('usa coordenadas do theme.boardLayout quando definido', async () => {
    const scene = makeFakeScene();
    const positionCalls: Array<[number, number, number]> = [];
    // O mock de Mesh substitui position com objeto que captura set()
    const THREE = await import('three');
    vi.mocked(THREE.Mesh).mockImplementation((geo: unknown, mat: unknown) => ({
      geometry: geo, material: mat,
      position: { set: vi.fn((x: number, y: number, z: number) => { positionCalls.push([x, y, z]); }), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
      castShadow: false, receiveShadow: false,
    }) as unknown as import('three').Mesh);

    const customLayout = Array.from({ length: 40 }, (_, i) => ({ index: i, x: 100 + i, y: 50, z: 200 }));
    await buildTiles(
      scene,
      { ...DEFAULT_THEME, boardLayout: customLayout, tile: { ...DEFAULT_THEME.tile, atlas: undefined } },
      { loadGLTF: vi.fn(), loadTexture: vi.fn() },
    );
    // Cada tile foi posicionado nas coords do customLayout
    expect(positionCalls[0]).toEqual([100, 50, 200]);
    expect(positionCalls[39]).toEqual([139, 50, 200]);
  });
});
