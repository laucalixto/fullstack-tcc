import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks Three.js sem WebGL
vi.mock('three', () => {
  const MockMesh = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    castShadow: false, receiveShadow: false, __type: 'mesh',
  }));
  return {
    BoxGeometry: vi.fn().mockImplementation((w, h, d) => ({ __w: w, __h: h, __d: d })),
    MeshStandardMaterial: vi.fn().mockImplementation((opts) => ({ __opts: opts, color: opts?.color })),
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
import { DEFAULT_THEME } from '../../three/theme/boardTheme';
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
      { loadGLTF },
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
      { loadGLTF },
    );

    expect((scaleCalls as Array<[number, number, number]>).every(([x, y, z]) => x === 1.5 && y === 1.5 && z === 1.5)).toBe(true);
  });
});
