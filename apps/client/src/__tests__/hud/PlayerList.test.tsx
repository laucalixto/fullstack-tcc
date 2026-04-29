import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerList } from '../../hud/PlayerList';
import type { Player } from '@safety-board/shared';

// ─── RED: falha até PlayerList.tsx ser implementado ──────────────────────────

const makePlayers = (overrides: Partial<Player>[] = []): Player[] =>
  overrides.map((o, i) => ({
    id: `p${i + 1}`,
    name: `Jogador ${i + 1}`,
    position: 0,
    score: 0,
    isConnected: true,
    ...o,
  }));

describe('PlayerList', () => {
  it('renderiza o elemento raiz', () => {
    render(<PlayerList players={makePlayers([{}])} currentPlayerIndex={0} />);
    expect(screen.getByTestId('player-list')).toBeInTheDocument();
  });

  it('renderiza um item por jogador', () => {
    render(<PlayerList players={makePlayers([{}, {}, {}])} currentPlayerIndex={0} />);
    expect(screen.getAllByTestId(/^player-list-item-/)).toHaveLength(3);
  });

  it('exibe nome de cada jogador', () => {
    const players = makePlayers([{ name: 'Alice' }, { name: 'Bob' }]);
    render(<PlayerList players={players} currentPlayerIndex={0} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('destaca o jogador da vez', () => {
    const players = makePlayers([{}, {}]);
    render(<PlayerList players={players} currentPlayerIndex={1} />);
    expect(screen.getByTestId('player-list-item-p2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('player-list-item-p1')).toHaveAttribute('aria-current', 'false');
  });

  it('indica jogador local com data-me="true"', () => {
    const players = makePlayers([{}, {}]);
    render(<PlayerList players={players} currentPlayerIndex={0} myPlayerId="p1" />);
    expect(screen.getByTestId('player-list-item-p1')).toHaveAttribute('data-me', 'true');
  });

  it('exibe badge de desconectado quando isConnected é false', () => {
    const players = makePlayers([{ isConnected: false }]);
    render(<PlayerList players={players} currentPlayerIndex={0} />);
    expect(screen.getByTestId('player-disconnected-p1')).toBeInTheDocument();
  });

  it('não exibe badge de desconectado para jogador conectado', () => {
    const players = makePlayers([{ isConnected: true }]);
    render(<PlayerList players={players} currentPlayerIndex={0} />);
    expect(screen.queryByTestId('player-disconnected-p1')).not.toBeInTheDocument();
  });

  it('exibe posição e pontuação de cada jogador', () => {
    const players = makePlayers([{ position: 10, score: 2 }]);
    render(<PlayerList players={players} currentPlayerIndex={0} />);
    expect(screen.getByTestId('player-list-item-p1')).toHaveTextContent('10');
    expect(screen.getByTestId('player-list-item-p1')).toHaveTextContent('2');
  });

  // ─── HUD timing: peão ainda pousando ─────────────────────────────────────
  // Quando o peão do jogador anterior ainda está animando, o destaque "Vez"
  // não pode acender no novo jogador — induz a falsa impressão de que ele
  // perdeu a vez. O badge "Vez" e o aria-current só ligam quando o pousio
  // terminou (isPawnSettling=false).
  it('não destaca "Vez" enquanto isPawnSettling for true', () => {
    const players = makePlayers([{}, {}]);
    render(<PlayerList players={players} currentPlayerIndex={1} isPawnSettling={true} />);
    expect(screen.queryByText('Vez')).not.toBeInTheDocument();
    expect(screen.getByTestId('player-list-item-p2')).toHaveAttribute('aria-current', 'false');
  });

  it('destaca "Vez" normalmente quando isPawnSettling for false', () => {
    const players = makePlayers([{}, {}]);
    render(<PlayerList players={players} currentPlayerIndex={1} isPawnSettling={false} />);
    expect(screen.getByText('Vez')).toBeInTheDocument();
    expect(screen.getByTestId('player-list-item-p2')).toHaveAttribute('aria-current', 'true');
  });

  it('isPawnSettling default é false (compat: chamadas antigas mantêm comportamento)', () => {
    const players = makePlayers([{}, {}]);
    render(<PlayerList players={players} currentPlayerIndex={1} />);
    expect(screen.getByText('Vez')).toBeInTheDocument();
  });
});
