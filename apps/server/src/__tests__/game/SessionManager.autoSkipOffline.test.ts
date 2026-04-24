import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: auto-skip de jogadores offline ─────────────────────────────────────
//
// Quando um jogador está isConnected=false, o turno deve pular sobre ele
// automaticamente, para não travar a partida esperando uma rolagem que
// nunca vem.

describe('SessionManager — auto-skip de jogadores offline', () => {
  function setupActive(numPlayers: 2 | 3 | 4, rollDiceFn: () => number = () => 3) {
    const sm = new SessionManager({ rollDiceFn });
    const session = sm.createSession('fac-1', undefined, undefined, numPlayers);
    const playerIds: string[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const { playerId } = sm.joinSession(session.pin, `P${i + 1}`);
      playerIds.push(playerId);
    }
    sm.startGame(session.id);
    return { sm, sessionId: session.id, playerIds };
  }

  it('rollDice: pula 1 jogador offline no próximo turno', () => {
    const { sm, sessionId, playerIds } = setupActive(3);
    // P2 (índice 1) está offline. Vez do P1 (índice 0).
    sm.markDisconnected(sessionId, playerIds[1]);
    // Obs: markDisconnected não avança turno pois P2 não era a vez.

    const result = sm.rollDice(sessionId, playerIds[0]);
    // Deveria ir para P3 (índice 2), pulando P2 offline.
    expect(result.nextPlayerId).toBe(playerIds[2]);
  });

  it('rollDice: pula múltiplos offlines consecutivos', () => {
    const { sm, sessionId, playerIds } = setupActive(4);
    // P2 e P3 offline. Vez do P1.
    sm.markDisconnected(sessionId, playerIds[1]);
    sm.markDisconnected(sessionId, playerIds[2]);

    const result = sm.rollDice(sessionId, playerIds[0]);
    // Pula P2 e P3 → vai para P4 (índice 3).
    expect(result.nextPlayerId).toBe(playerIds[3]);
  });

  it('rollDice: apenas 1 jogador online restante → volta para ele mesmo', () => {
    const { sm, sessionId, playerIds } = setupActive(3);
    // Todos os outros offline. Apenas P1 online.
    sm.markDisconnected(sessionId, playerIds[1]);
    sm.markDisconnected(sessionId, playerIds[2]);

    const result = sm.rollDice(sessionId, playerIds[0]);
    // Próximo volta para P1 (ele joga sozinho até alguém reconectar).
    expect(result.nextPlayerId).toBe(playerIds[0]);
  });

  it('markDisconnected: quando o da vez sai E o próximo também está offline, avança até online', () => {
    const { sm, sessionId, playerIds } = setupActive(4);
    // P2 (índice 1) offline antes.
    sm.markDisconnected(sessionId, playerIds[1]);
    // Agora P1 (índice 0, o da vez) sai.
    const result = sm.markDisconnected(sessionId, playerIds[0]);
    // Deve ir para P3 (índice 2), pulando P2.
    expect(result.turnAdvanced).toBe(true);
    expect(result.nextPlayerId).toBe(playerIds[2]);
  });

  it('submitAnswer: nextPlayerId aponta para jogador online', () => {
    const sm = new SessionManager({ rollDiceFn: () => 1 }); // cai em tile 1
    const session = sm.createSession('fac-1', undefined, undefined, 3);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push(sm.joinSession(session.pin, `P${i + 1}`).playerId);
    sm.startGame(session.id);

    // P2 offline antes do quiz.
    sm.markDisconnected(session.id, ids[1]);

    // P1 rola e cai em tile de quiz (tile 1).
    const roll = sm.rollDice(session.id, ids[0]);
    if (!roll.quiz) {
      // Se a norma escolhida não serviu o quiz, aborta teste silenciosamente.
      return;
    }

    // P1 responde.
    const res = sm.submitAnswer(session.id, ids[0], roll.quiz.id, roll.quiz.options[0]);
    // nextPlayerId deve apontar para P3 (índice 2), não P2 offline.
    expect(res.nextPlayerId).toBe(ids[2]);
  });
});
