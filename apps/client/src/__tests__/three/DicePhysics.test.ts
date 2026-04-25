import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RED: DicePhysics — animação de tween sem cannon-es ───────────────────────
// idle → spinning (rotação rápida + queda) → decelerating (easeOut → face correta) → done
// gameBus 'dice:done' emitido ao completar a desaceleração

const { mockMesh } = vi.hoisted(() => {
  const mockMesh = {
    castShadow: false,
    visible: false,
    position: {
      set: vi.fn(),
      x: 0, y: 0, z: 0,
      copy: vi.fn(),
    },
    quaternion: {
      set: vi.fn(),
      slerpQuaternions: vi.fn(),
      premultiply: vi.fn(),
      copy: vi.fn(),
      x: 0, y: 0, z: 0, w: 1,
    },
  };
  return { mockMesh };
});

vi.mock('../../three/EventBus', () => ({
  gameBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
}));

vi.mock('three', () => ({
  Mesh: vi.fn(() => mockMesh),
  BoxGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
  })),
  Quaternion: vi.fn().mockImplementation(() => ({
    setFromAxisAngle: vi.fn().mockReturnThis(),
    slerpQuaternions: vi.fn().mockReturnThis(),
    premultiply: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    x: 0, y: 0, z: 0, w: 1,
  })),
  Euler: vi.fn(),
}));

vi.mock('../../three/dice/faceRotations', () => ({
  FACE_QUATERNIONS: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((f) => [f, { x: 0, y: 0, z: 0, w: 1 }]),
  ),
}));

import { DicePhysics } from '../../three/dice/DicePhysics';
import { gameBus } from '../../three/EventBus';

const DICE_POS = { x: 12, y: 0.5, z: 4 };

// Duração dos estados (deve coincidir com as constantes internas)
const SPIN_DURATION  = 1.2; // segundos de rotação rápida
const DECEL_DURATION = 0.8; // segundos de desaceleração até a face correta

describe('DicePhysics — tween sem cannon-es', () => {
  let scene: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let dp: DicePhysics;

  beforeEach(() => {
    scene = { add: vi.fn(), remove: vi.fn() };
    vi.mocked(gameBus.emit).mockClear();
    vi.mocked(mockMesh.quaternion.premultiply).mockClear();
    vi.mocked(mockMesh.quaternion.slerpQuaternions).mockClear();
    mockMesh.visible = false;
    dp = new DicePhysics(scene as never);
  });

  // ─── Estado inicial ────────────────────────────────────────────────────────

  it('estado inicial é idle', () => {
    expect(dp.state).toBe('idle');
  });

  it('adiciona o mesh à cena ao construir', () => {
    expect(scene.add).toHaveBeenCalledWith(mockMesh);
  });

  // ─── throw() ──────────────────────────────────────────────────────────────

  it('throw() muda estado para spinning', () => {
    dp.throw(DICE_POS);
    expect(dp.state).toBe('spinning');
  });

  it('throw() torna o dado visível', () => {
    dp.throw(DICE_POS);
    expect(mockMesh.visible).toBe(true);
  });

  it('throw() posiciona o dado acima da zona', () => {
    dp.throw(DICE_POS);
    expect(mockMesh.position.set).toHaveBeenCalledWith(
      DICE_POS.x,
      expect.any(Number), // y + offset
      DICE_POS.z,
    );
  });

  // ─── setResult() ──────────────────────────────────────────────────────────

  it('setResult() armazena a face pendente', () => {
    dp.throw(DICE_POS);
    dp.setResult(3);
    expect(dp.pendingFace).toBe(3);
  });

  // ─── Spinning ─────────────────────────────────────────────────────────────

  it('update() gira o mesh via premultiply durante spinning', () => {
    dp.throw(DICE_POS);
    dp.update(0.016);
    expect(mockMesh.quaternion.premultiply).toHaveBeenCalled();
  });

  it('permanece em spinning antes de SPIN_DURATION', () => {
    dp.throw(DICE_POS);
    dp.setResult(5);
    dp.update(SPIN_DURATION - 0.1);
    expect(dp.state).toBe('spinning');
  });

  it('NÃO transita para decelerating se pendingFace ainda é null', () => {
    dp.throw(DICE_POS);
    dp.update(SPIN_DURATION + 0.1);
    expect(dp.state).toBe('spinning');
  });

  it('transita para decelerating após SPIN_DURATION com pendingFace definido', () => {
    dp.throw(DICE_POS);
    dp.setResult(4);
    dp.update(SPIN_DURATION + 0.1);
    expect(dp.state).toBe('decelerating');
  });

  // ─── Decelerating ─────────────────────────────────────────────────────────

  it('permanece em decelerating antes de DECEL_DURATION', () => {
    dp.throw(DICE_POS);
    dp.setResult(6);
    dp.update(SPIN_DURATION + 0.1); // → decelerating
    dp.update(DECEL_DURATION - 0.1);
    expect(dp.state).toBe('decelerating');
  });

  it('usa slerpQuaternions durante decelerating', () => {
    dp.throw(DICE_POS);
    dp.setResult(2);
    dp.update(SPIN_DURATION + 0.1); // → decelerating
    dp.update(0.1);
    expect(mockMesh.quaternion.slerpQuaternions).toHaveBeenCalled();
  });

  it('transita para done e emite dice:done ao completar decelerating', () => {
    dp.throw(DICE_POS);
    dp.setResult(2);
    dp.update(SPIN_DURATION + 0.1); // → decelerating
    dp.update(DECEL_DURATION + 0.1); // → done
    expect(dp.state).toBe('done');
    expect(gameBus.emit).toHaveBeenCalledWith('dice:done', { face: 2 });
  });

  // ─── Idle / Done não fazem nada ────────────────────────────────────────────

  it('update() não gira o mesh no estado idle', () => {
    dp.update(1.0);
    expect(mockMesh.quaternion.premultiply).not.toHaveBeenCalled();
    expect(dp.state).toBe('idle');
  });

  it('update() não faz nada no estado done', () => {
    dp.throw(DICE_POS);
    dp.setResult(3);
    dp.update(SPIN_DURATION + 0.1);
    dp.update(DECEL_DURATION + 0.1); // → done
    vi.mocked(mockMesh.quaternion.premultiply).mockClear();
    vi.mocked(mockMesh.quaternion.slerpQuaternions).mockClear();
    vi.mocked(gameBus.emit).mockClear();
    dp.update(1.0);
    expect(mockMesh.quaternion.premultiply).not.toHaveBeenCalled();
    expect(gameBus.emit).not.toHaveBeenCalled();
  });

  // ─── Atlas do dado ────────────────────────────────────────────────────────

  it('com theme.dice.atlas: chama loadTexture com a URL do atlas', async () => {
    const loadTexture = vi.fn().mockResolvedValue({
      clone: vi.fn().mockReturnValue({ repeat: { set: vi.fn() }, offset: { set: vi.fn() } }),
      repeat: { set: vi.fn() },
      offset: { set: vi.fn() },
    });
    const theme = {
      dice: { scale: 1.0, atlas: { url: '/textures/dice-atlas.svg', columns: 6, rows: 1 } },
    };
    new (await import('../../three/dice/DicePhysics')).DicePhysics(
      scene as never,
      theme as never,
      { loadTexture, loadGLTF: vi.fn() } as never,
    );
    // Espera microtask: loadTexture invocado de forma assíncrona no construtor
    await Promise.resolve();
    expect(loadTexture).toHaveBeenCalledWith('/textures/dice-atlas.svg');
  });

  it('com theme.dice.url: chama loadGLTF com a URL do modelo', async () => {
    const loadGLTF = vi.fn().mockResolvedValue({
      clone: vi.fn().mockReturnValue({ scale: { set: vi.fn() }, traverse: vi.fn() }),
    });
    const theme = { dice: { scale: 1.0, url: '/models/dice.glb' } };
    new (await import('../../three/dice/DicePhysics')).DicePhysics(
      scene as never,
      theme as never,
      { loadGLTF, loadTexture: vi.fn() } as never,
    );
    await Promise.resolve();
    expect(loadGLTF).toHaveBeenCalledWith('/models/dice.glb', 'unknown');
  });

  // ─── dispose ───────────────────────────────────────────────────────────────

  it('dispose() remove mesh da cena', () => {
    dp.dispose();
    expect(scene.remove).toHaveBeenCalledWith(mockMesh);
  });

  it('dispose() não depende de cannon-es (sem removeBody)', () => {
    // Nenhum "world" é passado ao construtor nem ao dispose — se compilar, passou
    dp.throw(DICE_POS);
    expect(() => dp.dispose()).not.toThrow();
  });
});
