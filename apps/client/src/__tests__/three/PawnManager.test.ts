import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Three.js (sem WebGL) ────────────────────────────────────────────────
vi.mock('three', () => {
  const MockMesh = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    castShadow: false,
  }));

  const MockCapsuleGeometry = vi.fn();
  const MockMeshStandardMaterial = vi.fn();

  const MockScene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  }));

  return {
    CapsuleGeometry: MockCapsuleGeometry,
    MeshStandardMaterial: MockMeshStandardMaterial,
    Mesh: MockMesh,
    Scene: MockScene,
  };
});

import * as THREE from 'three';
import { PawnManager } from '../../three/PawnManager';

// ─── RED: falha até PawnManager.ts ser implementado ──────────────────────────

describe('PawnManager', () => {
  let scene: THREE.Scene;
  let manager: PawnManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    manager = new PawnManager(scene);
  });

  it('addPawn adiciona mesh à cena', () => {
    manager.addPawn('p1', 0);
    expect(scene.add).toHaveBeenCalledTimes(1);
  });

  it('addPawn registra o peão pelo playerId', () => {
    manager.addPawn('p1', 0);
    expect(manager.getPawnCount()).toBe(1);
  });

  it('addPawn múltiplos jogadores registra todos', () => {
    manager.addPawn('p1', 0);
    manager.addPawn('p2', 1);
    manager.addPawn('p3', 2);
    expect(manager.getPawnCount()).toBe(3);
    expect(scene.add).toHaveBeenCalledTimes(3);
  });

  it('movePawn chama position.set com coordenadas do tile', () => {
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 5);

    const mesh = ((THREE.Mesh as unknown) as ReturnType<typeof vi.fn>).mock.results[0].value as {
      position: { set: ReturnType<typeof vi.fn> };
    };
    expect(mesh.position.set).toHaveBeenCalled();
    const [, y] = mesh.position.set.mock.calls.at(-1) as [number, number, number];
    expect(y).toBeGreaterThan(0); // acima do tile
  });

  // ─── Offset de quadrante (2–4 jogadores no mesmo tile não se sobrepõem) ───
  it('dois peões no mesmo tile recebem posições X ou Z distintas', () => {
    manager.addPawn('p1', 0);
    manager.addPawn('p2', 1);
    manager.movePawn('p1', 0);
    manager.movePawn('p2', 0);

    const results = ((THREE.Mesh as unknown) as ReturnType<typeof vi.fn>).mock.results;
    const pos0 = results[0].value.position.set.mock.calls.at(-1) as [number, number, number];
    const pos1 = results[1].value.position.set.mock.calls.at(-1) as [number, number, number];

    expect(pos0[0] === pos1[0] && pos0[2] === pos1[2]).toBe(false);
  });

  it('quatro peões no mesmo tile têm posições X/Z todas distintas', () => {
    ['p1','p2','p3','p4'].forEach((id, i) => {
      manager.addPawn(id, i);
      manager.movePawn(id, 0);
    });

    const results = ((THREE.Mesh as unknown) as ReturnType<typeof vi.fn>).mock.results;
    const positions = [0,1,2,3].map((i) => {
      const [x,,z] = results[i].value.position.set.mock.calls.at(-1) as [number,number,number];
      return `${x.toFixed(3)},${z.toFixed(3)}`;
    });

    // Todas as 4 posições XZ devem ser únicas
    expect(new Set(positions).size).toBe(4);
  });

  it('movePawn para playerId inexistente não lança erro', () => {
    expect(() => manager.movePawn('ghost', 0)).not.toThrow();
  });

  it('removePawn remove mesh da cena', () => {
    manager.addPawn('p1', 0);
    manager.removePawn('p1');
    expect(scene.remove).toHaveBeenCalledTimes(1);
    expect(manager.getPawnCount()).toBe(0);
  });

  it('removePawn para playerId inexistente não lança erro', () => {
    expect(() => manager.removePawn('ghost')).not.toThrow();
    expect(scene.remove).not.toHaveBeenCalled();
  });

  it('getPawnCount retorna 0 inicialmente', () => {
    expect(manager.getPawnCount()).toBe(0);
  });
});
