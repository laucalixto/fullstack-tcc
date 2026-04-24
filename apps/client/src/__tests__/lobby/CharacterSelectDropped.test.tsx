import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// RED: CharacterSelectPage deve escutar PLAYER_DROPPED e redirecionar quando
// o jogador for removido da partida (voto unânime de "Iniciar agora").

vi.mock('../../three/ThreeCanvas', () => ({ ThreeCanvas: () => <div /> }));
vi.mock('../../three/GamePage',    () => ({ GamePage:    () => <div /> }));

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
    state: 'WAITING',
    players: [
      { id: 'p1', name: 'Alice', score: 0, position: 0, isConnected: true },
    ],
    currentPlayerIndex: 0,
    createdAt: Date.now(),
    quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
    maxPlayers: 4,
  };
}

describe('CharacterSelectPage — PLAYER_DROPPED', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    Object.keys(socketOnHandlers).forEach((k) => { socketOnHandlers[k] = []; });
    useGameStore.setState({ session: null, myPlayerId: null, isMyTurn: false, gameResult: null });
  });

  it('redireciona para /sala-fechada quando PLAYER_DROPPED é para o myPlayerId', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    render(
      <MemoryRouter initialEntries={['/personagem']}>
        <AppRouter />
      </MemoryRouter>,
    );

    act(() => {
      socketOnHandlers[EVENTS.PLAYER_DROPPED]?.forEach((h) =>
        h({ sessionId: 'session-1', playerId: 'p1', reason: 'FORCE_START' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/sala-fechada');
  });

  it('NÃO redireciona quando PLAYER_DROPPED é para outro jogador', () => {
    useGameStore.setState({ session: makeSession(), myPlayerId: 'p1' });
    render(
      <MemoryRouter initialEntries={['/personagem']}>
        <AppRouter />
      </MemoryRouter>,
    );

    act(() => {
      socketOnHandlers[EVENTS.PLAYER_DROPPED]?.forEach((h) =>
        h({ sessionId: 'session-1', playerId: 'p2', reason: 'FORCE_START' }),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/sala-fechada');
  });
});
