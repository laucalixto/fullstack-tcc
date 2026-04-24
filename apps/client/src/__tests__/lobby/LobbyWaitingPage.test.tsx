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

  it('navega imediatamente para /tutorial se sessão já está ACTIVE ao montar', () => {
    useGameStore.setState({ session: makeSession('ACTIVE'), myPlayerId: 'p1' });
    act(() => { renderLobby(); });
    // Jogador chegou ao lobby com sessão já iniciada (ex: perdeu GAME_STATE durante CharacterSelect)
    expect(mockNavigate).toHaveBeenCalledWith('/tutorial');
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

  // ─── RED: sincronização do lobby ──────────────────────────────────────────────
  // Bug: P2 vai ao lobby e vê P1 listado (e contador "2") mesmo P1 não tendo chegado
  // ao lobby. A lista deve mostrar apenas quem enviou LOBBY_READY (lobbyReadyPlayers).

  it('exibe apenas jogadores em lobbyReadyPlayers (não todos da sessão)', () => {
    const session = {
      ...makeSession(),
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p2'], // só P2 chegou ao lobby
    };
    useGameStore.setState({ session, myPlayerId: 'p2' });
    renderLobby();

    // P1 ainda não está no lobby — não deve aparecer
    expect(screen.queryByTestId('lobby-player-p1')).not.toBeInTheDocument();
    // P2 está no lobby — deve aparecer
    expect(screen.getByTestId('lobby-player-p2')).toBeInTheDocument();
  });

  it('contador exibe jogadores no lobby / maxPlayers', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 2 as const,
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p2'],
    };
    useGameStore.setState({ session, myPlayerId: 'p2' });
    renderLobby();

    // contador deve mostrar "1 / 2" (1 no lobby de 2 possíveis)
    expect(screen.getByTestId('player-count')).toHaveTextContent('1 / 2');
  });

  // ─── Botão "Iniciar agora" — voto dos jogadores presentes ─────────────────────

  it('NÃO exibe botão "Iniciar agora" em sala de 2 (auto-start cobre)', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 2 as const,
      lobbyReadyPlayers: ['p1', 'p2'],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();
    expect(screen.queryByTestId('force-start-button')).not.toBeInTheDocument();
  });

  it('NÃO exibe botão quando apenas 1 jogador está no lobby de sala 4', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 4 as const,
      lobbyReadyPlayers: ['p1'],
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
      ],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();
    expect(screen.queryByTestId('force-start-button')).not.toBeInTheDocument();
  });

  it('exibe botão quando maxPlayers>=3 e 2<=ready<maxPlayers', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 4 as const,
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p1', 'p2'],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();
    expect(screen.getByTestId('force-start-button')).toBeInTheDocument();
  });

  it('NÃO exibe botão quando sala está cheia (ready==maxPlayers)', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 3 as const,
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
        { id: 'p3', name: 'Carol', score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p1', 'p2', 'p3'],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();
    expect(screen.queryByTestId('force-start-button')).not.toBeInTheDocument();
  });

  it('clicar no botão emite LOBBY_FORCE_START', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const session = {
      ...makeSession(),
      maxPlayers: 4 as const,
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p1', 'p2'],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();
    fireEvent.click(screen.getByTestId('force-start-button'));
    expect(socket.emit).toHaveBeenCalledWith(
      EVENTS.LOBBY_FORCE_START,
      { sessionId: 'session-1', playerId: 'p1' },
    );
  });

  it('exibe progresso de votos ao receber LOBBY_FORCE_START_PROGRESS', () => {
    const session = {
      ...makeSession(),
      maxPlayers: 4 as const,
      players: [
        { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
        { id: 'p2', name: 'Bob',   score: 0, position: 0, isConnected: true },
        { id: 'p3', name: 'Carol', score: 0, position: 0, isConnected: true },
      ],
      lobbyReadyPlayers: ['p1', 'p2', 'p3'],
    };
    useGameStore.setState({ session, myPlayerId: 'p1' });
    renderLobby();

    act(() => {
      socketOnHandlers[EVENTS.LOBBY_FORCE_START_PROGRESS]?.forEach((h) =>
        h({ sessionId: 'session-1', votes: 2, needed: 3 }),
      );
    });

    expect(screen.getByTestId('force-start-button')).toHaveTextContent('2/3');
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
