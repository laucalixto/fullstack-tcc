import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
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

  it('exibe botão de cadastro quando onRegister é fornecido', () => {
    render(<IndividualCard player={makePlayer()} onRegister={vi.fn()} />);
    expect(screen.getByTestId('individual-card-register-btn')).toBeInTheDocument();
  });

  it('chama onRegister ao clicar no botão de cadastro', () => {
    const onRegister = vi.fn();
    render(<IndividualCard player={makePlayer()} onRegister={onRegister} />);
    fireEvent.click(screen.getByTestId('individual-card-register-btn'));
    expect(onRegister).toHaveBeenCalled();
  });

  it('não exibe botão de cadastro quando onRegister não é fornecido', () => {
    render(<IndividualCard player={makePlayer()} />);
    expect(screen.queryByTestId('individual-card-register-btn')).not.toBeInTheDocument();
  });

  it('exibe botão de dashboard quando onViewDashboard é fornecido', () => {
    render(<IndividualCard player={makePlayer()} onViewDashboard={vi.fn()} />);
    expect(screen.getByTestId('individual-card-dashboard-btn')).toBeInTheDocument();
  });

  it('chama onViewDashboard ao clicar no botão de dashboard', () => {
    const onViewDashboard = vi.fn();
    render(<IndividualCard player={makePlayer()} onViewDashboard={onViewDashboard} />);
    fireEvent.click(screen.getByTestId('individual-card-dashboard-btn'));
    expect(onViewDashboard).toHaveBeenCalled();
  });

  it('não exibe ambos os botões simultaneamente', () => {
    render(<IndividualCard player={makePlayer()} onRegister={vi.fn()} onViewDashboard={vi.fn()} />);
    expect(screen.queryByTestId('individual-card-register-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('individual-card-dashboard-btn')).toBeInTheDocument();
  });
});
