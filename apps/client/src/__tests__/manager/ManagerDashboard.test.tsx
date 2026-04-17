import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagerDashboard } from '../../manager/ManagerDashboard';
import type { DashboardStats, SessionSummary } from '@safety-board/shared';

// ─── RED: falha até ManagerDashboard.tsx ser implementado ────────────────────

const makeStats = (): DashboardStats => ({
  totalPlayers: 1284,
  avgScore: 86.4,
  completionRate: 94.2,
  activeSessions: 12,
});

const makeSessions = (n: number): SessionSummary[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `SST-${900 + i}`,
    date: '24 Out, 14:30',
    group: `Grupo ${i + 1}`,
    avgScore: i % 3 === 0 ? null : 80 + i,
    status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'completed' : 'reviewing',
  }));

describe('ManagerDashboard', () => {
  it('exibe o total de jogadores', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-stat-players')).toHaveTextContent('1284');
  });

  it('exibe a média de pontuação', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-stat-score')).toHaveTextContent('86.4');
  });

  it('exibe a taxa de conclusão', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-stat-completion')).toHaveTextContent('94.2');
  });

  it('exibe o número de sessões ativas', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-stat-active')).toHaveTextContent('12');
  });

  it('renderiza as linhas de sessões recentes', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={makeSessions(3)} onNewSession={vi.fn()} />);
    expect(screen.getAllByTestId(/^dashboard-session-/)).toHaveLength(3);
  });

  it('exibe o id de cada sessão', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={makeSessions(2)} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-session-SST-900')).toHaveTextContent('SST-900');
    expect(screen.getByTestId('dashboard-session-SST-901')).toHaveTextContent('SST-901');
  });

  it('exibe o grupo de cada sessão', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={makeSessions(1)} onNewSession={vi.fn()} />);
    expect(screen.getByTestId('dashboard-session-SST-900')).toHaveTextContent('Grupo 1');
  });

  it('chama onNewSession ao clicar no botão Nova Sessão', () => {
    const onNewSession = vi.fn();
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={onNewSession} />);
    screen.getByTestId('dashboard-new-session').click();
    expect(onNewSession).toHaveBeenCalledOnce();
  });

  it('renderiza lista de sessões vazia sem erros', () => {
    render(<ManagerDashboard stats={makeStats()} recentSessions={[]} onNewSession={vi.fn()} />);
    expect(screen.queryAllByTestId(/^dashboard-session-/)).toHaveLength(0);
  });
});
