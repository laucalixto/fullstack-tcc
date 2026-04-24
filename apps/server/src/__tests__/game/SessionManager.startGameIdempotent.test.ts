import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: startGame idempotente ──────────────────────────────────────────────
//
// Bug observado: LOBBY_READY pode agendar múltiplos setTimeouts de startGame.
// A segunda chamada sobrescreve session.currentPlayerIndex e entry.turnManager
// ANTES de lançar (o throw só vem no fsm.dispatch). Resultado: sorteio visual
// mostra X mas o jogo começa com Y porque o segundo startGame sorteou outro.
//
// startGame deve ser idempotente: se a sessão já está ACTIVE, retorna a sessão
// sem alterar estado.

describe('SessionManager — startGame idempotente', () => {
  function setup() {
    // randomIndexFn muda entre chamadas para detectar sobrescrita
    let callCount = 0;
    const randomIndexFn = () => {
      callCount++;
      return callCount === 1 ? 2 : 0; // 1ª chamada: índice 2; 2ª: índice 0
    };
    const sm = new SessionManager({ randomIndexFn });
    const session = sm.createSession('fac-1', undefined, undefined, 4);
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      ids.push(sm.joinSession(session.pin, `P${i + 1}`).playerId);
    }
    return { sm, sessionId: session.id, ids };
  }

  it('segunda chamada não altera currentPlayerIndex', () => {
    const { sm, sessionId } = setup();
    const first = sm.startGame(sessionId);
    const firstIndex = first.currentPlayerIndex;
    expect(firstIndex).toBe(2); // da primeira chamada do mock

    sm.startGame(sessionId); // deve ser no-op
    const session = sm.getById(sessionId)!;
    expect(session.currentPlayerIndex).toBe(firstIndex);
  });

  it('segunda chamada não recria o turnManager', () => {
    const { sm, sessionId, ids } = setup();
    sm.startGame(sessionId);
    // Rolagem deve usar o turnManager original (quem está na vez = ids[2])
    expect(() => sm.rollDice(sessionId, ids[2])).not.toThrow();

    sm.startGame(sessionId); // no-op

    // Após o rollDice, o turno já avançou; não deve voltar ao índice 2.
    const session = sm.getById(sessionId)!;
    expect(session.currentPlayerIndex).not.toBe(2);
  });

  it('segunda chamada retorna a mesma sessão sem alterar estado', () => {
    const { sm, sessionId } = setup();
    const first = sm.startGame(sessionId);
    const second = sm.startGame(sessionId);
    expect(second.currentPlayerIndex).toBe(first.currentPlayerIndex);
    expect(second.state).toBe('ACTIVE');
  });
});
