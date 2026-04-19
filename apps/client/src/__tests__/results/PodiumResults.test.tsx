import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// ─── RED: Leaderboard table e card de desempenho ─────────────────────────────

describe('PodiumResults — leaderboard table', () => {
  it('exibe a tabela leaderboard', () => {
    render(<PodiumResults players={makePlayers([{}, {}])} durationSeconds={60} />);
    expect(screen.getByTestId('podium-leaderboard')).toBeInTheDocument();
  });

  it('exibe uma linha por jogador', () => {
    const players = makePlayers([{ rank: 1 }, { rank: 2 }, { rank: 3 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-leaderboard-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-leaderboard-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('podium-leaderboard-row-3')).toBeInTheDocument();
  });

  it('exibe o nome do jogador na linha da tabela', () => {
    const players = makePlayers([{ name: 'Alice', rank: 1 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-leaderboard-row-1')).toHaveTextContent('Alice');
  });

  it('exibe o score do jogador na linha da tabela', () => {
    const players = makePlayers([{ rank: 1, score: 9500 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-leaderboard-row-1')).toHaveTextContent('9500');
  });

  it('exibe o número de acertos na linha da tabela', () => {
    const players = makePlayers([{ rank: 1, correctAnswers: 7, totalAnswers: 10 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.getByTestId('podium-leaderboard-row-1')).toHaveTextContent('7');
  });

  it('destaca a linha do jogador atual com data-current="true"', () => {
    const players = makePlayers([{ playerId: 'me', rank: 1 }, { playerId: 'other', rank: 2 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-leaderboard-row-1')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('podium-leaderboard-row-2')).toHaveAttribute('data-current', 'false');
  });
});

describe('PodiumResults — card de desempenho do jogador atual', () => {
  it('exibe o card de desempenho quando myPlayerId é fornecido', () => {
    const players = makePlayers([{ playerId: 'me', name: 'Alice', rank: 1 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-performance-card')).toBeInTheDocument();
  });

  it('não exibe o card de desempenho quando myPlayerId é omitido', () => {
    const players = makePlayers([{ playerId: 'me', rank: 1 }]);
    render(<PodiumResults players={players} durationSeconds={60} />);
    expect(screen.queryByTestId('podium-performance-card')).not.toBeInTheDocument();
  });

  it('exibe o nome do jogador atual no card', () => {
    const players = makePlayers([{ playerId: 'me', name: 'Carol', rank: 1 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-performance-card')).toHaveTextContent('Carol');
  });

  it('exibe o score do jogador atual no card', () => {
    const players = makePlayers([{ playerId: 'me', rank: 1, score: 8800 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-performance-card')).toHaveTextContent('8800');
  });

  it('exibe os acertos do jogador atual no card', () => {
    const players = makePlayers([{ playerId: 'me', rank: 1, correctAnswers: 6, totalAnswers: 8 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-performance-card')).toHaveTextContent('6/8');
  });

  it('botão "Verifique seu desempenho" chama onViewResults', () => {
    const onViewResults = vi.fn();
    const players = makePlayers([{ playerId: 'me', rank: 1 }]);
    render(
      <PodiumResults players={players} durationSeconds={60} myPlayerId="me" onViewResults={onViewResults} />,
    );
    fireEvent.click(screen.getByTestId('podium-btn-individual'));
    expect(onViewResults).toHaveBeenCalledOnce();
  });

  it('botão "Verifique seu desempenho" está visível mesmo sem onViewResults', () => {
    const players = makePlayers([{ playerId: 'me', rank: 1 }]);
    render(<PodiumResults players={players} durationSeconds={60} myPlayerId="me" />);
    expect(screen.getByTestId('podium-btn-individual')).toBeInTheDocument();
  });
});
