import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerHistory } from '../../player/PlayerHistory';

// ─── RED: falha até PlayerHistory.tsx ser implementado ───────────────────────

const sampleEntries = [
  { sessionId: 's1', sessionName: 'Turma A', playedAt: '2026-04-01T10:00:00Z', score: 500, rank: 1, totalPlayers: 4 },
  { sessionId: 's2', sessionName: 'Turma B', playedAt: '2026-03-15T14:00:00Z', score: 300, rank: 3, totalPlayers: 4 },
];

describe('PlayerHistory', () => {
  it('exibe lista vazia quando não há histórico', () => {
    render(<PlayerHistory entries={[]} onBack={vi.fn()} />);
    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
  });

  it('renderiza entradas de partidas', () => {
    render(<PlayerHistory entries={sampleEntries} onBack={vi.fn()} />);
    expect(screen.getAllByTestId('history-entry')).toHaveLength(2);
  });

  it('exibe sessionName de cada partida', () => {
    render(<PlayerHistory entries={sampleEntries} onBack={vi.fn()} />);
    expect(screen.getByText('Turma A')).toBeInTheDocument();
    expect(screen.getByText('Turma B')).toBeInTheDocument();
  });

  it('exibe score de cada partida', () => {
    render(<PlayerHistory entries={sampleEntries} onBack={vi.fn()} />);
    expect(screen.getByTestId('history-entry-score-s1')).toHaveTextContent('500');
    expect(screen.getByTestId('history-entry-score-s2')).toHaveTextContent('300');
  });

  it('exibe rank de cada partida', () => {
    render(<PlayerHistory entries={sampleEntries} onBack={vi.fn()} />);
    expect(screen.getByTestId('history-entry-rank-s1')).toHaveTextContent('1');
  });

  it('botão voltar chama onBack', () => {
    const onBack = vi.fn();
    render(<PlayerHistory entries={[]} onBack={onBack} />);
    screen.getByTestId('history-back-btn').click();
    expect(onBack).toHaveBeenCalled();
  });
});
