import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── RED: redesign do Bug 1 ───────────────────────────────────────────────────
// LobbyWaitingPage deve:
//   1. Emitir LOBBY_READY ao montar (sessionId + playerId)
//   2. Ouvir GAME_STARTING → mostrar countdown
//   3. Navegar para /tutorial via GAME_STATE(ACTIVE) — NÃO via useEffect no mount
//   4. NÃO navegar imediatamente se sessão já estiver ACTIVE ao montar

vi.mock('../../three/ThreeCanvas', () => ({ ThreeCanvas: () => <div /> }));
vi.mock('../../three/GamePage',    () => ({ GamePage:    () => <div /> }));

const socketOnceHandlers: Record<string, (...args: unknown[]) => void> = {};
const socketOnHandlers:   Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock('../../ws/socket', () => ({
  socket: {
    emit: vi.fn(),
    on:   vi.fn((ev: string, cb: (...a: unknown[]) => void) => {
      socketOnHandlers[ev] = socketOnHandlers[ev] ?? [];
      socketOnHandlers[ev].push(cb);
    }),
    off:  vi.fn((ev: string, cb: (...a: unknown[]) => void) => {
      socketOnHandlers[ev] = (socketOnHandlers[ev] ?? []).filter((h) => h !== cb);
    }),
    once: vi.fn((ev: string, cb: (...a: unknown[]) => void) => {
      socketOnceHandlers[ev] = cb;
    }),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../ws/socket';
import { AppRouter } from '../../AppRouter';
import { EVENTS } from '@safety-board/shared';
import type { GameSession } from '@safety-board/shared';

function makeSession(state: GameSession['state'] = 'WAITING'): GameSession {
  return {
    id: 'session-1',
    pin: '123456',
    name: 'Teste',
    shareLink: '/sala/123456',
    facilitatorId: 'fac-1',
    state,
    players: [
      { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
      { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
    ],
    currentPlayerIndex: 0,
    createdAt: Date.now(),
    quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
    maxPlayers: 2,
  };
}

function renderLobby() {
  return render(
    <MemoryRouter initialEntries={['/lobby']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('LobbyWaitingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(socket.emit).mockClear();
    Object.keys(socketOnHandlers).forEach((k) => { socketOnHandlers[k] = []; });
    Object.keys(socketOnceHandlers).forEach((k) => { delete socketOnceHandlers[k]; });
    useGameStore.setState({ session: null, myPlayerId: null, isMyTurn: false, gameResult: null });
  });

  it('emite LOBBY_READY ao montar com sessionId e playerId', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLobby();
    expect(socket.emit).toHaveBeenCalledWith(
      EVENTS.LOBBY_READY,
      { sessionId: 'session-1', playerId: 'p1' },
    );
  });

  it('não emite LOBBY_READY sem sessão', () => {
    useGameStore.setState({ session: null, myPlayerId: null });
    renderLobby();
    expect(socket.emit).not.toHaveBeenCalledWith(EVENTS.LOBBY_READY, expect.anything());
  });

  it('exibe autostart-countdown quando GAME_STARTING é recebido', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLobby();

    act(() => {
      socketOnHandlers[EVENTS.GAME_STARTING]?.forEach((h) =>
        h({ sessionId: 'session-1', autoStartAt: Date.now() + 5000 }),
      );
    });

    expect(screen.getByTestId('autostart-countdown')).toBeInTheDocument();
  });

  it('NÃO navega imediatamente se sessão já está ACTIVE ao montar', () => {
    useGameStore.setState({ session: makeSession('ACTIVE'), myPlayerId: 'p1' });
    act(() => { renderLobby(); });
    // Comportamento correto: aguarda no lobby até receber GAME_STATE via socket
    expect(mockNavigate).not.toHaveBeenCalledWith('/tutorial');
  });

  it('navega para /tutorial quando GAME_STATE(ACTIVE) chega via socket', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLobby();

    act(() => {
      socketOnHandlers[EVENTS.GAME_STATE]?.forEach((h) =>
        h({ ...makeSession('ACTIVE') }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/tutorial');
  });

  // P1 entra antes dos demais — store tem só ele; cada GAME_STATE broadcast deve
  // atualizar a store para que P1 veja todos os peões ao entrar no tabuleiro (2–4 jogadores)
  it.each([2, 3, 4])(
    'GAME_STATE com %i jogadores atualiza a store para P1 (que entrou antes)',
    (count) => {
      const allPlayers = Array.from({ length: 4 }, (_, i) => ({
        id: `p${i + 1}`, name: `Jogador ${i + 1}`, score: 0, position: 0, isConnected: true,
      }));

      // P1 já está no lobby com sessão de 1 jogador
      const sessionP1Only = { ...makeSession(), players: [allPlayers[0]], maxPlayers: count as 2 | 3 | 4 };
      useGameStore.setState({ session: sessionP1Only, myPlayerId: 'p1' });
      renderLobby();

      // Servidor broadcast GAME_STATE com N jogadores
      const sessionFull = { ...makeSession(), players: allPlayers.slice(0, count), maxPlayers: count as 2 | 3 | 4 };
      act(() => {
        socketOnHandlers[EVENTS.GAME_STATE]?.forEach((h) => h(sessionFull));
      });

      expect(useGameStore.getState().session?.players).toHaveLength(count);
    },
  );
});
