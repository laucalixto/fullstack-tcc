import { describe, it, expect, beforeEach } from 'vitest';
import { useManagerStore } from '../../stores/managerStore';
import type { DashboardStats, SessionSummary } from '@safety-board/shared';

describe('managerStore', () => {
  beforeEach(() => {
    useManagerStore.setState({
      token: null,
      stats: null,
      recentSessions: [],
      generatedPin: null,
      shareLink: null,
      isLoading: false,
      error: null,
    });
  });

  it('estado inicial: token null e isLoading false', () => {
    const { token, isLoading } = useManagerStore.getState();
    expect(token).toBeNull();
    expect(isLoading).toBe(false);
  });

  it('setToken armazena o token', () => {
    useManagerStore.getState().setToken('jwt-abc-123');
    expect(useManagerStore.getState().token).toBe('jwt-abc-123');
  });

  it('setToken aceita null (logout)', () => {
    useManagerStore.getState().setToken('jwt-abc-123');
    useManagerStore.getState().setToken(null);
    expect(useManagerStore.getState().token).toBeNull();
  });

  it('setStats armazena estatísticas do dashboard', () => {
    const stats: DashboardStats = { totalPlayers: 50, avgScore: 75, completionRate: 0.9, activeSessions: 2 };
    useManagerStore.getState().setStats(stats);

    expect(useManagerStore.getState().stats?.totalPlayers).toBe(50);
    expect(useManagerStore.getState().stats?.avgScore).toBe(75);
  });

  it('setRecentSessions armazena sessões recentes', () => {
    const sessions: SessionSummary[] = [
      { id: 's1', pin: '111111', date: '2026-04-01', group: 'Turma A', avgScore: 80, status: 'completed' },
      { id: 's2', pin: '222222', date: '2026-04-10', group: 'Turma B', avgScore: null, status: 'active' },
    ];
    useManagerStore.getState().setRecentSessions(sessions);

    expect(useManagerStore.getState().recentSessions).toHaveLength(2);
    expect(useManagerStore.getState().recentSessions[0].id).toBe('s1');
  });

  it('setRecentSessions sobrescreve lista anterior', () => {
    const s1: SessionSummary[] = [
      { id: 's1', pin: '111111', date: '2026-04-01', group: 'Turma A', avgScore: 80, status: 'completed' },
    ];
    useManagerStore.getState().setRecentSessions(s1);
    useManagerStore.getState().setRecentSessions([]);

    expect(useManagerStore.getState().recentSessions).toHaveLength(0);
  });

  it('setNewSession armazena pin e shareLink gerados', () => {
    useManagerStore.getState().setNewSession('123456', 'https://app.example.com/join/123456');

    expect(useManagerStore.getState().generatedPin).toBe('123456');
    expect(useManagerStore.getState().shareLink).toBe('https://app.example.com/join/123456');
  });

  it('setLoading altera estado de carregamento', () => {
    useManagerStore.getState().setLoading(true);
    expect(useManagerStore.getState().isLoading).toBe(true);

    useManagerStore.getState().setLoading(false);
    expect(useManagerStore.getState().isLoading).toBe(false);
  });

  it('setError armazena mensagem de erro', () => {
    useManagerStore.getState().setError('Credenciais inválidas');
    expect(useManagerStore.getState().error).toBe('Credenciais inválidas');
  });

  it('setError aceita null para limpar o erro', () => {
    useManagerStore.getState().setError('algum erro');
    useManagerStore.getState().setError(null);
    expect(useManagerStore.getState().error).toBeNull();
  });

  it('logout limpa token, stats, sessões, pin e shareLink', () => {
    useManagerStore.setState({
      token: 'jwt-xyz',
      stats: { totalPlayers: 10, avgScore: 60, completionRate: 0.5, activeSessions: 1 },
      recentSessions: [{ id: 's1', pin: '111111', date: '2026-04-01', group: 'G', avgScore: null, status: 'completed' }],
      generatedPin: '999888',
      shareLink: 'https://example.com/join/999888',
    });

    useManagerStore.getState().logout();

    const { token, stats, recentSessions, generatedPin, shareLink } = useManagerStore.getState();
    expect(token).toBeNull();
    expect(stats).toBeNull();
    expect(recentSessions).toHaveLength(0);
    expect(generatedPin).toBeNull();
    expect(shareLink).toBeNull();
  });
});
