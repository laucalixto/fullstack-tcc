import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
  const MockMesh = vi.fn().mockImplementation((geo: unknown, mat: unknown) => ({
    geometry: geo, material: mat,
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    receiveShadow: false, castShadow: false,
  }));
  const MockGroup = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    scale:    { set: vi.fn() },
    rotation: { set: vi.fn() },
    clone:    vi.fn().mockReturnThis(),
    traverse: vi.fn(),
  }));
  return {
    BoxGeometry: vi.fn().mockImplementation((w, h, d) => ({ __w: w, __h: h, __d: d })),
    MeshStandardMaterial: vi.fn().mockImplementation((opts) => ({ __opts: opts })),
    Mesh: MockMesh,
    Group: MockGroup,
  };
});

import { buildGround } from '../../three/builders/groundBuilder';
import { buildDecorations } from '../../three/builders/decorationsBuilder';
import { DEFAULT_THEME } from '../../three/theme/boardTheme';

function makeFakeScene() {
  const added: unknown[] = [];
  return { added, add: (obj: unknown) => { added.push(obj); } } as unknown as import('three').Scene & { added: unknown[] };
}

describe('groundBuilder', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('modo procedural: adiciona 1 mesh ground com BoxGeometry(12, 0.2, 10) — tamanho em metros', async () => {
    const THREE = await import('three');
    const scene = makeFakeScene();
    await buildGround(scene, DEFAULT_THEME, { loadGLTF: vi.fn() });
    expect(scene.added).toHaveLength(1);
    expect(THREE.BoxGeometry).toHaveBeenCalledWith(12, 0.2, 10);
  });

  it('modo glTF: carrega e adiciona o modelo quando theme.ground.url definido', async () => {
    const scene = makeFakeScene();
    const fakeGroup = {
      position: { set: vi.fn() },
      scale:    { set: vi.fn() },
      rotation: { set: vi.fn() },
      clone:    vi.fn().mockReturnThis(),
      traverse: vi.fn(),
    };
    const loadGLTF = vi.fn().mockResolvedValue(fakeGroup);

    await buildGround(
      scene,
      { ...DEFAULT_THEME, ground: { ...DEFAULT_THEME.ground, url: '/models/ground.glb' } },
      { loadGLTF },
    );

    expect(loadGLTF).toHaveBeenCalledWith('/models/ground.glb', 'ground');
    expect(scene.added).toHaveLength(1);
  });
});

describe('decorationsBuilder', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lista vazia: não adiciona nada', async () => {
    const scene = makeFakeScene();
    await buildDecorations(scene, DEFAULT_THEME, { loadGLTF: vi.fn() });
    expect(scene.added).toHaveLength(0);
  });

  it('itera decorações e adiciona um clone para cada', async () => {
    const scene = makeFakeScene();
    const cloneCalls: unknown[] = [];
    const fakeTemplate = {
      clone: vi.fn(() => {
        const c = {
          position: { set: vi.fn() },
          scale:    { set: vi.fn() },
          rotation: { set: vi.fn() },
          traverse: vi.fn(),
        };
        cloneCalls.push(c);
        return c;
      }),
    };
    const loadGLTF = vi.fn().mockResolvedValue(fakeTemplate);

    await buildDecorations(
      scene,
      {
        ...DEFAULT_THEME,
        decorations: [
          { url: '/models/tree.glb', position: [0, 0, 0] },
          { url: '/models/tree.glb', position: [2, 0, 0] }, // mesma URL, template cacheado
          { url: '/models/sign.glb', position: [1, 0, 1], rotation: [0, Math.PI / 2, 0], scale: 0.5 },
        ],
      },
      { loadGLTF },
    );

    expect(scene.added).toHaveLength(3);
    expect(loadGLTF).toHaveBeenCalledTimes(3);
  });

  it('aplica position, rotation e scale das decorações', async () => {
    const scene = makeFakeScene();
    const positionCalls: Array<[number, number, number]> = [];
    const scaleCalls:    Array<[number, number, number]> = [];
    const rotationCalls: Array<[number, number, number]> = [];
    const fakeTemplate = {
      clone: vi.fn(() => ({
        position: { set: vi.fn((x: number, y: number, z: number) => { positionCalls.push([x, y, z]); }) },
        scale:    { set: vi.fn((x: number, y: number, z: number) => { scaleCalls.push([x, y, z]); }) },
        rotation: { set: vi.fn((x: number, y: number, z: number) => { rotationCalls.push([x, y, z]); }) },
        traverse: vi.fn(),
      })),
    };
    const loadGLTF = vi.fn().mockResolvedValue(fakeTemplate);

    await buildDecorations(
      scene,
      {
        ...DEFAULT_THEME,
        decorations: [{ url: '/models/tree.glb', position: [1, 2, 3], rotation: [0, 1, 0], scale: 2 }],
      },
      { loadGLTF },
    );

    expect(positionCalls[0]).toEqual([1, 2, 3]);
    expect(scaleCalls[0]).toEqual([2, 2, 2]);
    expect(rotationCalls[0]).toEqual([0, 1, 0]);
  });
});
