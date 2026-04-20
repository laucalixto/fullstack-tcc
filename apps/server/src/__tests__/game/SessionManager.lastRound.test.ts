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

// ─── RED: falha até implementação da última rodada ────────────────────────────

describe('SessionManager — última rodada (last round)', () => {
  it('jogador não-último chega ao tile 39: gameOver não é retornado', () => {
    const { sm, id, playerIds } = makeGame(3, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33; // 33 + 6 = 39

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.newPosition).toBe(39);
    expect(result.gameOver).toBeUndefined();
  });

  it('jogador não-último chega ao tile 39: finishCandidateId é registrado na sessão', () => {
    const { sm, id, playerIds } = makeGame(3, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33;

    sm.rollDice(id, playerIds[0]);

    expect(session.finishCandidateId).toBe(playerIds[0]);
  });

  it('jogo continua normalmente: TURN_CHANGED esperado (nextPlayerId é o próximo)', () => {
    const { sm, id, playerIds } = makeGame(3, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33;

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.nextPlayerId).toBe(playerIds[1]);
  });

  it('último jogador da rodada chega ao tile 39: gameOver é retornado imediatamente', () => {
    const { sm, id, playerIds } = makeGame(3, 1);
    const session = sm.getById(id)!;

    sm.rollDice(id, playerIds[0]); // P0 → P1
    sm.rollDice(id, playerIds[1]); // P1 → P2

    session.players[2].position = 38; // P2 (índice 2 = último de 3)

    const result = sm.rollDice(id, playerIds[2]);

    expect(result.newPosition).toBe(39);
    expect(result.gameOver).toBe(true);
  });

  it('jogo de 2 jogadores: P0 chega ao final, P1 ainda joga antes do game over', () => {
    const { sm, id, playerIds } = makeGame(2, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33; // P0 vai a 39

    const result0 = sm.rollDice(id, playerIds[0]);
    expect(result0.gameOver).toBeUndefined(); // P1 ainda joga

    // P1 joga → agora sim game over
    const result1 = sm.rollDice(id, playerIds[1]);
    expect(result1.gameOver).toBe(true);
  });

  it('jogador intermediário joga após finishCandidateId setado: não é game over', () => {
    const { sm, id, playerIds } = makeGame(3, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33; // P0 vai a 39

    sm.rollDice(id, playerIds[0]); // P0 chega ao final → finishCandidateId = P0

    session.players[1].position = 0; // P1 em casa 0
    const result1 = sm.rollDice(id, playerIds[1]); // P1 ainda não é o último (P2 falta)

    expect(result1.gameOver).toBeUndefined();
  });

  it('último jogador joga após finishCandidateId setado: gameOver retornado', () => {
    const { sm, id, playerIds } = makeGame(3, 1);
    const session = sm.getById(id)!;
    session.players[0].position = 38; // P0 vai a 39 com dado=1

    sm.rollDice(id, playerIds[0]); // P0 → 39, finishCandidateId setado
    sm.rollDice(id, playerIds[1]); // P1 joga (não é o último de 3)

    const result2 = sm.rollDice(id, playerIds[2]); // P2 é o último → game over

    expect(result2.gameOver).toBe(true);
  });

  it('segundo jogador também chega ao tile 39 (mas não é o último): continua', () => {
    const { sm, id, playerIds } = makeGame(3, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33; // P0 → 39
    session.players[1].position = 33; // P1 → 39 também

    sm.rollDice(id, playerIds[0]); // P0 chega ao final

    const result1 = sm.rollDice(id, playerIds[1]); // P1 também chega, mas P2 ainda falta

    expect(result1.gameOver).toBeUndefined();
  });

  it('segundo jogador também chega ao tile 39 e é o último: game over', () => {
    const { sm, id, playerIds } = makeGame(2, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33; // P0 → 39
    session.players[1].position = 33; // P1 → 39 (é o último)

    sm.rollDice(id, playerIds[0]); // P0 chega → finishCandidateId setado

    const result1 = sm.rollDice(id, playerIds[1]); // P1 chega e é o último

    expect(result1.gameOver).toBe(true);
  });

  it('jogo de 1 jogador: chegar ao tile 39 encerra imediatamente', () => {
    const { sm, id, playerIds } = makeGame(1, 6);
    const session = sm.getById(id)!;
    session.players[0].position = 33;

    const result = sm.rollDice(id, playerIds[0]);

    expect(result.gameOver).toBe(true);
  });
});
