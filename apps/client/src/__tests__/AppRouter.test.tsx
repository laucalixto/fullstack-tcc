import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../AppRouter';

// ─── Mocks: rota testa navegação, não render interno dos componentes ──────────

vi.mock('../three/ThreeCanvas', () => ({
  ThreeCanvas: () => <div data-testid="three-canvas" />,
}));

vi.mock('../ws/socket', () => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    once: vi.fn(),
  },
}));

vi.mock('../lobby/CharacterSelect', () => ({
  CharacterSelect: () => (
    <div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} data-testid={`avatar-option-${i}`} />
      ))}
    </div>
  ),
}));

vi.mock('../lobby/TutorialOverlay', () => ({
  TutorialOverlay: () => <div data-testid="tutorial-overlay" />,
}));

vi.mock('../results/PodiumResults', () => ({
  PodiumResults: () => <div data-testid="podium-results" />,
}));

vi.mock('../results/IndividualCard', () => ({
  IndividualCard: () => <div data-testid="individual-card" />,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('AppRouter', () => {
  it('rota / renderiza PinEntry (signup-pin ou pin-input)', () => {
    renderAt('/');
    expect(
      screen.queryByTestId('pin-input') ?? screen.queryByTestId('signup-pin'),
    ).toBeInTheDocument();
  });

  it('rota /personagem renderiza CharacterSelect', () => {
    renderAt('/personagem');
    expect(screen.getAllByTestId(/^avatar-option-/)).toHaveLength(4);
  });

  it('rota /lobby renderiza LobbyWaiting', () => {
    renderAt('/lobby');
    expect(screen.getByTestId('lobby-pin')).toBeInTheDocument();
  });

  it('rota /tutorial renderiza TutorialOverlay', () => {
    renderAt('/tutorial');
    expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
  });

  it('rota /jogo renderiza ThreeCanvas', () => {
    renderAt('/jogo');
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });

  it('rota /podio renderiza PodiumResults', () => {
    renderAt('/podio');
    expect(screen.getByTestId('podium-results')).toBeInTheDocument();
  });

  it('rota /resultado renderiza IndividualCard', () => {
    renderAt('/resultado');
    expect(screen.getByTestId('individual-card')).toBeInTheDocument();
  });

  it('rota /cadastrar renderiza PlayerSignup', () => {
    renderAt('/cadastrar');
    expect(screen.getByTestId('signup-submit')).toBeInTheDocument();
  });

  it('rota /ranking renderiza GlobalLeaderboard', () => {
    renderAt('/ranking');
    expect(screen.queryAllByTestId(/^leaderboard-entry-/)).toHaveLength(0);
  });

  it('rota /manager renderiza ManagerLogin', () => {
    renderAt('/manager');
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
  });

  it('rota /manager/dashboard renderiza ManagerDashboard', () => {
    renderAt('/manager/dashboard');
    expect(screen.getByTestId('dashboard-new-session')).toBeInTheDocument();
  });

  it('rota /manager/nova-sessao renderiza NewSessionForm', () => {
    renderAt('/manager/nova-sessao');
    expect(screen.getByTestId('session-generate-pin')).toBeInTheDocument();
  });
});
