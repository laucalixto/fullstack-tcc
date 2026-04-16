import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import type { GameSession } from '@safety-board/shared';

// ─── RED: falha até gameStore.ts ser implementado ────────────────────────────

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store ao estado inicial antes de cada teste
    useGameStore.setState({ session: null, myPlayerId: null, currentPlayer: null, isMyTurn: false });
  });

  it('estado inicial: session null e myPlayerId null', () => {
    const { session, myPlayerId } = useGameStore.getState();
    expect(session).toBeNull();
    expect(myPlayerId).toBeNull();
  });

  it('setSession atualiza a sessão no store', () => {
    const fakeSession: Partial<GameSession> = {
      id: 'sess-1',
      pin: '123456',
      state: 'WAITING',
      players: [],
    };

    useGameStore.getState().setSession(fakeSession as GameSession);

    expect(useGameStore.getState().session).toEqual(fakeSession);
  });

  it('setMyPlayerId atualiza o playerId no store', () => {
    useGameStore.getState().setMyPlayerId('player-abc');

    expect(useGameStore.getState().myPlayerId).toBe('player-abc');
  });

  it('setSession sobrescreve sessão anterior', () => {
    const s1: Partial<GameSession> = { id: 'sess-1', state: 'WAITING', players: [] };
    const s2: Partial<GameSession> = { id: 'sess-2', state: 'ACTIVE', players: [] };

    useGameStore.getState().setSession(s1 as GameSession);
    useGameStore.getState().setSession(s2 as GameSession);

    expect(useGameStore.getState().session?.id).toBe('sess-2');
    expect(useGameStore.getState().session?.state).toBe('ACTIVE');
  });

  it('currentPlayer retorna null quando não há sessão', () => {
    expect(useGameStore.getState().currentPlayer).toBeNull();
  });

  it('currentPlayer retorna jogador da vez quando sessão está ativa', () => {
    const fakeSession: Partial<GameSession> = {
      id: 'sess-1',
      state: 'ACTIVE',
      currentPlayerIndex: 0,
      players: [
        { id: 'p1', name: 'Alice', position: 0, score: 0, isConnected: true },
        { id: 'p2', name: 'Bob', position: 0, score: 0, isConnected: true },
      ],
    };

    useGameStore.getState().setSession(fakeSession as GameSession);

    expect(useGameStore.getState().currentPlayer?.id).toBe('p1');
  });

  it('isMyTurn é false quando myPlayerId não está definido', () => {
    const fakeSession: Partial<GameSession> = {
      id: 'sess-1',
      state: 'ACTIVE',
      currentPlayerIndex: 0,
      players: [{ id: 'p1', name: 'Alice', position: 0, score: 0, isConnected: true }],
    };
    useGameStore.getState().setSession(fakeSession as GameSession);

    expect(useGameStore.getState().isMyTurn).toBe(false);
  });

  it('isMyTurn é true quando myPlayerId coincide com jogador atual', () => {
    const fakeSession: Partial<GameSession> = {
      id: 'sess-1',
      state: 'ACTIVE',
      currentPlayerIndex: 0,
      players: [{ id: 'p1', name: 'Alice', position: 0, score: 0, isConnected: true }],
    };
    useGameStore.getState().setSession(fakeSession as GameSession);
    useGameStore.getState().setMyPlayerId('p1');

    expect(useGameStore.getState().isMyTurn).toBe(true);
  });

  it('isMyTurn é false quando é o turno de outro jogador', () => {
    const fakeSession: Partial<GameSession> = {
      id: 'sess-1',
      state: 'ACTIVE',
      currentPlayerIndex: 0,
      players: [
        { id: 'p1', name: 'Alice', position: 0, score: 0, isConnected: true },
        { id: 'p2', name: 'Bob', position: 0, score: 0, isConnected: true },
      ],
    };
    useGameStore.getState().setSession(fakeSession as GameSession);
    useGameStore.getState().setMyPlayerId('p2');

    expect(useGameStore.getState().isMyTurn).toBe(false);
  });
});
