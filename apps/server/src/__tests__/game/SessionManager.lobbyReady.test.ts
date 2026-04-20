import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: sincronização de lobby e tabuleiro ─────────────────────────────────
//
// markLobbyReady: jogador sinaliza que chegou ao lobby
// markGameReady:  jogador sinaliza que saiu do tutorial e está pronto para o tabuleiro

describe('SessionManager — markLobbyReady', () => {
  function setup(maxPlayers: 2 | 3 | 4 = 2) {
    const sm = new SessionManager();
    const { pin, id } = (sm as any).createSession('fac-1', undefined, undefined, maxPlayers);
    const { playerId: p1 } = sm.joinSession(pin, 'Alice');
    const { playerId: p2 } = sm.joinSession(pin, 'Bob');
    return { sm, id, p1, p2 };
  }

  it('retorna false quando nem todos os jogadores enviaram LOBBY_READY', () => {
    const { sm, id, p1 } = setup(2);
    const allReady = (sm as any).markLobbyReady(id, p1);
    expect(allReady).toBe(false);
  });

  it('retorna true quando todos os jogadores enviaram LOBBY_READY', () => {
    const { sm, id, p1, p2 } = setup(2);
    (sm as any).markLobbyReady(id, p1);
    const allReady = (sm as any).markLobbyReady(id, p2);
    expect(allReady).toBe(true);
  });

  it('lança SESSION_NOT_FOUND para sessão inválida', () => {
    const sm = new SessionManager();
    expect(() => (sm as any).markLobbyReady('bad-id', 'p1')).toThrow('SESSION_NOT_FOUND');
  });

  it('é idempotente — mesmo jogador enviando duas vezes não conta duplo', () => {
    const { sm, id, p1 } = setup(2);
    (sm as any).markLobbyReady(id, p1);
    const stillFalse = (sm as any).markLobbyReady(id, p1); // p2 ainda não enviou
    expect(stillFalse).toBe(false);
  });

  it('retorna true quando todos os jogadores presentes ficam prontos, mesmo com maxPlayers > players.length', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, undefined, 4); // sala para 4
    const { playerId: p1 } = sm.joinSession(session.pin, 'Alice');
    const { playerId: p2 } = sm.joinSession(session.pin, 'Bob');
    // apenas 2 de 4 slots preenchidos
    sm.markLobbyReady(session.id, p1);
    const allReady = sm.markLobbyReady(session.id, p2);
    expect(allReady).toBe(true); // todos os presentes confirmaram
  });
});

describe('SessionManager — markGameReady', () => {
  function setup() {
    const sm = new SessionManager();
    const { pin, id } = (sm as any).createSession('fac-1', undefined, undefined, 2);
    const { playerId: p1 } = sm.joinSession(pin, 'Alice');
    const { playerId: p2 } = sm.joinSession(pin, 'Bob');
    sm.startGame(id);
    return { sm, id, p1, p2 };
  }

  it('retorna false quando nem todos confirmaram prontos para o tabuleiro', () => {
    const { sm, id, p1 } = setup();
    const allReady = (sm as any).markGameReady(id, p1);
    expect(allReady).toBe(false);
  });

  it('retorna true quando todos os jogadores confirmaram PLAYER_GAME_READY', () => {
    const { sm, id, p1, p2 } = setup();
    (sm as any).markGameReady(id, p1);
    const allReady = (sm as any).markGameReady(id, p2);
    expect(allReady).toBe(true);
  });

  it('lança SESSION_NOT_FOUND para sessão inválida', () => {
    const sm = new SessionManager();
    expect(() => (sm as any).markGameReady('bad-id', 'p1')).toThrow('SESSION_NOT_FOUND');
  });

  it('é idempotente — mesmo jogador enviando duas vezes não conta duplo', () => {
    const { sm, id, p1 } = setup();
    (sm as any).markGameReady(id, p1);
    const stillFalse = (sm as any).markGameReady(id, p1);
    expect(stillFalse).toBe(false);
  });
});
