import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── RED: tela de carregamento entre tutorial e tabuleiro ─────────────────────
// GameLoadingPage deve:
//   1. Exibir mensagem de aguardo
//   2. Emitir PLAYER_GAME_READY ao montar (sessionId + playerId)
//   3. Navegar para /jogo quando GAME_BEGIN recebido

vi.mock('../../three/ThreeCanvas', () => ({ ThreeCanvas: () => <div /> }));
vi.mock('../../three/GamePage',    () => ({ GamePage:    () => <div /> }));

// Mock do AssetManager: o GameLoadingPage faz preloadAll com URLs reais (atlases
// SVG) que jsdom não consegue carregar. Substituímos por no-op resolvido.
vi.mock('../../three/assets/AssetManager', () => ({
  assetManager: {
    preloadAll: vi.fn().mockResolvedValue(undefined),
    loadGLTF:    vi.fn(),
    loadTexture: vi.fn(),
    dispose:     vi.fn(),
  },
}));

const socketOnHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

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
    once: vi.fn(),
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

function makeSession(): GameSession {
  return {
    id: 'session-1',
    pin: '123456',
    name: 'Teste',
    shareLink: '/sala/123456',
    facilitatorId: 'fac-1',
    state: 'ACTIVE',
    players: [{ id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true }],
    currentPlayerIndex: 0,
    createdAt: Date.now(),
    quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
    maxPlayers: 2,
  };
}

function renderLoading() {
  return render(
    <MemoryRouter initialEntries={['/carregando']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('GameLoadingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(socket.emit).mockClear();
    Object.keys(socketOnHandlers).forEach((k) => { socketOnHandlers[k] = []; });
    useGameStore.setState({ session: null, myPlayerId: null, isMyTurn: false, gameResult: null });
  });

  it('exibe mensagem de aguardando jogadores', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLoading();
    expect(screen.getByTestId('game-loading')).toBeInTheDocument();
  });

  it('emite PLAYER_GAME_READY após preload de assets', async () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLoading();
    // O preload é assíncrono (await preloadAll) antes do emit. No default,
    // preloadAll([]) resolve imediatamente — mas precisa de um tick.
    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith(
        EVENTS.PLAYER_GAME_READY,
        { sessionId: 'session-1', playerId: 'p1' },
      );
    });
  });

  it('não emite PLAYER_GAME_READY sem sessão', async () => {
    useGameStore.setState({ session: null, myPlayerId: null });
    renderLoading();
    // Aguarda ciclo assíncrono para garantir que nada foi emitido.
    await new Promise((r) => setTimeout(r, 50));
    expect(socket.emit).not.toHaveBeenCalledWith(EVENTS.PLAYER_GAME_READY, expect.anything());
  });

  it('navega para /jogo quando GAME_BEGIN é recebido', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLoading();

    act(() => {
      socketOnHandlers[EVENTS.GAME_BEGIN]?.forEach((h) =>
        h({ sessionId: 'session-1' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/jogo');
  });

  it('não navega para /jogo antes de GAME_BEGIN', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    renderLoading();
    expect(mockNavigate).not.toHaveBeenCalledWith('/jogo');
  });
});
