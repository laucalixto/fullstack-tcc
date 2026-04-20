import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: desconexão de jogador ───────────────────────────────────────────────
// markDisconnected deve:
//   1. Marcar player.isConnected = false
//   2. Avançar o turno automaticamente se o jogador desconectado estava na vez
//   3. NÃO avançar o turno se não era a vez do jogador desconectado
//   4. Ser no-op para sessões inativas ou desconhecidas

describe('SessionManager — markDisconnected', () => {
  function setupActive(numPlayers = 2) {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, undefined, numPlayers as 2 | 3 | 4);
    const playerIds: string[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const { playerId } = sm.joinSession(session.pin, `Jogador ${i + 1}`);
      playerIds.push(playerId);
    }
    sm.startGame(session.id);
    return { sm, sessionId: session.id, playerIds };
  }

  it('marca player.isConnected = false', () => {
    const { sm, sessionId, playerIds } = setupActive();
    sm.markDisconnected(sessionId, playerIds[0]);
    const session = sm.getById(sessionId)!;
    expect(session.players.find((p) => p.id === playerIds[0])?.isConnected).toBe(false);
  });

  it('não avança o turno quando jogador desconectado NÃO está na vez', () => {
    const { sm, sessionId, playerIds } = setupActive();
    // currentPlayerIndex = 0 (playerIds[0] está na vez)
    const result = sm.markDisconnected(sessionId, playerIds[1]); // playerIds[1] fora da vez
    expect(result.turnAdvanced).toBe(false);
    expect(result.nextPlayerId).toBeNull();
    const session = sm.getById(sessionId)!;
    expect(session.currentPlayerIndex).toBe(0); // turno inalterado
  });

  it('avança o turno e retorna nextPlayerId quando o jogador na vez se desconecta', () => {
    const { sm, sessionId, playerIds } = setupActive();
    // currentPlayerIndex = 0 → playerIds[0] está na vez
    const result = sm.markDisconnected(sessionId, playerIds[0]);
    expect(result.turnAdvanced).toBe(true);
    expect(result.nextPlayerId).toBe(playerIds[1]);
    const session = sm.getById(sessionId)!;
    expect(session.players[session.currentPlayerIndex].id).toBe(playerIds[1]);
  });

  it('avança corretamente em partida com 3 jogadores', () => {
    const { sm, sessionId, playerIds } = setupActive(3);
    // currentIndex = 0
    const result = sm.markDisconnected(sessionId, playerIds[0]);
    expect(result.turnAdvanced).toBe(true);
    expect(result.nextPlayerId).toBe(playerIds[1]);
  });

  it('retorna no-op para sessão em estado WAITING', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, undefined, 2);
    const { playerId } = sm.joinSession(session.pin, 'Alice');
    const result = sm.markDisconnected(session.id, playerId);
    expect(result.turnAdvanced).toBe(false);
    expect(result.nextPlayerId).toBeNull();
  });

  it('retorna no-op para sessão desconhecida', () => {
    const sm = new SessionManager();
    const result = sm.markDisconnected('bad-id', 'p1');
    expect(result.turnAdvanced).toBe(false);
    expect(result.nextPlayerId).toBeNull();
  });
});
