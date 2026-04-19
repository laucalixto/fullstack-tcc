import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RED: DicePhysics — máquina de estados do dado ────────────────────────────
// idle → simulating (1.5s cannon-es) → snapping (0.3s lerp) → done
// gameBus 'dice:done' emitido ao completar snap

const { mockWorld, mockBody, mockMesh } = vi.hoisted(() => {
  const mockWorld = {
    addBody: vi.fn(),
    removeBody: vi.fn(),
    step: vi.fn(),
    bodies: [] as unknown[],
  };
  const mockBody = {
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    velocity: { set: vi.fn(), setZero: vi.fn() },
    angularVelocity: { set: vi.fn(), setZero: vi.fn() },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
  };
  const mockMesh = {
    castShadow: false,
    visible: false,
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    quaternion: { set: vi.fn(), slerpQuaternions: vi.fn(), x: 0, y: 0, z: 0, w: 1 },
  };
  return { mockWorld, mockBody, mockMesh };
});

vi.mock('cannon-es', () => ({
  World:  vi.fn(() => mockWorld),
  Body:   vi.fn(() => mockBody),
  Box:    vi.fn(),
  Vec3:   vi.fn(() => ({ x: 0, y: 0, z: 0 })),
}));

vi.mock('../../three/EventBus', () => ({
  gameBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
}));

vi.mock('three', () => ({
  Mesh:                 vi.fn(() => mockMesh),
  BoxGeometry:          vi.fn(),
  MeshStandardMaterial: vi.fn(),
  Quaternion:           vi.fn(() => ({ x: 0, y: 0, z: 0, w: 1 })),
  Euler:                vi.fn(),
}));

vi.mock('../../three/dice/faceRotations', () => ({
  FACE_QUATERNIONS: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((f) => [f, { x: 0, y: 0, z: 0, w: 1 }]),
  ),
}));

import { DicePhysics } from '../../three/dice/DicePhysics';
import { gameBus } from '../../three/EventBus';
import * as CANNON from 'cannon-es';

const DICE_POS = { x: 12, y: 0.5, z: 4 };

describe('DicePhysics', () => {
  let scene: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let world: InstanceType<typeof CANNON.World>;
  let dp: DicePhysics;

  beforeEach(() => {
    scene = { add: vi.fn(), remove: vi.fn() };
    world = new CANNON.World();
    vi.mocked(mockWorld.addBody).mockClear();
    vi.mocked(mockWorld.removeBody).mockClear();
    vi.mocked(mockWorld.step).mockClear();
    vi.mocked(gameBus.emit).mockClear();
    mockMesh.visible = false;
    dp = new DicePhysics(scene as never, world);
  });

  // ─── Estados ───────────────────────────────────────────────────────────────

  it('estado inicial é idle', () => {
    expect(dp.state).toBe('idle');
  });

  it('throw() muda estado para simulating', () => {
    dp.throw(DICE_POS);
    expect(dp.state).toBe('simulating');
  });

  it('throw() torna o dado visível', () => {
    dp.throw(DICE_POS);
    expect(mockMesh.visible).toBe(true);
  });

  it('throw() adiciona body ao world', () => {
    dp.throw(DICE_POS);
    expect(mockWorld.addBody).toHaveBeenCalledWith(mockBody);
  });

  it('update() chama world.step enquanto simulating', () => {
    dp.throw(DICE_POS);
    dp.update(0.016);
    expect(mockWorld.step).toHaveBeenCalled();
  });

  // ─── setResult ─────────────────────────────────────────────────────────────

  it('setResult() armazena a face para snap posterior', () => {
    dp.throw(DICE_POS);
    dp.setResult(3);
    expect(dp.pendingFace).toBe(3);
  });

  // ─── Transições de estado ──────────────────────────────────────────────────

  it('permanece em simulating antes de SIMULATING_DURATION', () => {
    dp.throw(DICE_POS);
    dp.setResult(5);
    dp.update(1.0); // < 1.5s
    expect(dp.state).toBe('simulating');
  });

  it('transita para snapping após SIMULATING_DURATION com pendingFace definido', () => {
    dp.throw(DICE_POS);
    dp.setResult(4);
    dp.update(1.6); // > 1.5s
    expect(dp.state).toBe('snapping');
  });

  it('NÃO transita para snapping se pendingFace ainda é null', () => {
    dp.throw(DICE_POS);
    dp.update(2.0); // > 1.5s mas sem setResult
    expect(dp.state).toBe('simulating');
  });

  it('transita para done e emite dice:done após snapping completar', () => {
    dp.throw(DICE_POS);
    dp.setResult(2);
    dp.update(1.6); // → snapping
    dp.update(0.4); // > 0.3s → done
    expect(dp.state).toBe('done');
    expect(gameBus.emit).toHaveBeenCalledWith('dice:done', { face: 2 });
  });

  it('permanece em snapping antes de SNAPPING_DURATION', () => {
    dp.throw(DICE_POS);
    dp.setResult(6);
    dp.update(1.6); // → snapping
    dp.update(0.1); // < 0.3s
    expect(dp.state).toBe('snapping');
  });

  it('remove o body do world ao completar', () => {
    dp.throw(DICE_POS);
    dp.setResult(1);
    dp.update(1.6);
    dp.update(0.4);
    expect(mockWorld.removeBody).toHaveBeenCalledWith(mockBody);
  });

  // ─── Idle / Done não fazem nada ────────────────────────────────────────────

  it('update() não invoca world.step no estado idle', () => {
    dp.update(1.0);
    expect(mockWorld.step).not.toHaveBeenCalled();
    expect(dp.state).toBe('idle');
  });

  it('update() não invoca world.step no estado done', () => {
    dp.throw(DICE_POS);
    dp.setResult(3);
    dp.update(1.6);
    dp.update(0.4); // → done
    vi.mocked(mockWorld.step).mockClear();
    dp.update(1.0);
    expect(mockWorld.step).not.toHaveBeenCalled();
  });

  // ─── dispose ───────────────────────────────────────────────────────────────

  it('dispose() remove mesh da cena', () => {
    dp.dispose();
    expect(scene.remove).toHaveBeenCalledWith(mockMesh);
  });

  it('dispose() remove body do world se ainda estiver ativo', () => {
    dp.throw(DICE_POS);
    mockWorld.bodies = [mockBody]; // simula body no world
    dp.dispose();
    expect(mockWorld.removeBody).toHaveBeenCalledWith(mockBody);
  });
});
