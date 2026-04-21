import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PlayerGuard } from '../../components/PlayerGuard';
import { usePlayerStore } from '../../stores/playerStore';

// ─── RED: falha até PlayerGuard.tsx ser implementado ─────────────────────────

function renderWith(token: string | null) {
  usePlayerStore.setState({ token, playerId: token ? 'pid-1' : null, name: null, email: null, industrialUnit: null, totalScore: 0 });
  return render(
    <MemoryRouter initialEntries={['/jogador/dashboard']}>
      <Routes>
        <Route path="/jogador" element={<div data-testid="login-page" />} />
        <Route
          path="/jogador/dashboard"
          element={<PlayerGuard><div data-testid="protected-content" /></PlayerGuard>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlayerGuard', () => {
  beforeEach(() => {
    usePlayerStore.setState({ token: null, playerId: null, name: null, email: null, industrialUnit: null, totalScore: 0 });
  });

  it('redireciona para /jogador quando não há token', () => {
    renderWith(null);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renderiza filhos quando há token válido', () => {
    renderWith('valid-jwt-token');
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
