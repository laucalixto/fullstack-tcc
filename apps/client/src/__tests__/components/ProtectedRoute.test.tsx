import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useManagerStore } from '../../stores/managerStore';

// ─── RED: falha até ProtectedRoute.tsx ser implementado ──────────────────────

function renderWith(token: string | null) {
  useManagerStore.setState({ token });
  return render(
    <MemoryRouter initialEntries={['/manager/dashboard']}>
      <Routes>
        <Route path="/manager" element={<div data-testid="login-page" />} />
        <Route
          path="/manager/dashboard"
          element={<ProtectedRoute><div data-testid="protected-content" /></ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useManagerStore.setState({ token: null });
  });

  it('redireciona para /manager quando não há token', () => {
    renderWith(null);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renderiza filhos quando há token válido', () => {
    renderWith('valid-jwt-token');
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redireciona ao token ser nulo após ter sido válido', () => {
    renderWith(null);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
