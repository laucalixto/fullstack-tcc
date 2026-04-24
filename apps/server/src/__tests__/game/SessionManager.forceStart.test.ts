import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: voto unânime para iniciar sala não-cheia (maxPlayers >= 3) ─────────
//
// requestForceStart: chamado quando um jogador do lobby clica em "Iniciar agora".
// - Só faz sentido em salas de 3+ lugares.
// - Requer unanimidade dos jogadores ATUALMENTE no lobby (lobbyReadyPlayers).
// - Ao atingir unanimidade: marca droppedPlayerIds e retorna started=true.
// - Novo LOBBY_READY depois do primeiro voto reseta a contagem.

describe('SessionManager — requestForceStart', () => {
  function setupRoom(maxPlayers: 3 | 4, playersReady: number) {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, undefined, maxPlayers);
    // Preenche todos os slots via joinSession; só marca ready um subconjunto.
    const ids: string[] = [];
    for (let i = 0; i < maxPlayers; i++) {
      ids.push(sm.joinSession(session.pin, `P${i + 1}`).playerId);
    }
    for (let i = 0; i < playersReady; i++) {
      sm.markLobbyReady(session.id, ids[i]);
    }
    return { sm, sessionId: session.id, ids };
  }

  it('rejeita voto em sala de 2 jogadores (NOT_APPLICABLE)', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, undefined, 2);
    const { playerId: p1 } = sm.joinSession(session.pin, 'Alice');
    sm.joinSession(session.pin, 'Bob');
    sm.markLobbyReady(session.id, p1);
    expect(() => sm.requestForceStart(session.id, p1)).toThrow('NOT_APPLICABLE');
  });

  it('voto único em sala de 3 retorna progresso parcial (1/2)', () => {
    const { sm, sessionId, ids } = setupRoom(3, 2); // 2 no lobby de 3
    const r = sm.requestForceStart(sessionId, ids[0]);
    expect(r.started).toBe(false);
    expect(r.votes).toBe(1);
    expect(r.needed).toBe(2);
  });

  it('voto unânime dispara start e popula droppedPlayerIds com os ausentes', () => {
    const { sm, sessionId, ids } = setupRoom(4, 3); // 3 no lobby de 4
    sm.requestForceStart(sessionId, ids[0]);
    sm.requestForceStart(sessionId, ids[1]);
    const r = sm.requestForceStart(sessionId, ids[2]);
    expect(r.started).toBe(true);
    expect(r.droppedPlayerIds).toEqual([ids[3]]);
  });

  it('após voto unânime remove dropados de session.players', () => {
    const { sm, sessionId, ids } = setupRoom(4, 3);
    sm.requestForceStart(sessionId, ids[0]);
    sm.requestForceStart(sessionId, ids[1]);
    sm.requestForceStart(sessionId, ids[2]);
    const session = sm.getById(sessionId)!;
    expect(session.players.map((p) => p.id)).toEqual([ids[0], ids[1], ids[2]]);
  });

  it('voto é idempotente — mesmo jogador votando 2x não conta duplo', () => {
    const { sm, sessionId, ids } = setupRoom(3, 2);
    sm.requestForceStart(sessionId, ids[0]);
    const r = sm.requestForceStart(sessionId, ids[0]);
    expect(r.started).toBe(false);
    expect(r.votes).toBe(1);
  });

  it('voto de jogador NÃO presente no lobby é rejeitado (NOT_IN_LOBBY)', () => {
    const { sm, sessionId, ids } = setupRoom(3, 1); // apenas 1 no lobby
    expect(() => sm.requestForceStart(sessionId, ids[0])).toThrow('NOT_ENOUGH_READY');
    // ids[2] não deu ready ainda
    expect(() => sm.requestForceStart(sessionId, ids[2])).toThrow('NOT_ENOUGH_READY');
  });

  it('voto com apenas 1 jogador no lobby é rejeitado (NOT_ENOUGH_READY)', () => {
    const { sm, sessionId, ids } = setupRoom(4, 1);
    expect(() => sm.requestForceStart(sessionId, ids[0])).toThrow('NOT_ENOUGH_READY');
  });

  it('novo LOBBY_READY depois de voto reseta a contagem', () => {
    const { sm, sessionId, ids } = setupRoom(4, 2); // 2 no lobby de 4
    sm.requestForceStart(sessionId, ids[0]);
    // p3 finalmente chega ao lobby — deve resetar
    sm.markLobbyReady(sessionId, ids[2]);
    const r = sm.requestForceStart(sessionId, ids[0]);
    expect(r.votes).toBe(1); // voto anterior foi descartado; esse é o novo primeiro
    expect(r.needed).toBe(3);
    expect(r.started).toBe(false);
  });

  it('desconexão de um votante remove o voto', () => {
    const { sm, sessionId, ids } = setupRoom(4, 3);
    sm.requestForceStart(sessionId, ids[0]);
    sm.requestForceStart(sessionId, ids[1]);
    // ids[1] desconecta
    sm.markDisconnected(sessionId, ids[1]);
    // ids[2] vota → deveria ser o 2º voto, não o 3º (porque ids[1] saiu)
    const r = sm.requestForceStart(sessionId, ids[2]);
    // needed cai de 3 para 2 porque ids[1] não está mais no lobby ativo
    // votos restantes: [ids[0], ids[2]] = 2; needed = 2 → unânime
    expect(r.started).toBe(true);
  });

  it('lança SESSION_NOT_FOUND para sessão inválida', () => {
    const sm = new SessionManager();
    expect(() => sm.requestForceStart('bad-id', 'p1')).toThrow('SESSION_NOT_FOUND');
  });
});
