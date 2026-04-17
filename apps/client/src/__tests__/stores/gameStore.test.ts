import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import type { GameSession, GameResultPayload, LeaderboardEntry } from '@safety-board/shared';

// ─── RED: falha até gameStore.ts ser implementado ────────────────────────────

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      session: null,
      myPlayerId: null,
      currentPlayer: null,
      isMyTurn: false,
      pendingName: null,
      pendingAvatarId: null,
      gameResult: null,
      leaderboardEntries: [],
    });
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

  it('setPendingPlayer armazena nome e avatarId', () => {
    useGameStore.getState().setPendingPlayer('Alice Silva', 'avatar-3');

    expect(useGameStore.getState().pendingName).toBe('Alice Silva');
    expect(useGameStore.getState().pendingAvatarId).toBe('avatar-3');
  });

  it('setPendingPlayer sobrescreve valores anteriores', () => {
    useGameStore.getState().setPendingPlayer('Alice', 'avatar-1');
    useGameStore.getState().setPendingPlayer('Bob', 'avatar-2');

    expect(useGameStore.getState().pendingName).toBe('Bob');
    expect(useGameStore.getState().pendingAvatarId).toBe('avatar-2');
  });

  it('setGameResult armazena o resultado da partida', () => {
    const result: Partial<GameResultPayload> = {
      sessionId: 'sess-1',
      durationSeconds: 120,
      players: [
        { playerId: 'p1', name: 'Alice', score: 80, rank: 1, finalPosition: 5, correctAnswers: 4, totalAnswers: 5 },
      ],
    };

    useGameStore.getState().setGameResult(result as GameResultPayload);

    expect(useGameStore.getState().gameResult?.sessionId).toBe('sess-1');
    expect(useGameStore.getState().gameResult?.durationSeconds).toBe(120);
    expect(useGameStore.getState().gameResult?.players).toHaveLength(1);
  });

  it('setLeaderboardEntries armazena lista de entradas', () => {
    const entries: LeaderboardEntry[] = [
      { playerId: 'p1', name: 'Alice', totalScore: 500, rank: 1, gamesPlayed: 5 },
      { playerId: 'p2', name: 'Bob', totalScore: 400, rank: 2, gamesPlayed: 4 },
    ];

    useGameStore.getState().setLeaderboardEntries(entries);

    expect(useGameStore.getState().leaderboardEntries).toHaveLength(2);
    expect(useGameStore.getState().leaderboardEntries[0].name).toBe('Alice');
  });

  it('setLeaderboardEntries sobrescreve entradas anteriores', () => {
    const e1: LeaderboardEntry[] = [{ playerId: 'p1', name: 'Alice', totalScore: 500, rank: 1, gamesPlayed: 5 }];
    const e2: LeaderboardEntry[] = [];

    useGameStore.getState().setLeaderboardEntries(e1);
    useGameStore.getState().setLeaderboardEntries(e2);

    expect(useGameStore.getState().leaderboardEntries).toHaveLength(0);
  });
});
