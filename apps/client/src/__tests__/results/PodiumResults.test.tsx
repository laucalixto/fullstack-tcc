import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PodiumResults } from '../../results/PodiumResults';
import type { GameResultPlayer } from '@safety-board/shared';

// ─── RED: falha até PodiumResults.tsx ser implementado ───────────────────────

function makePlayers(overrides: Partial<GameResultPlayer>[] = []): GameResultPlayer[] {
  return overrides.map((o, i) => ({
    playerId: `p${i + 1}`,
    name: `Jogador ${i + 1}`,
    score: 100 - i * 10,
    rank: (i + 1) as 1 | 2 | 3 | 4,
    finalPosition: 30 - i * 5,
    correctAnswers: 5 - i,
    totalAnswers: 8,
    ...o,
  }));
}

describe('PodiumResults', () => {
  it('renderiza o elemento raiz', () => {
    render(<PodiumResults players={makePlayers([{}, {}, {}])} durationSeconds={120} />);
    expect(screen.getByTestId('podium-results')).toBeInTheDocument();
  });

  it('exibe nome do 1º colocado', () => {
    const players = makePlayers([{ name: 'Alice', rank: 1 }, { name: 'Bob', rank: 2 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-1')).toHaveTextContent('Alice');
  });

  it('exibe nome do 2º colocado', () => {
    const players = makePlayers([{ name: 'Alice', rank: 1 }, { name: 'Bob', rank: 2 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-2')).toHaveTextContent('Bob');
  });

  it('exibe nome do 3º colocado quando presente', () => {
    const players = makePlayers([
      { name: 'Alice', rank: 1 },
      { name: 'Bob', rank: 2 },
      { name: 'Carol', rank: 3 },
    ]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-3')).toHaveTextContent('Carol');
  });

  it('exibe score do 1º colocado', () => {
    const players = makePlayers([{ name: 'Alice', rank: 1, score: 9 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-1')).toHaveTextContent('9');
  });

  it('marca o 1º colocado com data-rank="1"', () => {
    const players = makePlayers([{ rank: 1 }, { rank: 2 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-1')).toHaveAttribute('data-rank', '1');
  });

  it('exibe duração da partida formatada', () => {
    render(<PodiumResults players={makePlayers([{}])} durationSeconds={125} />);
    // 125s = 2m05s
    expect(screen.getByTestId('podium-duration')).toHaveTextContent('2:05');
  });

  it('não exibe slot 3 quando há apenas 2 jogadores', () => {
    const players = makePlayers([{ rank: 1 }, { rank: 2 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.queryByTestId('podium-player-3')).not.toBeInTheDocument();
  });

  it('exibe até 4 jogadores', () => {
    const players = makePlayers([{}, {}, {}, {}]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-player-4')).toBeInTheDocument();
  });
});
