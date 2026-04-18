import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── vi.hoisted: variáveis disponíveis antes das factories dos mocks ──────────
const pawnMock = vi.hoisted(() => ({
  addPawn: vi.fn(),
  movePawn: vi.fn(),
  removePawn: vi.fn(),
}));

// ─── Mocks Three.js (sem WebGL) ──────────────────────────────────────────────
vi.mock('three', () => {
  const Vec3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockImplementation(function (this: Record<string, number>, nx: number, ny: number, nz: number) {
      this.x = nx; this.y = ny; this.z = nz;
    }),
    clone: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    lerp: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
  }));

  const MockRenderer = vi.fn().mockImplementation(() => ({
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    shadowMap: { enabled: false, type: null },
    domElement: document.createElement('canvas'),
    render: vi.fn(),
    dispose: vi.fn(),
  }));

  const MockScene = vi.fn().mockImplementation(() => ({
    background: null, fog: null, add: vi.fn(), remove: vi.fn(),
  }));

  const MockCamera = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), lerp: vi.fn(), copy: vi.fn() },
    lookAt: vi.fn(), aspect: 1, updateProjectionMatrix: vi.fn(),
  }));

  const MockLight = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() }, castShadow: false,
    shadow: { mapSize: { setScalar: vi.fn() }, camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 } },
  }));

  return {
    WebGLRenderer: MockRenderer,
    Scene: MockScene,
    Color: vi.fn(),
    Fog: vi.fn(),
    PerspectiveCamera: MockCamera,
    AmbientLight: MockLight,
    DirectionalLight: MockLight,
    BoxGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() }, castShadow: false, receiveShadow: false })),
    Vector3: Vec3,
    Clock: vi.fn().mockImplementation(() => ({ getDelta: vi.fn().mockReturnValue(0) })),
    PCFSoftShadowMap: 1,
    PCFShadowMap: 2,
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false, dampingFactor: 0, minDistance: 0, maxDistance: 0, maxPolarAngle: 0,
    addEventListener: vi.fn(), update: vi.fn(), dispose: vi.fn(),
    target: { lerp: vi.fn(), copy: vi.fn() },
  })),
}));

vi.mock('../../three/camera', () => ({
  CameraController: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    snapToPlayer: vi.fn(),
  })),
}));

vi.mock('../../three/PawnManager', () => ({
  PawnManager: vi.fn(() => pawnMock), // retorna sempre o mesmo objeto de espião
}));

// ─── Imports após mocks ───────────────────────────────────────────────────────
import { initThreeScene } from '../../three/scene';
import { gameBus } from '../../three/EventBus';
import type { Player } from '@safety-board/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makePlayer = (id: string, position = 0): Player => ({
  id, name: id, position, score: 0, isConnected: true,
});

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('scene — gameBus → PawnManager', () => {
  let container: HTMLDivElement;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth',  { get: () => 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
    cleanup = initThreeScene(container);
  });

  afterEach(() => {
    try { cleanup(); } catch { /* já limpo em algum teste */ }
  });

  it('players:sync adiciona peão para novo jogador', () => {
    gameBus.emit('players:sync', [makePlayer('p1')]);
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p1', 0);
  });

  it('players:sync move peão imediatamente ao adicionar', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 3)]);
    expect(pawnMock.movePawn).toHaveBeenCalledWith('p1', 3);
  });

  it('players:sync não duplica addPawn para mesmo jogador em emissões consecutivas', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);
    expect(pawnMock.addPawn).toHaveBeenCalledTimes(1);
  });

  it('players:sync move peão quando jogador já é conhecido', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    gameBus.emit('players:sync', [makePlayer('p1', 8)]);
    expect(pawnMock.movePawn).toHaveBeenLastCalledWith('p1', 8);
  });

  it('players:sync com múltiplos jogadores adiciona todos com colorIndex correto', () => {
    gameBus.emit('players:sync', [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]);
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p1', 0);
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p2', 1);
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p3', 2);
  });

  it('cleanup remove subscription: players:sync não afeta PawnManager após cleanup', () => {
    cleanup();
    pawnMock.addPawn.mockClear();
    gameBus.emit('players:sync', [makePlayer('p_new')]);
    expect(pawnMock.addPawn).not.toHaveBeenCalled();
  });
});
