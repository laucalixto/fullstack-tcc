import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: sorteio do primeiro jogador ────────────────────────────────────────
//
// Hoje, startGame sempre escolhe players[0] como primeiro. Queremos:
// - sortear um índice aleatório entre 0..players.length-1
// - fonte de aleatoriedade injetável para testes determinísticos
// - session.currentPlayerIndex e TurnManager iniciam a partir desse índice

describe('SessionManager — sorteio do primeiro jogador', () => {
  function setup(maxPlayers: 2 | 3 | 4, randomIndexFn?: (max: number) => number) {
    const sm = new SessionManager({ randomIndexFn });
    const session = sm.createSession('fac-1', undefined, undefined, maxPlayers);
    for (let i = 0; i < maxPlayers; i++) {
      sm.joinSession(session.pin, `P${i + 1}`);
    }
    return { sm, sessionId: session.id, session };
  }

  it('randomIndexFn injetada define currentPlayerIndex', () => {
    const { sm, sessionId } = setup(4, () => 2);
    const session = sm.startGame(sessionId);
    expect(session.currentPlayerIndex).toBe(2);
  });

  it('randomIndexFn é chamada com o tamanho da lista', () => {
    const calls: number[] = [];
    const { sm, sessionId } = setup(3, (max) => { calls.push(max); return 0; });
    sm.startGame(sessionId);
    expect(calls).toEqual([3]);
  });

  it('default (sem injeção) retorna índice dentro do range para 4 jogadores', () => {
    const { sm, sessionId, session } = setup(4);
    const started = sm.startGame(sessionId);
    expect(started.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(started.currentPlayerIndex).toBeLessThan(session.maxPlayers);
  });

  it('TurnManager.next após startGame rotaciona a partir do sorteado', () => {
    const { sm, sessionId } = setup(4, () => 2);
    const session = sm.startGame(sessionId);
    const sortedFirst = session.players[session.currentPlayerIndex];
    expect(sortedFirst.name).toBe('P3');

    // Simula uma rolagem: rollDice usa turnManager.next() internamente.
    // Aqui só validamos o índice inicial.
  });
});
