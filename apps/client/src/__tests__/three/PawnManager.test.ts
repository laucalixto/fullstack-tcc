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

// ─── RED: animação casa a casa ────────────────────────────────────────────────
// Tiles 9 (y=0.0) → 10 (y=0.5): Δy=0.5 → deve gerar arco de salto
// Tiles 1 (y=0.0) → 3 (y=0.0): Δy=0  → sem salto (mesma altura)

const STEP_DURATION = 0.12; // deve coincidir com a constante interna
const PAWN_Y_OFFSET = 0.65;

// Helper: retorna o mesh criado pelo índice de construção (em ordem de addPawn)
function getMeshAt(index: number) {
  return (THREE.Mesh as unknown as ReturnType<typeof vi.fn>).mock.results[index].value as {
    position: { set: ReturnType<typeof vi.fn> };
  };
}

describe('PawnManager — animação casa a casa', () => {
  let scene: THREE.Scene;
  let manager: PawnManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    manager = new PawnManager(scene);
  });

  it('isAnimating retorna false antes de qualquer animatePawn', () => {
    manager.addPawn('p1', 0);
    expect(manager.isAnimating('p1')).toBe(false);
  });

  it('animatePawn não teleporta imediatamente (position.set não chamado)', () => {
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 1); // posiciona primeiro
    const mesh = getMeshAt(0);
    mesh.position.set.mockClear();

    manager.animatePawn('p1', 1, 3);
    expect(mesh.position.set).not.toHaveBeenCalled();
  });

  it('isAnimating retorna true após animatePawn', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 3);
    expect(manager.isAnimating('p1')).toBe(true);
  });

  it('update chama position.set a cada frame durante animação', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 2);
    const mesh = getMeshAt(0);
    mesh.position.set.mockClear();

    manager.update(STEP_DURATION * 0.5); // meio do 1º passo
    expect(mesh.position.set).toHaveBeenCalled();
  });

  it('isAnimating retorna false após completar todos os passos', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 3); // 3 passos

    manager.update(STEP_DURATION + 0.01); // passo 1 → 2
    manager.update(STEP_DURATION + 0.01); // passo 2 → 3
    manager.update(STEP_DURATION + 0.01); // passo 3 → done

    expect(manager.isAnimating('p1')).toBe(false);
  });

  it('Y é maior que o tile de destino durante transição com mudança de altura (salto)', () => {
    // Tile 9 (y=0.0) → tile 10 (y=0.5) — Δy=0.5 → deve produzir arco
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 9);
    manager.animatePawn('p1', 9, 10); // 1 passo com Δy=0.5
    const mesh = getMeshAt(0);
    mesh.position.set.mockClear();

    manager.update(STEP_DURATION * 0.5); // pico do arco
    const yDuring = mesh.position.set.mock.calls.at(-1)?.[1] as number;

    // Y deve ser maior que o tile de destino + offset (sem salto seria ≤ 1.15)
    const destY = 0.5 + PAWN_Y_OFFSET; // 1.15
    expect(yDuring).toBeGreaterThan(destY);
  });

  it('Y NÃO sobe acima do tile de destino em transição sem mudança de altura', () => {
    // Tiles 1 → 3 todos y=0.0 — sem salto
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 1);
    manager.animatePawn('p1', 1, 3); // 2 passos no mesmo nível
    const mesh = getMeshAt(0);
    mesh.position.set.mockClear();

    // Avança pelos passos e verifica que Y nunca ultrapassa pawn_offset
    manager.update(STEP_DURATION * 0.5);
    manager.update(STEP_DURATION * 0.5);

    const maxY = Math.max(
      ...(mesh.position.set.mock.calls.map((args: unknown[]) => args[1] as number)),
    );
    expect(maxY).toBeLessThanOrEqual(PAWN_Y_OFFSET + 0.01); // tolerância de float
  });

  it('animatePawn com fromIndex === toIndex não cria animação', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 5, 5);
    expect(manager.isAnimating('p1')).toBe(false);
  });

  it('animatePawn para playerId desconhecido não lança erro', () => {
    expect(() => manager.animatePawn('ghost', 0, 5)).not.toThrow();
  });

  // ─── RED: retorno (fromIndex > toIndex) ──────────────────────────────────────
  it('animatePawn backward: inicia animação quando fromIndex > toIndex', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 6, 3); // volta 3 casas
    expect(manager.isAnimating('p1')).toBe(true);
  });

  it('animatePawn backward: completa todos os passos e para', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 6, 3); // 3 passos: 6→5, 5→4, 4→3

    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);

    expect(manager.isAnimating('p1')).toBe(false);
  });

  it('animatePawn backward: chama onDone ao concluir', () => {
    const onDone = vi.fn();
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 6, 3, onDone);

    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('animatePawn backward: chama position.set a cada frame durante animação', () => {
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 6);
    manager.animatePawn('p1', 6, 4);
    const mesh = getMeshAt(0);
    mesh.position.set.mockClear();

    manager.update(STEP_DURATION * 0.5);
    expect(mesh.position.set).toHaveBeenCalled();
  });
});

// ─── RED: callback onDone ao concluir animação ────────────────────────────────
// animatePawn aceita 4º argumento opcional onDone?: () => void
// Deve ser chamado exatamente 1 vez após o último passo completar

describe('PawnManager — callback onDone', () => {
  let scene: THREE.Scene;
  let manager: PawnManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    manager = new PawnManager(scene);
  });

  it('chama onDone exatamente uma vez ao concluir todos os passos', () => {
    const onDone = vi.fn();
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 3, onDone);

    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);
    manager.update(STEP_DURATION + 0.01);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('não chama onDone antes da animação terminar', () => {
    const onDone = vi.fn();
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 3, onDone);

    manager.update(STEP_DURATION * 0.5); // metade do 1º passo
    expect(onDone).not.toHaveBeenCalled();
  });

  it('sem onDone não lança erro ao concluir', () => {
    manager.addPawn('p1', 0);
    manager.animatePawn('p1', 0, 2);
    expect(() => {
      manager.update(STEP_DURATION + 0.01);
      manager.update(STEP_DURATION + 0.01);
    }).not.toThrow();
  });
});
