import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../stores/playerStore';

// ─── RED: falha até playerStore.ts ser implementado ──────────────────────────

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      token: null,
      playerId: null,
      name: null,
      email: null,
      totalScore: 0,
    });
  });

  it('estado inicial: sem autenticação', () => {
    const state = usePlayerStore.getState();
    expect(state.token).toBeNull();
    expect(state.playerId).toBeNull();
    expect(state.name).toBeNull();
    expect(state.email).toBeNull();
    expect(state.totalScore).toBe(0);
  });

  it('setPlayer preenche todos os campos', () => {
    usePlayerStore.getState().setPlayer({
      token: 'tok-abc',
      playerId: 'pid-123',
      name: 'Ana Silva',
      email: 'ana@test.com',
      industrialUnit: 'unidade-sp',
      totalScore: 350,
    });
    const state = usePlayerStore.getState();
    expect(state.token).toBe('tok-abc');
    expect(state.playerId).toBe('pid-123');
    expect(state.name).toBe('Ana Silva');
    expect(state.email).toBe('ana@test.com');
    expect(state.industrialUnit).toBe('unidade-sp');
    expect(state.totalScore).toBe(350);
  });

  it('clearPlayer zera todos os campos', () => {
    usePlayerStore.getState().setPlayer({
      token: 'tok-abc',
      playerId: 'pid-123',
      name: 'Ana Silva',
      email: 'ana@test.com',
      industrialUnit: 'unidade-sp',
      totalScore: 350,
    });
    usePlayerStore.getState().clearPlayer();
    const state = usePlayerStore.getState();
    expect(state.token).toBeNull();
    expect(state.playerId).toBeNull();
    expect(state.name).toBeNull();
    expect(state.email).toBeNull();
    expect(state.industrialUnit).toBeNull();
    expect(state.totalScore).toBe(0);
  });

  it('isAuthenticated é false sem token', () => {
    expect(usePlayerStore.getState().isAuthenticated()).toBe(false);
  });

  it('isAuthenticated é true com token e playerId', () => {
    usePlayerStore.getState().setPlayer({
      token: 'tok-abc',
      playerId: 'pid-123',
      name: 'Ana Silva',
      email: 'ana@test.com',
      industrialUnit: 'unidade-sp',
      totalScore: 0,
    });
    expect(usePlayerStore.getState().isAuthenticated()).toBe(true);
  });

  it('updateScore altera totalScore sem limpar outros campos', () => {
    usePlayerStore.getState().setPlayer({
      token: 'tok-abc',
      playerId: 'pid-123',
      name: 'Ana Silva',
      email: 'ana@test.com',
      industrialUnit: 'unidade-sp',
      totalScore: 100,
    });
    usePlayerStore.getState().updateScore(500);
    expect(usePlayerStore.getState().totalScore).toBe(500);
    expect(usePlayerStore.getState().name).toBe('Ana Silva');
  });
});
