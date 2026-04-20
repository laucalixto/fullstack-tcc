import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../three/ThreeCanvas', () => ({
  ThreeCanvas: () => <div data-testid="three-canvas" />,
}));

// gameBus mock com roteamento real de eventos (necessário para pawn:done chegar aos handlers)
const gameBusHandlers: Record<string, Set<(...args: unknown[]) => void>> = {};
vi.mock('../three/EventBus', () => ({
  gameBus: {
    emit: vi.fn((event: string, payload?: unknown) => {
      gameBusHandlers[event]?.forEach((h) => h(payload));
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!gameBusHandlers[event]) gameBusHandlers[event] = new Set();
      gameBusHandlers[event].add(handler);
      return () => gameBusHandlers[event].delete(handler);
    }),
  },
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
import { GamePage, QUIZ_OPEN_DELAY_MS } from '../three/GamePage';
import { gameBus } from '../three/EventBus';

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
  maxPlayers: 2 as const,
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
    vi.mocked(gameBus.emit).mockClear();
    Object.keys(socketHandlers).forEach((k) => { socketHandlers[k] = []; });
    Object.keys(gameBusHandlers).forEach((k) => { gameBusHandlers[k] = new Set(); });
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

  it('renderiza PlayerList (Equipe na Sessão) sobreposto ao canvas', () => {
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

  it('QUIZ_QUESTION não abre modal imediatamente — aguarda pawn:done', () => {
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
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
  });

  it('pawn:done enquanto quiz pendente NÃO abre modal imediatamente (delay 1s)', () => {
    vi.useFakeTimers();
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
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('pawn:done abre ChallengeModal após delay de 1s', () => {
    vi.useFakeTimers();
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
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(QUIZ_OPEN_DELAY_MS); });
    expect(screen.getByTestId('challenge-modal')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('responder quiz emite QUIZ_ANSWER com selectedText da opção clicada', () => {
    vi.useFakeTimers();
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
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(QUIZ_OPEN_DELAY_MS); });
    fireEvent.click(screen.getByTestId('challenge-option-0'));
    expect(socket.emit).toHaveBeenCalledWith(EVENTS.QUIZ_ANSWER, expect.objectContaining({
      sessionId: 'session-1',
      playerId: 'p1',
      questionId: 'q1',
      selectedText: 'Fornecer gratuitamente',
    }));
    vi.useRealTimers();
  });

  it('GAME_FINISHED não emite camera:victory imediatamente — aguarda pawn:done', () => {
    renderGamePage();
    vi.mocked(gameBus.emit).mockClear();
    act(() => {
      triggerSocket(EVENTS.GAME_FINISHED, {
        sessionId: 'session-1',
        players: [],
        durationSeconds: 120,
      });
    });
    expect(gameBus.emit).not.toHaveBeenCalledWith('camera:victory', expect.anything());
  });

  it('pawn:done enquanto victoryPending emite camera:victory e navega após delay', () => {
    vi.useFakeTimers();
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.GAME_FINISHED, {
        sessionId: 'session-1',
        players: [],
        durationSeconds: 120,
      });
    });
    vi.mocked(gameBus.emit).mockClear();
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    expect(gameBus.emit).toHaveBeenCalledWith('camera:victory', expect.anything());
    expect(mockNavigate).not.toHaveBeenCalledWith('/podio');
    act(() => { vi.runAllTimers(); });
    expect(mockNavigate).toHaveBeenCalledWith('/podio');
    vi.useRealTimers();
  });

  it('InactivityTimer renderizado no turno do jogador', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    expect(screen.getByTestId('inactivity-timer')).toBeInTheDocument();
  });

  // ─── gameBus bridge (Fase E) ─────────────────────────────────────────────────

  it('emite players:sync ao montar com sessão já na store (sem aguardar GAME_STATE)', () => {
    const session = makeSession('p1');
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderGamePage();
    expect(gameBus.emit).toHaveBeenCalledWith('players:sync', session.players);
  });

  it('emite active:player ao montar com jogador atual na store', () => {
    const session = makeSession('p1');
    session.players[0].position = 4;
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderGamePage();
    expect(gameBus.emit).toHaveBeenCalledWith('active:player', { tileIndex: 4, playerId: 'p1' });
  });

  it('GAME_STATE emite players:sync no gameBus com lista de jogadores', () => {
    renderGamePage();
    const session = makeSession('p1');
    act(() => { triggerSocket(EVENTS.GAME_STATE, session); });
    expect(gameBus.emit).toHaveBeenCalledWith('players:sync', session.players);
  });

  it('TURN_CHANGED emite active:player no gameBus com tileIndex do jogador ativo', () => {
    const session = makeSession('p1');
    session.players[0].position = 7; // p1 está na casa 7
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderGamePage();
    act(() => { triggerSocket(EVENTS.TURN_CHANGED, { playerId: 'p1' }); });
    expect(gameBus.emit).toHaveBeenCalledWith('active:player', { tileIndex: 7, playerId: 'p1' });
  });

  // ─── Dado (Fase F) ────────────────────────────────────────────────────────────

  it('clicar em Rolar Dado emite dice:throw no gameBus com posição da zona', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    fireEvent.click(screen.getByTestId('btn-roll-dice'));
    expect(gameBus.emit).toHaveBeenCalledWith('dice:throw', expect.objectContaining({ position: expect.objectContaining({ x: expect.any(Number) }) }));
  });

  it('botão fica desabilitado após clicar (isDiceRolling)', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    fireEvent.click(screen.getByTestId('btn-roll-dice'));
    expect(screen.getByTestId('btn-roll-dice')).toBeDisabled();
  });

  it('botão desabilitado enquanto peão do turno anterior ainda se move (isPawnSettling)', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p2', isMyTurn: false });
    renderGamePage();

    // TURN_RESULT: Player 1 rolou → dice:rollStart → isPawnSettling=true
    act(() => { triggerSocket(EVENTS.TURN_RESULT, { playerId: 'p1', dice: 3, newPosition: 3 }); });

    // TURN_CHANGED: agora é a vez de Player 2
    act(() => {
      useGameStore.setState({ isMyTurn: true });
      triggerSocket(EVENTS.TURN_CHANGED, { playerId: 'p2' });
    });

    expect(screen.getByTestId('btn-roll-dice')).toBeDisabled();
  });

  it('sem quiz: botão habilitado após pawn:done (TURN_CHANGED já chegou antes)', () => {
    // Sem quiz: TURN_CHANGED chega junto com TURN_RESULT, antes do pawn:done
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p2', isMyTurn: false });
    renderGamePage();

    act(() => { triggerSocket(EVENTS.TURN_RESULT, { playerId: 'p1', dice: 3, newPosition: 3 }); });
    act(() => {
      useGameStore.setState({ isMyTurn: true });
      triggerSocket(EVENTS.TURN_CHANGED, { playerId: 'p2' }); // chega antes do pawn:done
    });

    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); }); // último evento → libera
    expect(screen.getByTestId('btn-roll-dice')).not.toBeDisabled();
  });

  it('com quiz: botão desabilitado após pawn:done se TURN_CHANGED ainda não chegou', () => {
    // Com quiz: pawn:done dispara antes de TURN_CHANGED (quiz ainda sendo respondido)
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p2', isMyTurn: false });
    renderGamePage();

    act(() => { triggerSocket(EVENTS.TURN_RESULT, { playerId: 'p1', dice: 3, newPosition: 3 }); });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); }); // peão parou, quiz aberto

    // isMyTurn=true mas TURN_CHANGED ainda não chegou — botão deve continuar bloqueado
    act(() => { useGameStore.setState({ isMyTurn: true }); });
    expect(screen.getByTestId('btn-roll-dice')).toBeDisabled();

    // Quiz respondido → TURN_CHANGED → libera
    act(() => { triggerSocket(EVENTS.TURN_CHANGED, { playerId: 'p2' }); });
    expect(screen.getByTestId('btn-roll-dice')).not.toBeDisabled();
  });

  it('botão Rolar Dado desabilitado enquanto modal de quiz está aberto', () => {
    vi.useFakeTimers();
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.QUIZ_QUESTION, {
        sessionId: 'session-1',
        playerId: 'p1',
        question: makeQuestion(),
        timeoutSeconds: 30,
      });
    });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(QUIZ_OPEN_DELAY_MS); });
    expect(screen.getByTestId('challenge-modal')).toBeInTheDocument();
    expect(screen.getByTestId('btn-roll-dice')).toBeDisabled();
    vi.useRealTimers();
  });

  it('TURN_RESULT emite dice:result no gameBus com a face do dado', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    act(() => { triggerSocket(EVENTS.TURN_RESULT, { playerId: 'p1', dice: 4, newPosition: 4 }); });
    expect(gameBus.emit).toHaveBeenCalledWith('dice:result', { face: 4 });
  });

  it('TURN_RESULT emite dice:rollStart no gameBus (para sincronizar não-roladores)', () => {
    renderGamePage();
    act(() => { triggerSocket(EVENTS.TURN_RESULT, { playerId: 'p1', dice: 3, newPosition: 3 }); });
    expect(gameBus.emit).toHaveBeenCalledWith('dice:rollStart', {});
  });

  it('TURN_CHANGED emite dice:rollEnd no gameBus (para aplicar buffer nos não-roladores)', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => { triggerSocket(EVENTS.TURN_CHANGED, { playerId: 'p1' }); });
    expect(gameBus.emit).toHaveBeenCalledWith('dice:rollEnd', {});
  });

  // ─── Quiz filtrado (P1) ────────────────────────────────────────────────────

  it('QUIZ_QUESTION com meu playerId abre modal após pawn:done + delay 1s', () => {
    vi.useFakeTimers();
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
    // Não abre imediatamente
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
    // Não abre logo após pawn:done (delay 1s)
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
    // Abre após o delay
    act(() => { vi.advanceTimersByTime(QUIZ_OPEN_DELAY_MS); });
    expect(screen.getByTestId('challenge-modal')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('QUIZ_QUESTION com playerId de outro jogador NÃO abre o ChallengeModal', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.QUIZ_QUESTION, {
        sessionId: 'session-1',
        playerId: 'p2',   // não sou eu
        question: makeQuestion(),
        timeoutSeconds: 30,
      });
    });
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
  });

  // ─── TILE_EFFECT (Fase J) ───────────────────────────────────────────────────

  const makeTileEffect = () => ({
    type: 'accident' as const,
    title: 'Objeto em queda!',
    description: 'Trabalhador sem capacete.',
    normRef: 'NR-06',
    imagePath: '/cards/accidents/sem-capacete.svg',
    deltaPosition: -3,
    deltaScore: -20,
    skipTurns: 0,
    backToStart: false,
  });

  it('TILE_EFFECT não abre EffectCard imediatamente — aguarda pawn:done', () => {
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.TILE_EFFECT, {
        sessionId: 'session-1',
        playerId: 'p1',
        card: makeTileEffect(),
      });
    });
    expect(screen.queryByTestId('effect-card')).not.toBeInTheDocument();
  });

  it('pawn:done abre EffectCard após EFFECT_OPEN_DELAY_MS', () => {
    vi.useFakeTimers();
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.TILE_EFFECT, {
        sessionId: 'session-1',
        playerId: 'p1',
        card: makeTileEffect(),
      });
    });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('effect-card')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('botão dado desabilitado enquanto EffectCard está aberto', () => {
    vi.useFakeTimers();
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.TILE_EFFECT, {
        sessionId: 'session-1',
        playerId: 'p1',
        card: makeTileEffect(),
      });
    });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('btn-roll-dice')).toBeDisabled();
    vi.useRealTimers();
  });

  it('fechar EffectCard emite TILE_EFFECT_ACK com sessionId e playerId', () => {
    vi.useFakeTimers();
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1', isMyTurn: true });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.TILE_EFFECT, {
        sessionId: 'session-1',
        playerId: 'p1',
        card: makeTileEffect(),
      });
    });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p1' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(socket.emit).toHaveBeenCalledWith(EVENTS.TILE_EFFECT_ACK, {
      sessionId: 'session-1',
      playerId: 'p1',
    });
    vi.useRealTimers();
  });

  it('TILE_EFFECT de outro jogador NÃO exibe EffectCard (filtrado por playerId)', () => {
    vi.useFakeTimers();
    useGameStore.setState({ session: makeSession('p1'), myPlayerId: 'p1' });
    renderGamePage();
    act(() => {
      triggerSocket(EVENTS.TILE_EFFECT, {
        sessionId: 'session-1',
        playerId: 'p2', // outro jogador — deve ser ignorado
        card: makeTileEffect(),
      });
    });
    act(() => { gameBus.emit('pawn:done', { playerId: 'p2' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByTestId('effect-card')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
