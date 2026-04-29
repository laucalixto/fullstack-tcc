import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Three.js (sem WebGL) ────────────────────────────────────────────────
vi.mock('three', () => {
  const MockMesh = vi.fn().mockImplementation(() => {
    const position = {
      x: 0, y: 0, z: 0,
      set: vi.fn(function (this: { x: number; y: number; z: number }, x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      }),
    };
    return {
      position,
      castShadow: false,
      // marcador para diferenciar Mesh procedural de clone glTF nas asserções
      __isCapsule: true,
    };
  });

  const MockCapsuleGeometry = vi.fn();
  const MockMeshStandardMaterial = vi.fn();

  const MockScene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  }));

  // Box3.setFromObject(group).min — PawnManager usa para medir o pivô do glTF
  // e descobrir o offset Y de pousio do peão sobre o tile.
  const MockBox3 = vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn().mockReturnThis(),
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  }));

  return {
    CapsuleGeometry: MockCapsuleGeometry,
    MeshStandardMaterial: MockMeshStandardMaterial,
    Mesh: MockMesh,
    Scene: MockScene,
    Box3: MockBox3,
  };
});

import * as THREE from 'three';
import { PawnManager } from '../../three/PawnManager';
import { DEFAULT_THEME, type BoardTheme } from '../../three/theme/boardTheme';

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
// Default procedural após refactor (era 0.65 antes; agora 0.35 — cápsula
// pousa exatamente no tile, alinhado ao comportamento do glTF bbox-derived).
const PAWN_Y_OFFSET = 0.35;

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

// ─── RED: corrida do glTF assíncrono ──────────────────────────────────────────
// Caso de uso: theme.pawn.url está definido, mas o AssetLoader ainda não
// resolveu o load quando addPawn é chamado. Hoje cai no fallback CapsuleGeometry
// e nunca mais é trocado — usuário fica com peões capsulares mesmo com .glb
// presente. A correção: peões capsulares são trocados pelo clone do glTF
// quando o load resolver, preservando posição e cor.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface FakeGroup {
  __isGLTFTemplate?: boolean;
  __isGLTFClone?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: { x: number; y: number; z: number; set: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scale: { set: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traverse: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone: any;
}

function makePos() {
  return {
    x: 0, y: 0, z: 0,
    set: vi.fn(function (this: { x: number; y: number; z: number }, x: number, y: number, z: number) {
      this.x = x; this.y = y; this.z = z;
    }),
  };
}

/**
 * Aguarda o esvaziamento da fila de microtasks. Um único `await Promise.resolve()`
 * só drena 1 nível; promessas encadeadas (loadGLTF → .then → .catch) precisam
 * de uma macrotask para garantir que todos os callbacks tenham rodado.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeFakeGroup(): FakeGroup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloneFn: any = vi.fn(() => {
    const cloned: FakeGroup = {
      __isGLTFClone: true,
      position: makePos(),
      scale: { set: vi.fn() },
      traverse: vi.fn(),
      clone: cloneFn,
    };
    return cloned;
  });
  return {
    __isGLTFTemplate: true,
    position: makePos(),
    scale: { set: vi.fn() },
    traverse: vi.fn(),
    clone: cloneFn,
  };
}

describe('PawnManager — glTF assíncrono (race condition)', () => {
  let scene: THREE.Scene;
  let theme: BoardTheme;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assets: any;
  let resolveLoad: (g: FakeGroup) => void;
  let rejectLoad: (e: Error) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    theme = JSON.parse(JSON.stringify(DEFAULT_THEME)) as BoardTheme;
    theme.pawn.url = '/models/pawn.glb';
    assets = {
      loadGLTF: vi.fn().mockImplementation(
        () =>
          new Promise<FakeGroup>((resolve, reject) => {
            resolveLoad = resolve;
            rejectLoad = reject;
          }),
      ),
    };
  });

  it('com load pendente, addPawn cria CapsuleGeometry como fallback inicial', () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);
    expect(THREE.CapsuleGeometry).toHaveBeenCalledTimes(1);
  });

  it('quando o load resolve, peões capsulares existentes são trocados pelo clone glTF', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);
    manager.addPawn('p2', 1);
    const sceneAddBefore = (scene.add as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    expect(scene.remove).toHaveBeenCalledTimes(2);
    expect(group.clone).toHaveBeenCalledTimes(2);
    expect(
      (scene.add as unknown as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(sceneAddBefore + 2);
  });

  it('upgrade preserva posição (movePawn antes do load → mesmas coords no clone)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);
    manager.movePawn('p1', 5);

    const capsule = (THREE.Mesh as unknown as ReturnType<typeof vi.fn>).mock.results[0].value as {
      position: { x: number; y: number; z: number };
    };
    const preX = capsule.position.x;
    const preY = capsule.position.y;
    const preZ = capsule.position.z;

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    const cloned = (group.clone.mock.results[0]?.value) as FakeGroup;
    expect(cloned.position.x).toBe(preX);
    expect(cloned.position.y).toBe(preY);
    expect(cloned.position.z).toBe(preZ);
  });

  it('upgrade aplica cor por jogador no clone (traverse chamado)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p2', 1);

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    const cloned = (group.clone.mock.results[0]?.value) as FakeGroup;
    expect(cloned.traverse).toHaveBeenCalled();
  });

  it('upgrade aplica scale do tema ao clone', async () => {
    theme.pawn.scale = 1.7;
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    const cloned = (group.clone.mock.results[0]?.value) as FakeGroup;
    expect(cloned.scale.set).toHaveBeenCalledWith(1.7, 1.7, 1.7);
  });

  it('quando o load rejeita, peões capsulares permanecem (fallback estável)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);

    rejectLoad!(new Error('parse error'));
    await Promise.resolve();
    await Promise.resolve();

    expect(scene.remove).not.toHaveBeenCalled();
    // ainda funcional — addPawn novo continua usando capsula
    manager.addPawn('p2', 1);
    expect(THREE.CapsuleGeometry).toHaveBeenCalledTimes(2);
  });

  it('quando glTF JÁ está cacheado, addPawn posterior clona direto (sem capsula)', async () => {
    const manager = new PawnManager(scene, theme, assets);

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    manager.addPawn('p1', 0);
    expect(THREE.CapsuleGeometry).not.toHaveBeenCalled();
    expect(group.clone).toHaveBeenCalledTimes(1);
  });

  it('upgrade só ocorre uma vez por peão existente (idempotência)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);
    manager.addPawn('p2', 1);
    manager.addPawn('p3', 2);

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();

    expect(group.clone).toHaveBeenCalledTimes(3);
  });

  it('addPawn DEPOIS do upgrade não cria capsula nova', async () => {
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);

    const group = makeFakeGroup();
    resolveLoad!(group);
    await flushMicrotasks();
    const capsulesAfterUpgrade = (THREE.CapsuleGeometry as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    manager.addPawn('p2', 1);

    expect(
      (THREE.CapsuleGeometry as unknown as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(capsulesAfterUpgrade);
    expect(group.clone).toHaveBeenCalledTimes(2);
  });

  it('sem theme.pawn.url, peões sempre são capsulares (fallback completo)', () => {
    delete theme.pawn.url;
    const manager = new PawnManager(scene, theme, assets);
    manager.addPawn('p1', 0);
    manager.addPawn('p2', 1);
    expect(THREE.CapsuleGeometry).toHaveBeenCalledTimes(2);
    expect(assets.loadGLTF).not.toHaveBeenCalled();
  });

  it('sem AssetLoader, peões sempre são capsulares mesmo com url no tema', () => {
    const manager = new PawnManager(scene, theme, null);
    manager.addPawn('p1', 0);
    expect(THREE.CapsuleGeometry).toHaveBeenCalledTimes(1);
  });
});

// ─── RED: matcher robusto da mesh do corpo (Blender renomeia) ────────────────
// Bug: applyPlayerColor faz `child.name === bodyMeshName` (exato, case-sensitive).
// O exporter glTF do Blender frequentemente sufixa (`pawn-body.001`) ou muda
// capitalização — o match falha silenciosamente e o peão fica com a cor
// original do .glb. Fix: aceitar nomes que **começam** com bodyMeshName,
// case-insensitive. Quando nada bate, emitir console.warn listando as meshes
// encontradas — diagnóstico imediato para o dev renomear no Outliner.

interface FakeMesh {
  isMesh: true;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  material: any;
}

function makeFakeGroupWithMeshes(meshNames: string[]): FakeGroup & { _meshes: FakeMesh[] } {
  const meshes: FakeMesh[] = meshNames.map((name) => ({
    isMesh: true as const,
    name,
    material: { isOriginal: true },
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverse: any = vi.fn((cb: (child: FakeMesh) => void) => {
    for (const m of meshes) cb(m);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloneFn: any = vi.fn(() => {
    const cloneMeshes: FakeMesh[] = meshNames.map((name) => ({
      isMesh: true as const,
      name,
      material: { isOriginal: true },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cloneTraverse: any = vi.fn((cb: (child: FakeMesh) => void) => {
      for (const m of cloneMeshes) cb(m);
    });
    const cloned: FakeGroup & { _meshes: FakeMesh[] } = {
      __isGLTFClone: true,
      position: makePos(),
      scale: { set: vi.fn() },
      traverse: cloneTraverse,
      clone: cloneFn,
      _meshes: cloneMeshes,
    };
    return cloned;
  });
  return {
    __isGLTFTemplate: true,
    position: makePos(),
    scale: { set: vi.fn() },
    traverse,
    clone: cloneFn,
    _meshes: meshes,
  };
}

describe('PawnManager — matcher de mesh do corpo (robusto a Blender)', () => {
  let scene: THREE.Scene;
  let theme: BoardTheme;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assets: any;
  let resolveLoad: (g: FakeGroup) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    theme = JSON.parse(JSON.stringify(DEFAULT_THEME)) as BoardTheme;
    theme.pawn.url = '/models/pawn.glb';
    theme.pawn.bodyMaterialName = 'pawn-body';
    assets = {
      loadGLTF: vi.fn().mockImplementation(
        () =>
          new Promise<FakeGroup>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
    };
  });

  it('aceita mesh nomeada exatamente "pawn-body" (caso comum)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    const group = makeFakeGroupWithMeshes(['pawn-body', 'pawn-details']);
    resolveLoad!(group);
    await flushMicrotasks();
    manager.addPawn('p1', 0, 0xff0000);
    const cloned = (group.clone.mock.results[0].value) as FakeGroup & { _meshes: FakeMesh[] };
    const body = cloned._meshes.find((m) => m.name === 'pawn-body');
    expect(body?.material).not.toEqual({ isOriginal: true });
  });

  it('aceita mesh com sufixo Blender ".001" (pawn-body.001)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    const group = makeFakeGroupWithMeshes(['pawn-body.001', 'pawn-details']);
    resolveLoad!(group);
    await flushMicrotasks();
    manager.addPawn('p1', 0, 0xff0000);
    const cloned = (group.clone.mock.results[0].value) as FakeGroup & { _meshes: FakeMesh[] };
    const body = cloned._meshes.find((m) => m.name === 'pawn-body.001');
    expect(body?.material).not.toEqual({ isOriginal: true });
  });

  it('aceita mesh com capitalização diferente (Pawn-Body)', async () => {
    const manager = new PawnManager(scene, theme, assets);
    const group = makeFakeGroupWithMeshes(['Pawn-Body']);
    resolveLoad!(group);
    await flushMicrotasks();
    manager.addPawn('p1', 0, 0xff0000);
    const cloned = (group.clone.mock.results[0].value) as FakeGroup & { _meshes: FakeMesh[] };
    expect(cloned._meshes[0].material).not.toEqual({ isOriginal: true });
  });

  it('sem mesh que case com bodyMeshName, emite console.warn listando os nomes encontrados', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const manager = new PawnManager(scene, theme, assets);
    const group = makeFakeGroupWithMeshes(['Cube', 'Mesh001']);
    resolveLoad!(group);
    await flushMicrotasks();
    manager.addPawn('p1', 0, 0xff0000);
    expect(warn).toHaveBeenCalled();
    const msg = (warn.mock.calls[0]?.[0] ?? '') as string;
    expect(msg).toContain('pawn-body');
    expect(msg).toMatch(/Cube/);
    expect(msg).toMatch(/Mesh001/);
    warn.mockRestore();
  });

  it('NÃO emite warning quando ao menos uma mesh bate', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const manager = new PawnManager(scene, theme, assets);
    const group = makeFakeGroupWithMeshes(['pawn-body', 'pawn-details']);
    resolveLoad!(group);
    await flushMicrotasks();
    manager.addPawn('p1', 0, 0xff0000);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
