import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GameGuard } from '../../components/GameGuard';
import { useGameStore } from '../../stores/gameStore';

// ─── RED: falha até GameGuard.tsx ser implementado ───────────────────────────

const makeSession = () => ({
  id: 'sess-1', pin: '999999', name: 'Test',
  shareLink: '/sala/999999', facilitatorId: 'f1',
  state: 'WAITING' as const,
  players: [], currentPlayerIndex: 0,
  createdAt: Date.now(),
  quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
  maxPlayers: 4 as const,
});

function renderWith(hasSession: boolean) {
  useGameStore.setState({ session: hasSession ? makeSession() : null });
  return render(
    <MemoryRouter initialEntries={['/lobby']}>
      <Routes>
        <Route path="/" element={<div data-testid="home-page" />} />
        <Route path="/lobby" element={<GameGuard><div data-testid="lobby-content" /></GameGuard>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GameGuard', () => {
  beforeEach(() => {
    useGameStore.setState({ session: null });
  });

  it('redireciona para / quando não há sessão', () => {
    renderWith(false);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby-content')).not.toBeInTheDocument();
  });

  it('renderiza filhos quando há sessão ativa', () => {
    renderWith(true);
    expect(screen.getByTestId('lobby-content')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('protege rota /jogo sem sessão', () => {
    useGameStore.setState({ session: null });
    render(
      <MemoryRouter initialEntries={['/jogo']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page" />} />
          <Route path="/jogo" element={<GameGuard><div data-testid="game-content" /></GameGuard>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('game-content')).not.toBeInTheDocument();
  });
});
