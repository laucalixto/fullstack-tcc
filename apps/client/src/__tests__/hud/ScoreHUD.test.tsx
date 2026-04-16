import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreHUD } from '../../hud/ScoreHUD';
import type { Player } from '@safety-board/shared';

// ─── RED: falha até ScoreHUD.tsx ser implementado ────────────────────────────

const makePlayers = (overrides: Partial<Player>[] = []): Player[] =>
  overrides.map((o, i) => ({
    id: `p${i + 1}`,
    name: `Jogador ${i + 1}`,
    position: 0,
    score: 0,
    isConnected: true,
    ...o,
  }));

describe('ScoreHUD', () => {
  it('renderiza o elemento raiz', () => {
    render(<ScoreHUD players={makePlayers([{}])} currentPlayerIndex={0} />);
    expect(screen.getByTestId('score-hud')).toBeInTheDocument();
  });

  it('exibe uma linha por jogador', () => {
    render(
      <ScoreHUD players={makePlayers([{}, {}, {}])} currentPlayerIndex={0} />,
    );
    expect(screen.getAllByTestId(/^score-player-/)).toHaveLength(3);
  });

  it('exibe nome e pontuação de cada jogador', () => {
    const players = makePlayers([
      { name: 'Alice', score: 3 },
      { name: 'Bob', score: 1 },
    ]);
    render(<ScoreHUD players={players} currentPlayerIndex={0} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByTestId('score-player-p1')).toHaveTextContent('3');
    expect(screen.getByTestId('score-player-p2')).toHaveTextContent('1');
  });

  it('marca o jogador da vez com aria-current="true"', () => {
    const players = makePlayers([{}, {}]);
    render(<ScoreHUD players={players} currentPlayerIndex={1} />);
    expect(screen.getByTestId('score-player-p2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('score-player-p1')).toHaveAttribute('aria-current', 'false');
  });

  it('marca o jogador local com data-me="true"', () => {
    const players = makePlayers([{}, {}]);
    render(
      <ScoreHUD players={players} currentPlayerIndex={0} myPlayerId="p2" />,
    );
    expect(screen.getByTestId('score-player-p2')).toHaveAttribute('data-me', 'true');
    expect(screen.getByTestId('score-player-p1')).toHaveAttribute('data-me', 'false');
  });

  it('exibe posição (tile) de cada jogador', () => {
    const players = makePlayers([{ position: 7 }, { position: 12 }]);
    render(<ScoreHUD players={players} currentPlayerIndex={0} />);
    expect(screen.getByTestId('score-player-p1')).toHaveTextContent('7');
    expect(screen.getByTestId('score-player-p2')).toHaveTextContent('12');
  });

  it('jogador desconectado recebe data-disconnected="true"', () => {
    const players = makePlayers([{ isConnected: false }, { isConnected: true }]);
    render(<ScoreHUD players={players} currentPlayerIndex={0} />);
    expect(screen.getByTestId('score-player-p1')).toHaveAttribute('data-disconnected', 'true');
    expect(screen.getByTestId('score-player-p2')).toHaveAttribute('data-disconnected', 'false');
  });
});
