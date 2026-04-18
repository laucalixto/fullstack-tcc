import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../three/ThreeCanvas', () => ({
  ThreeCanvas: () => <div data-testid="three-canvas" />,
}));

// Handlers registry compartilhado entre mock e testes
const socketHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock('../ws/socket', () => ({
  socket: {
    on:   vi.fn((ev, cb) => { socketHandlers[ev] = socketHandlers[ev] ?? []; socketHandlers[ev].push(cb); }),
    off:  vi.fn((ev, cb) => { socketHandlers[ev] = (socketHandlers[ev] ?? []).filter((h) => h !== cb); }),
    emit: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

// Helper: dispara evento no socket mockado
function triggerSocket(event: string, payload: unknown) {
  socketHandlers[event]?.forEach((h) => h(payload));
}

// ─── Imports após mocks ───────────────────────────────────────────────────────

import { useGameStore } from '../stores/gameStore';
import { socket } from '../ws/socket';
import { EVENTS } from '@safety-board/shared';
import { GamePage } from '../three/GamePage';

// ─── Dados de teste ───────────────────────────────────────────────────────────

const makeSession = (myId = 'p1') => ({
  id: 'session-1',
  pin: '123456',
  name: 'Sessão Teste',
  shareLink: '/sala/123456',
  facilitatorId: 'f1',
  state: 'ACTIVE' as const,
  players: [
    { id: myId, name: 'Alice', score: 0, position: 0, avatarId: 'op', isConnected: true },
    { id: 'p2',  name: 'Bob',   score: 0, position: 0, avatarId: 'op', isConnected: true },
  ],
  currentPlayerIndex: 0,
  createdAt: Date.now(),
  quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
});

const makeQuestion = () => ({
  id: 'q1',
  normId: 'NR-06',
  text: 'Qual a responsabilidade do empregador em relação ao EPI?',
  options: ['Fornecer gratuitamente', 'Cobrar parte', 'Deixar livre', 'Só em acidentes'],
});

function renderGamePage() {
  return render(<MemoryRouter><GamePage /></MemoryRouter>);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('GamePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(socket.emit).mockClear();
    Object.keys(socketHandlers).forEach((k) => { socketHandlers[k] = []; });
    useGameStore.setState({
      session: null,
      myPlayerId: null,
      isMyTurn: false,
      gameResult: null,
    });
  });

  it('renderiza ThreeCanvas', () => {
    renderGamePage();
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });

  it('renderiza ScoreHUD sobreposto ao canvas', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    expect(screen.getByTestId('score-hud')).toBeInTheDocument();
  });

  it('renderiza PlayerList sobreposto ao canvas', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    expect(screen.getByTestId('player-list')).toBeInTheDocument();
  });

  it('botão Rolar Dado visível no turno do jogador', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    expect(screen.getByTestId('btn-roll-dice')).toBeInTheDocument();
  });

  it('botão Rolar Dado não visível fora do turno', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p2', isMyTurn: false });
    renderGamePage();
    expect(screen.queryByTestId('btn-roll-dice')).not.toBeInTheDocument();
  });

  it('clicar em Rolar Dado emite TURN_ROLL com sessionId e playerId', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    fireEvent.click(screen.getByTestId('btn-roll-dice'));
    expect(socket.emit).toHaveBeenCalledWith(EVENTS.TURN_ROLL, {
      sessionId: 'session-1',
      playerId: 'p1',
    });
  });

  it('GAME_STATE atualiza sessão na store', () => {
    renderGamePage();
    const updated = makeSession('p1');
    updated.players[0].score = 150;
    act(() => { triggerSocket(EVENTS.GAME_STATE, updated); });
    expect(useGameStore.getState().session?.players[0].score).toBe(150);
  });

  it('QUIZ_QUESTION abre o ChallengeModal', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.QUIZ_QUESTION, {
        sessionId: 'session-1',
        playerId: 'p1',
        question: makeQuestion(),
        timeoutSeconds: 30,
      });
    });
    expect(screen.getByTestId('challenge-modal')).toBeInTheDocument();
  });

  it('responder quiz emite QUIZ_ANSWER com selectedText da opção clicada', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.QUIZ_QUESTION, {
        sessionId: 'session-1',
        playerId: 'p1',
        question: makeQuestion(),
        timeoutSeconds: 30,
      });
    });
    fireEvent.click(screen.getByTestId('challenge-option-0'));
    expect(socket.emit).toHaveBeenCalledWith(EVENTS.QUIZ_ANSWER, expect.objectContaining({
      sessionId: 'session-1',
      playerId: 'p1',
      questionId: 'q1',
      selectedText: 'Fornecer gratuitamente',
    }));
  });

  it('GAME_FINISHED navega para /podio', () => {
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.GAME_FINISHED, {
        sessionId: 'session-1',
        players: [],
        durationSeconds: 120,
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/podio');
  });

  it('InactivityTimer renderizado no turno do jogador', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    expect(screen.getByTestId('inactivity-timer')).toBeInTheDocument();
  });
});
