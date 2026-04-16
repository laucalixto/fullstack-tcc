import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndividualCard } from '../../results/IndividualCard';
import type { GameResultPlayer } from '@safety-board/shared';

// ─── RED: falha até IndividualCard.tsx ser implementado ──────────────────────

function makePlayer(overrides: Partial<GameResultPlayer> = {}): GameResultPlayer {
  return {
    playerId: 'p1',
    name: 'Alice',
    score: 350,
    rank: 1,
    finalPosition: 28,
    correctAnswers: 7,
    totalAnswers: 10,
    ...overrides,
  };
}

describe('IndividualCard', () => {
  it('renderiza o elemento raiz', () => {
    render(<IndividualCard player={makePlayer()} />);
    expect(screen.getByTestId('individual-card')).toBeInTheDocument();
  });

  it('exibe o nome do jogador', () => {
    render(<IndividualCard player={makePlayer({ name: 'Mariana' })} />);
    expect(screen.getByTestId('individual-card-name')).toHaveTextContent('Mariana');
  });

  it('exibe o score total', () => {
    render(<IndividualCard player={makePlayer({ score: 450 })} />);
    expect(screen.getByTestId('individual-card-score')).toHaveTextContent('450');
  });

  it('exibe ranking do jogador', () => {
    render(<IndividualCard player={makePlayer({ rank: 2 })} />);
    expect(screen.getByTestId('individual-card-rank')).toHaveTextContent('2');
  });

  it('exibe contagem de acertos no formato correto/total', () => {
    render(<IndividualCard player={makePlayer({ correctAnswers: 7, totalAnswers: 10 })} />);
    expect(screen.getByTestId('individual-card-answers')).toHaveTextContent('7/10');
  });

  it('exibe percentual de acerto', () => {
    render(<IndividualCard player={makePlayer({ correctAnswers: 8, totalAnswers: 10 })} />);
    // 8/10 = 80%
    expect(screen.getByTestId('individual-card-accuracy')).toHaveTextContent('80%');
  });

  it('exibe percentual 0% quando não respondeu nenhuma', () => {
    render(<IndividualCard player={makePlayer({ correctAnswers: 0, totalAnswers: 0 })} />);
    expect(screen.getByTestId('individual-card-accuracy')).toHaveTextContent('0%');
  });

  it('exibe posição final no tabuleiro', () => {
    render(<IndividualCard player={makePlayer({ finalPosition: 33 })} />);
    expect(screen.getByTestId('individual-card-position')).toHaveTextContent('33');
  });

  it('marca o 1º colocado com data-winner="true"', () => {
    render(<IndividualCard player={makePlayer({ rank: 1 })} />);
    expect(screen.getByTestId('individual-card')).toHaveAttribute('data-winner', 'true');
  });

  it('não marca outros colocados como vencedor', () => {
    render(<IndividualCard player={makePlayer({ rank: 3 })} />);
    expect(screen.getByTestId('individual-card')).toHaveAttribute('data-winner', 'false');
  });
});
