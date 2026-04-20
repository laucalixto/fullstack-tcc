import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../AppRouter';
import { useGameStore } from '../stores/gameStore';
import { useManagerStore } from '../stores/managerStore';

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

const makeSession = () => ({
  id: 'sess-1', pin: '123456', name: 'Sessão Teste',
  shareLink: '/sala/123456', facilitatorId: 'f1',
  state: 'WAITING' as const, players: [],
  currentPlayerIndex: 0, createdAt: Date.now(),
  quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
  maxPlayers: 4 as const,
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('AppRouter', () => {
  beforeEach(() => {
    useGameStore.setState({ session: null });
    useManagerStore.setState({ token: null });
  });

  it('rota / renderiza PinEntry (signup-pin ou pin-input)', () => {
    renderAt('/');
    expect(
      screen.queryByTestId('pin-input') ?? screen.queryByTestId('signup-pin'),
    ).toBeInTheDocument();
  });

  it('rota /personagem renderiza CharacterSelect quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/personagem');
    expect(screen.getAllByTestId(/^avatar-option-/)).toHaveLength(4);
  });

  it('rota /lobby renderiza LobbyWaiting quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/lobby');
    expect(screen.getByTestId('lobby-pin')).toBeInTheDocument();
  });

  it('rota /tutorial renderiza TutorialOverlay quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/tutorial');
    expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
  });

  it('rota /jogo renderiza ThreeCanvas quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/jogo');
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });

  it('rota /podio renderiza PodiumResults quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/podio');
    expect(screen.getByTestId('podium-results')).toBeInTheDocument();
  });

  it('rota /resultado renderiza IndividualCard quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/resultado');
    expect(screen.getByTestId('individual-card')).toBeInTheDocument();
  });

  it('rota /cadastrar renderiza PlayerSignup quando há sessão', () => {
    useGameStore.setState({ session: makeSession() });
    renderAt('/cadastrar');
    expect(screen.getByTestId('signup-submit')).toBeInTheDocument();
  });

  it('rota /ranking renderiza GlobalLeaderboard (pública)', () => {
    renderAt('/ranking');
    expect(screen.queryAllByTestId(/^leaderboard-entry-/)).toHaveLength(0);
  });

  it('rota /manager renderiza ManagerLogin (pública)', () => {
    renderAt('/manager');
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
  });

  it('rota /manager/dashboard renderiza ManagerDashboard quando há token', () => {
    useManagerStore.setState({ token: 'valid-token' });
    renderAt('/manager/dashboard');
    expect(screen.getByTestId('dashboard-new-session')).toBeInTheDocument();
  });

  it('rota /manager/nova-sessao renderiza NewSessionForm quando há token', () => {
    useManagerStore.setState({ token: 'valid-token' });
    renderAt('/manager/nova-sessao');
    expect(screen.getByTestId('session-generate-pin')).toBeInTheDocument();
  });

  // Guards
  it('rota /lobby sem sessão redireciona para /', () => {
    renderAt('/lobby');
    expect(screen.queryByTestId('lobby-pin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pin-input') ?? screen.queryByTestId('signup-pin')).toBeInTheDocument();
  });

  it('rota /manager/dashboard sem token redireciona para /manager', () => {
    renderAt('/manager/dashboard');
    expect(screen.queryByTestId('dashboard-new-session')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
  });
});
