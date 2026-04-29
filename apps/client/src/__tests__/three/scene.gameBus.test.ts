import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── vi.hoisted: variáveis disponíveis antes das factories dos mocks ──────────
const pawnMock = vi.hoisted(() => ({
  addPawn:       vi.fn(),
  movePawn:      vi.fn(),
  removePawn:    vi.fn(),
  animatePawn:   vi.fn(),
  isAnimating:   vi.fn(() => false),
  update:        vi.fn(),
  setPawnColor:  vi.fn(),
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
    Color: vi.fn().mockImplementation(() => ({ setHSL: vi.fn().mockReturnThis() })),
    Fog: vi.fn(),
    PerspectiveCamera: MockCamera,
    AmbientLight: MockLight,
    DirectionalLight: MockLight,
    BoxGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      quaternion: { set: vi.fn(), slerpQuaternions: vi.fn(), x: 0, y: 0, z: 0, w: 1 },
      castShadow: false, receiveShadow: false, visible: false,
    })),
    Vector3: Vec3,
    Quaternion: vi.fn().mockImplementation(() => ({ setFromEuler: vi.fn().mockReturnThis(), x: 0, y: 0, z: 0, w: 1 })),
    Euler: vi.fn(),
    Clock: vi.fn().mockImplementation(() => ({ getDelta: vi.fn().mockReturnValue(0) })),
    PCFSoftShadowMap: 1,
    PCFShadowMap: 2,
    PMREMGenerator: vi.fn().mockImplementation(() => ({
      fromScene: vi.fn(() => ({ texture: { __envTex: true } })),
      fromEquirectangular: vi.fn(() => ({ texture: { __envTex: true } })),
      compileEquirectangularShader: vi.fn(),
      dispose: vi.fn(),
    })),
    PlaneGeometry: vi.fn().mockImplementation((w, h) => ({ __pw: w, __ph: h })),
    MeshBasicMaterial: vi.fn().mockImplementation((opts) => ({ __opts: opts })),
    SRGBColorSpace: 'srgb',
    NoToneMapping:           0,
    LinearToneMapping:       1,
    ACESFilmicToneMapping:   2,
    ReinhardToneMapping:     3,
    CineonToneMapping:       4,
  };
});

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('three/examples/jsm/loaders/RGBELoader.js', () => ({
  RGBELoader: vi.fn().mockImplementation(() => ({ load: vi.fn() })),
}));

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
    smoothReturnToPlayer: vi.fn(),
    panToDice: vi.fn(),
    zoomToVictory: vi.fn(),
    snapToOverview: vi.fn(),
    disableOverviewMode: vi.fn(),
    overviewMode: false, // começa falso no mock para não bloquear snapToPlayer nos testes
  })),
}));

vi.mock('../../three/PawnManager', () => ({
  PawnManager: vi.fn(() => pawnMock),
}));


vi.mock('../../three/dice/DicePhysics', () => ({
  DicePhysics: vi.fn().mockImplementation(() => ({
    throw: vi.fn(), setResult: vi.fn(), update: vi.fn(), dispose: vi.fn(),
  })),
  DICE_ZONE: { x: 12, y: 0.5, z: 4 },
}));

// ─── Imports após mocks ───────────────────────────────────────────────────────
import { initThreeScene } from '../../three/scene/createScene';
import { gameBus } from '../../three/EventBus';
import { DicePhysics } from '../../three/dice/DicePhysics';
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
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p1', 0, expect.any(Number));
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

  it('players:sync anima peão quando posição do jogador já conhecido muda', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    gameBus.emit('players:sync', [makePlayer('p1', 8)]);
    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 8, undefined);
  });

  it('players:sync com múltiplos jogadores adiciona todos com slotIndex correto', () => {
    gameBus.emit('players:sync', [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]);
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p1', 0, expect.any(Number));
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p2', 1, expect.any(Number));
    expect(pawnMock.addPawn).toHaveBeenCalledWith('p3', 2, expect.any(Number));
  });

  it('cleanup remove subscription: players:sync não afeta PawnManager após cleanup', () => {
    cleanup();
    pawnMock.addPawn.mockClear();
    gameBus.emit('players:sync', [makePlayer('p_new')]);
    expect(pawnMock.addPawn).not.toHaveBeenCalled();
  });
});

// ─── RED: câmera durante rolar do dado ────────────────────────────────────────
// Bug: TURN_CHANGED dispara active:player enquanto dado rola →
// snapToPlayer() zera lastInteractionTime → câmera volta ao tabuleiro imediatamente,
// antes do dado resolver. O jogador não vê o dado.
//
// Comportamento correto:
//   - dice:throw → panToDice chamado
//   - active:player DURANTE roll → snapToPlayer NÃO chamado (câmera permanece no dado)
//   - dice:done → snapToPlayer chamado (câmera volta ao peão)

import { CameraController } from '../../three/camera';

describe('scene — câmera e dado', () => {
  let container: HTMLDivElement;
  let cleanup: () => void;
  let cameraCtrl: {
    snapToPlayer: ReturnType<typeof vi.fn>;
    smoothReturnToPlayer: ReturnType<typeof vi.fn>;
    panToDice: ReturnType<typeof vi.fn>;
    zoomToVictory: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth',  { get: () => 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
    cleanup = initThreeScene(container);
    cameraCtrl = vi.mocked(CameraController).mock.results[0].value as typeof cameraCtrl;
  });

  afterEach(() => {
    try { cleanup(); } catch { /* já limpo */ }
  });

  it('dice:throw chama panToDice na câmera', () => {
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    expect(cameraCtrl.panToDice).toHaveBeenCalled();
  });

  it('active:player enquanto dado rola NÃO chama snapToPlayer', () => {
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    cameraCtrl.snapToPlayer.mockClear(); // ignora eventuais chamadas anteriores
    // TURN_CHANGED → active:player chega enquanto dado ainda rola
    gameBus.emit('active:player', { tileIndex: 5 });
    expect(cameraCtrl.snapToPlayer).not.toHaveBeenCalled();
  });

  it('dice:done chama smoothReturnToPlayer para retornar suavemente ao peão', () => {
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    gameBus.emit('dice:done', { face: 3 });
    expect(cameraCtrl.smoothReturnToPlayer).toHaveBeenCalled();
  });

  it('active:player APÓS dice:done chama snapToPlayer normalmente', () => {
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    gameBus.emit('dice:done', { face: 3 });
    cameraCtrl.snapToPlayer.mockClear();
    gameBus.emit('active:player', { tileIndex: 8 });
    expect(cameraCtrl.snapToPlayer).toHaveBeenCalled();
  });

  it('camera:victory chama zoomToVictory na câmera', () => {
    gameBus.emit('camera:victory', {});
    expect(cameraCtrl.zoomToVictory).toHaveBeenCalled();
  });
});

// ─── RED: players:sync bufferizado durante dado rolando ───────────────────────
// Bug: pawn se move ENQUANTO o dado gira, porque players:sync (do GAME_STATE que
// chega junto com TURN_RESULT) dispara animatePawn imediatamente.
//
// Comportamento correto:
//   - dice:throw → diceRolling = true
//   - players:sync durante rolling → bufferizado, animatePawn NÃO chamado ainda
//   - dice:done → aplica buffer → animatePawn chamado agora

describe('scene — buffering de peões durante dado', () => {
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
    try { cleanup(); } catch { /* já limpo */ }
  });

  it('players:sync durante dado rolando NÃO chama animatePawn imediatamente', () => {
    // Jogador conhecido na posição 0
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    // Dado é lançado
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });

    // GAME_STATE chega com nova posição enquanto dado ainda gira
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);

    expect(pawnMock.animatePawn).not.toHaveBeenCalled();
  });

  it('após dice:done aplica o buffer e chama animatePawn', () => {
    vi.useFakeTimers();
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);
    expect(pawnMock.animatePawn).not.toHaveBeenCalled();

    gameBus.emit('dice:done', { face: 5 });
    vi.advanceTimersByTime(1000); // avança past 700ms delay
    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 5, expect.any(Function));
    vi.useRealTimers();
  });

  it('players:sync sem dado rolando chama animatePawn imediatamente (comportamento normal)', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    gameBus.emit('players:sync', [makePlayer('p1', 3)]);
    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 3, undefined);
  });
});

// ─── RED: animação de peões — players:sync anima em vez de teleportar ─────────
// Quando players:sync chega com posição diferente da armazenada → animatePawn
// Quando chega pela primeira vez (jogador novo) → movePawn (posição inicial)

describe('scene — animação de peões (players:sync)', () => {
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
    try { cleanup(); } catch { /* já limpo */ }
  });

  const makePlayer = (id: string, position = 0): Player => ({
    id, name: id, position, score: 0, isConnected: true,
  });

  it('primeiro players:sync para um jogador chama movePawn (não animatePawn)', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    expect(pawnMock.movePawn).toHaveBeenCalledWith('p1', 0);
    expect(pawnMock.animatePawn).not.toHaveBeenCalled();
  });

  it('players:sync com posição alterada chama animatePawn com fromIndex e toIndex', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    gameBus.emit('players:sync', [makePlayer('p1', 4)]);
    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 4, undefined);
  });

  it('players:sync com mesma posição NÃO chama animatePawn', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 3)]);
    pawnMock.animatePawn.mockClear();
    pawnMock.movePawn.mockClear();

    // Posição não mudou
    gameBus.emit('players:sync', [makePlayer('p1', 3)]);
    expect(pawnMock.animatePawn).not.toHaveBeenCalled();
    expect(pawnMock.movePawn).not.toHaveBeenCalled();
  });
});

// ─── RED: retorno suave de câmera + peão só do jogador ativo ─────────────────
// dice:done deve:
//   1. Chamar smoothReturnToPlayer (não snapToPlayer) para retorno suave
//   2. Animar apenas o peão do jogador ativo; teleportar os demais
//   3. Emitir pawn:done no gameBus quando o callback do peão ativo for chamado

describe('scene — retorno suave e animação seletiva após dado', () => {
  let container: HTMLDivElement;
  let cleanup: () => void;
  let cameraCtrl: {
    snapToPlayer: ReturnType<typeof vi.fn>;
    smoothReturnToPlayer: ReturnType<typeof vi.fn>;
    panToDice: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth',  { get: () => 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
    cleanup = initThreeScene(container);
    cameraCtrl = vi.mocked(CameraController).mock.results[0].value as typeof cameraCtrl;
  });

  afterEach(() => {
    try { cleanup(); } catch { /* já limpo */ }
  });

  it('dice:done chama smoothReturnToPlayer (não snapToPlayer) para retorno suave', () => {
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    cameraCtrl.snapToPlayer.mockClear();
    gameBus.emit('dice:done', { face: 3 });
    expect(cameraCtrl.smoothReturnToPlayer).toHaveBeenCalled();
    expect(cameraCtrl.snapToPlayer).not.toHaveBeenCalled();
  });

  it('dice:done detecta quem moveu pelo buffer (sem depender de active:player)', () => {
    vi.useFakeTimers();
    gameBus.emit('players:sync', [makePlayer('p1', 0), makePlayer('p2', 0)]);
    pawnMock.animatePawn.mockClear();
    pawnMock.movePawn.mockClear();

    // Sem emitir active:player — deve encontrar quem moveu automaticamente
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    gameBus.emit('players:sync', [makePlayer('p1', 5), makePlayer('p2', 0)]);

    gameBus.emit('dice:done', { face: 5 });
    vi.advanceTimersByTime(1000);

    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 5, expect.any(Function));
    expect(pawnMock.animatePawn).not.toHaveBeenCalledWith('p2', expect.anything(), expect.anything(), expect.anything());
    vi.useRealTimers();
  });

  it('pawn:done emitido ao chamar callback do peão que moveu (detectado automaticamente)', () => {
    vi.useFakeTimers();
    let capturedOnDone: (() => void) | undefined;
    pawnMock.animatePawn.mockImplementation((_id: string, _from: number, _to: number, onDone?: () => void) => {
      capturedOnDone = onDone;
    });

    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } });
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);

    const pawnDoneHandler = vi.fn();
    gameBus.on('pawn:done', pawnDoneHandler);

    gameBus.emit('dice:done', { face: 5 });
    vi.advanceTimersByTime(1000);

    capturedOnDone?.();
    expect(pawnDoneHandler).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ─── RED: clientes não-roladores — todos veem o dado via dice:rollStart ────
  // Problema: dice:throw só é emitido pelo cliente que rolou → outros clientes
  // não têm animação do dado e aplicam o buffer imediatamente ao receberem
  // dice:rollEnd (TURN_CHANGED), antes da animação do rolador terminar.
  //
  // Solução: dice:rollStart dispara dicePhysics.throw() em TODOS os clientes
  // que não são o rolador local. Assim dice:done dispara em todos ao mesmo tempo
  // (~2s), sincronizando a animação dos peões.

  it('dice:rollStart ativa buffer para clientes não-roladores', () => {
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    // Não houve dice:throw (este cliente não rolou)
    gameBus.emit('dice:rollStart', {}); // chega via TURN_RESULT
    gameBus.emit('players:sync', [makePlayer('p1', 5)]); // GAME_STATE enquanto "aguardando"

    expect(pawnMock.animatePawn).not.toHaveBeenCalled(); // bufferizado ✓
  });

  it('dice:rollStart em não-rolador inicia animação local do dado (chama dicePhysics.throw)', () => {
    const diceInst = vi.mocked(DicePhysics).mock.results[0].value;

    // Este cliente não rolou — não emite dice:throw
    gameBus.emit('dice:rollStart', {});

    expect(diceInst.throw).toHaveBeenCalled();
  });

  it('dice:rollStart em não-rolador NÃO força câmera para o dado (câmera livre para o jogador)', () => {
    gameBus.emit('dice:rollStart', {});

    expect(cameraCtrl.panToDice).not.toHaveBeenCalled();
  });

  it('dice:rollStart em rolador local NÃO duplica dicePhysics.throw', () => {
    const diceInst = vi.mocked(DicePhysics).mock.results[0].value;

    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } }); // rolador
    const throwCount = diceInst.throw.mock.calls.length;

    gameBus.emit('dice:rollStart', {}); // chega do servidor — no-op para rolador
    expect(diceInst.throw.mock.calls.length).toBe(throwCount);
  });

  it('dice:done em não-rolador (via dice:rollStart) aplica buffer e anima quem moveu', () => {
    vi.useFakeTimers();
    gameBus.emit('players:sync', [makePlayer('p1', 0), makePlayer('p2', 0)]);
    pawnMock.animatePawn.mockClear();
    pawnMock.movePawn.mockClear();

    gameBus.emit('dice:rollStart', {}); // não-rolador ativa buffer + animação local
    gameBus.emit('players:sync', [makePlayer('p1', 5), makePlayer('p2', 0)]);

    gameBus.emit('dice:done', { face: 5 }); // animação local termina → aplica buffer
    vi.advanceTimersByTime(1000);

    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 5, expect.any(Function));
    expect(pawnMock.animatePawn).not.toHaveBeenCalledWith('p2', expect.anything(), expect.anything(), expect.anything());
    vi.useRealTimers();
  });

  it('dice:rollEnd não aplica buffer para não-roladores (dice:done é responsável)', () => {
    vi.useFakeTimers();
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    gameBus.emit('dice:rollStart', {}); // não-rolador inicia animação local
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);

    gameBus.emit('dice:rollEnd', {}); // TURN_CHANGED chega — não deve aplicar buffer
    vi.advanceTimersByTime(100);
    expect(pawnMock.animatePawn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('dice:rollEnd é ignorado em clientes que rolaram localmente (dice:throw)', () => {
    vi.useFakeTimers();
    gameBus.emit('players:sync', [makePlayer('p1', 0)]);
    pawnMock.animatePawn.mockClear();

    gameBus.emit('dice:throw', { position: { x: 12, y: 0.5, z: 4 } }); // rolador local
    gameBus.emit('dice:rollStart', {}); // chega do servidor (TURN_RESULT) — no-op para rolador
    gameBus.emit('players:sync', [makePlayer('p1', 5)]);

    gameBus.emit('dice:rollEnd', {}); // TURN_CHANGED — deve ser ignorado pelo rolador
    expect(pawnMock.animatePawn).not.toHaveBeenCalled(); // rolador espera dice:done

    gameBus.emit('dice:done', { face: 5 });
    vi.advanceTimersByTime(1000);
    expect(pawnMock.animatePawn).toHaveBeenCalledWith('p1', 0, 5, expect.any(Function)); // só agora
    vi.useRealTimers();
  });
});
