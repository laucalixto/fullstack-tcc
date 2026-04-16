import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlobalLeaderboard } from '../../results/GlobalLeaderboard';
import type { LeaderboardEntry } from '@safety-board/shared';

// ─── RED: falha até GlobalLeaderboard.tsx ser implementado ───────────────────

const makeEntries = (n: number): LeaderboardEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    playerId: `player-${i}`,
    name: `Jogador ${i + 1}`,
    role: 'Operador Industrial',
    industrialUnit: `Unidade ${i + 1}`,
    totalScore: 10000 - i * 500,
  }));

describe('GlobalLeaderboard', () => {
  it('renderiza a lista de entradas do leaderboard', () => {
    render(<GlobalLeaderboard entries={makeEntries(5)} />);
    expect(screen.getAllByTestId(/^leaderboard-entry-/)).toHaveLength(5);
  });

  it('exibe o rank de cada entrada', () => {
    render(<GlobalLeaderboard entries={makeEntries(3)} />);
    expect(screen.getByTestId('leaderboard-entry-1')).toHaveTextContent('1');
    expect(screen.getByTestId('leaderboard-entry-2')).toHaveTextContent('2');
  });

  it('exibe o nome de cada entrada', () => {
    render(<GlobalLeaderboard entries={makeEntries(2)} />);
    expect(screen.getByTestId('leaderboard-entry-1')).toHaveTextContent('Jogador 1');
    expect(screen.getByTestId('leaderboard-entry-2')).toHaveTextContent('Jogador 2');
  });

  it('exibe o score de cada entrada', () => {
    render(<GlobalLeaderboard entries={makeEntries(1)} />);
    expect(screen.getByTestId('leaderboard-entry-1')).toHaveTextContent('10000');
  });

  it('exibe a unidade industrial de cada entrada', () => {
    render(<GlobalLeaderboard entries={makeEntries(1)} />);
    expect(screen.getByTestId('leaderboard-entry-1')).toHaveTextContent('Unidade 1');
  });

  it('destaca a linha do usuário atual com data-current="true"', () => {
    render(<GlobalLeaderboard entries={makeEntries(3)} currentPlayerId="player-1" />);
    expect(screen.getByTestId('leaderboard-entry-2')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('leaderboard-entry-1')).toHaveAttribute('data-current', 'false');
  });

  it('renderiza lista vazia sem erros', () => {
    render(<GlobalLeaderboard entries={[]} />);
    expect(screen.queryAllByTestId(/^leaderboard-entry-/)).toHaveLength(0);
  });

  it('exibe a posição do usuário atual quando fornecido', () => {
    render(<GlobalLeaderboard entries={makeEntries(5)} currentPlayerId="player-2" />);
    expect(screen.getByTestId('leaderboard-current-rank')).toHaveTextContent('3');
  });

  it('chama onViewProfile quando botão é clicado em uma entrada', () => {
    const onViewProfile = vi.fn();
    render(<GlobalLeaderboard entries={makeEntries(2)} onViewProfile={onViewProfile} />);
    screen.getByTestId('leaderboard-entry-1').click();
    expect(onViewProfile).toHaveBeenCalledWith('player-0');
  });
});
