import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerSessionsPage } from '../../manager/ManagerSessionsPage';
import { ManagerSessionDetailPage } from '../../manager/ManagerSessionDetailPage';
import type { SessionSummary, SessionDetail } from '@safety-board/shared';

// ─── RED: falha até ManagerSessionsPage/Detail serem implementados ────────────

const makeSessions = (n: number): SessionSummary[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `uuid-${i}`,
    pin: `10000${i}`,
    date: '24 Out, 14:30',
    group: `Grupo ${i + 1}`,
    avgScore: 80 + i,
    status: 'completed' as const,
  }));

const makeDetail = (): SessionDetail => ({
  sessionId: 'uuid-0',
  pin: '100001',
  sessionName: 'Sessão Teste',
  startedAt: '2026-04-20T10:00:00.000Z',
  finishedAt: '2026-04-20T10:30:00.000Z',
  durationSeconds: 1800,
  status: 'completed',
  players: [
    { playerId: 'p1', name: 'Ana Silva', score: 500, rank: 1, finalPosition: 39, correctAnswers: 4, totalAnswers: 5, dropped: false },
    { playerId: 'p2', name: 'Bruno Costa', score: 300, rank: 2, finalPosition: 25, correctAnswers: 2, totalAnswers: 5, dropped: true },
  ],
  quizLog: [
    { playerId: 'p1', playerName: 'Ana Silva', questionId: 'q1', questionText: 'Pergunta?', selectedText: 'A', correctText: 'A', correct: true, latencyMs: 500 },
  ],
  tileLog: [
    { playerId: 'p2', playerName: 'Bruno Costa', tileIndex: 3, effectTitle: 'EPI em Dia', effectType: 'prevention', deltaScore: 50, deltaPosition: 2 },
  ],
});

describe('ManagerSessionsPage', () => {
  it('renderiza tabela com sessões', () => {
    render(<ManagerSessionsPage sessions={makeSessions(3)} onViewDetail={vi.fn()} />);
    expect(screen.getAllByTestId(/^session-row-/)).toHaveLength(3);
  });

  it('exibe ID e PIN de cada sessão', () => {
    render(<ManagerSessionsPage sessions={makeSessions(1)} onViewDetail={vi.fn()} />);
    expect(screen.getByTestId('session-row-uuid-0')).toHaveTextContent('100000');
  });

  it('botão Ver Detalhe chama onViewDetail com sessionId correto', () => {
    const onViewDetail = vi.fn();
    render(<ManagerSessionsPage sessions={makeSessions(2)} onViewDetail={onViewDetail} />);
    fireEvent.click(screen.getByTestId('session-detail-btn-uuid-0'));
    expect(onViewDetail).toHaveBeenCalledWith('uuid-0');
  });

  it('renderiza lista vazia sem erros', () => {
    render(<ManagerSessionsPage sessions={[]} onViewDetail={vi.fn()} />);
    expect(screen.queryAllByTestId(/^session-row-/)).toHaveLength(0);
  });
});

describe('ManagerSessionDetailPage', () => {
  it('exibe nome da sessão', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getByTestId('detail-session-name')).toHaveTextContent('Sessão Teste');
  });

  it('exibe PIN da sessão', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getByTestId('detail-session-pin')).toHaveTextContent('100001');
  });

  it('exibe lista de jogadores', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getAllByTestId(/^detail-player-row-/)).toHaveLength(2);
  });

  it('indica jogador que saiu', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getByTestId('detail-player-row-p2')).toHaveTextContent('Saiu');
  });

  it('exibe quiz log', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getAllByTestId(/^detail-quiz-row-/)).toHaveLength(1);
  });

  it('exibe tile log', () => {
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={vi.fn()} />);
    expect(screen.getAllByTestId(/^detail-tile-row-/)).toHaveLength(1);
  });

  it('botão voltar chama onBack', () => {
    const onBack = vi.fn();
    render(<ManagerSessionDetailPage detail={makeDetail()} onBack={onBack} />);
    screen.getByTestId('detail-back-btn').click();
    expect(onBack).toHaveBeenCalled();
  });
});
