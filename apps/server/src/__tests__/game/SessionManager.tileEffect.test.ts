import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeGame(playerCount: number, rollAlways: number) {
  const sm = new SessionManager({ rollDiceFn: () => rollAlways });
  const { pin, id } = sm.createSession('fac-1');
  const playerIds: string[] = [];
  for (let i = 0; i < playerCount; i++) {
    const { playerId } = sm.joinSession(pin, `P${i}`);
    playerIds.push(playerId);
  }
  sm.startGame(id);
  return { sm, id, playerIds };
}

// ─── RED: falha até implementação das casas especiais ────────────────────────

describe('SessionManager — casas especiais (tile effects)', () => {
  it('rollDice em casa de efeito retorna tileEffect no resultado', () => {
    // Casa 3 = accident (−3 casas, −20 pts)
    const { sm, id, playerIds } = makeGame(2, 3); // dado=3 → P0 vai para casa 3
    const session = sm.getById(id)!;
    session.players[0].position = 0;

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.newPosition).toBe(3);
    expect(result.tileEffect).toBeDefined();
    expect(result.tileEffect?.type).toBe('accident');
    expect(result.tileEffect?.title).toBe('Objeto em queda!');
  });

  it('rollDice em casa normal não retorna tileEffect', () => {
    // Casa 1 = normal
    const { sm, id, playerIds } = makeGame(2, 1);

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.newPosition).toBe(1);
    expect(result.tileEffect).toBeUndefined();
  });

  it('rollDice em casa de efeito NÃO emite TURN_CHANGED (aguarda ACK)', () => {
    // O resultado pendingTileEffect deve ser setado e nextPlayerId preservado
    const { sm, id, playerIds } = makeGame(2, 3);

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.tileEffect).toBeDefined();
    expect(result.nextPlayerId).toBe(playerIds[1]); // preservado para depois do ACK
  });

  it('applyTileEffect aplica deltaPosition corretamente (accident: volta casas)', () => {
    // Casa 3 = accident, deltaPosition = -3 → de 3 volta para 0
    const { sm, id, playerIds } = makeGame(2, 3);
    sm.rollDice(id, playerIds[0]); // P0 → casa 3, tileEffect pendente

    sm.applyTileEffect(id, playerIds[0]);

    const session = sm.getById(id)!;
    expect(session.players[0].position).toBe(0); // 3 + (-3) = 0
  });

  it('applyTileEffect aplica deltaScore corretamente (accident: perde pontos)', () => {
    const { sm, id, playerIds } = makeGame(2, 3);
    sm.rollDice(id, playerIds[0]);

    sm.applyTileEffect(id, playerIds[0]);

    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(-20); // deltaScore = -20
  });

  it('applyTileEffect aplica deltaPosition para prevention (avança casas)', () => {
    // Casa 2 = prevention, deltaPosition = +3 → de 2 vai para 5
    const { sm, id, playerIds } = makeGame(2, 2);
    sm.rollDice(id, playerIds[0]);

    sm.applyTileEffect(id, playerIds[0]);

    const session = sm.getById(id)!;
    expect(session.players[0].position).toBe(5); // 2 + 3 = 5
  });

  it('applyTileEffect retorna nextPlayerId para emitir TURN_CHANGED', () => {
    const { sm, id, playerIds } = makeGame(2, 3);
    sm.rollDice(id, playerIds[0]);

    const { nextPlayerId } = sm.applyTileEffect(id, playerIds[0]);

    expect(nextPlayerId).toBe(playerIds[1]);
  });

  it('applyTileEffect back-to-start move peão para casa 0', () => {
    // Casa 10 = back-to-start
    const { sm, id, playerIds } = makeGame(2, 1);
    const session = sm.getById(id)!;
    session.players[0].position = 9; // +1 = 10

    sm.rollDice(id, playerIds[0]);
    sm.applyTileEffect(id, playerIds[0]);

    expect(session.players[0].position).toBe(0);
  });

  it('applyTileEffect skip-turn marca skipNextTurn no jogador', () => {
    // Casa 13 = skip-turn
    const { sm, id, playerIds } = makeGame(2, 1);
    const session = sm.getById(id)!;
    session.players[0].position = 12; // +1 = 13

    sm.rollDice(id, playerIds[0]);
    sm.applyTileEffect(id, playerIds[0]);

    expect(session.players[0].skipNextTurn).toBe(true);
  });

  it('rollDice pula turno do jogador com skipNextTurn=true', () => {
    // Ordem: P0 → P1 → P2 → (P0 com skip) → P1
    const { sm, id, playerIds } = makeGame(3, 1);
    const session = sm.getById(id)!;
    session.players[0].position = 12; // P0 → casa 13 (skip-turn)

    sm.rollDice(id, playerIds[0]); // P0 cai em skip-turn
    sm.applyTileEffect(id, playerIds[0]); // P0.skipNextTurn = true

    sm.rollDice(id, playerIds[1]); // P1 joga → próximo seria P2
    const result = sm.rollDice(id, playerIds[2]); // P2 joga → próximo seria P0, mas P0 tem skip → vai para P1

    expect(session.players[0].skipNextTurn).toBe(false); // flag limpa após skip
    expect(result.nextPlayerId).toBe(playerIds[1]); // P0 foi pulado, próximo é P1
  });

  it('applyTileEffect clamp: posição não vai abaixo de 0', () => {
    // Casa 3 (deltaPosition=-3), partindo de 3 → resultado = 0 (não negativo)
    const { sm, id, playerIds } = makeGame(2, 3);
    sm.rollDice(id, playerIds[0]);
    sm.applyTileEffect(id, playerIds[0]);

    const session = sm.getById(id)!;
    expect(session.players[0].position).toBeGreaterThanOrEqual(0);
  });

  it('applyTileEffect lança erro se não houver efeito pendente', () => {
    const { sm, id, playerIds } = makeGame(2, 1); // casa 1 = normal
    sm.rollDice(id, playerIds[0]);

    expect(() => sm.applyTileEffect(id, playerIds[0])).toThrow('NO_PENDING_TILE_EFFECT');
  });

  it('applyTileEffect lança NOT_YOUR_TURN para jogador errado', () => {
    const { sm, id, playerIds } = makeGame(2, 3);
    sm.rollDice(id, playerIds[0]);

    expect(() => sm.applyTileEffect(id, playerIds[1])).toThrow('NOT_YOUR_TURN');
  });
});
