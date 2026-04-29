import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── RED: CharacterSelectPage deve emitir PLAYER_RENAME com nome + sobrenome ──
// Bug: ROOM_JOIN usa playerName: 'Jogador' (hardcoded). O nome real é coletado
// em CharacterSelect mas nunca enviado ao servidor → todos aparecem como "Jogador".
//
// Fix: CharacterSelectPage emite PLAYER_RENAME após onConfirm, com o nome
// completo (firstName + " " + lastName).

vi.mock('../../three/ThreeCanvas', () => ({ ThreeCanvas: () => <div /> }));
vi.mock('../../three/GamePage',    () => ({ GamePage:    () => <div /> }));

const socketOnceHandlers: Record<string, (...args: unknown[]) => void> = {};
const socketOnHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock('../../ws/socket', () => ({
  socket: {
    emit: vi.fn(),
    on:   vi.fn((ev: string, cb: (...a: unknown[]) => void) => {
      socketOnHandlers[ev] = socketOnHandlers[ev] ?? [];
      socketOnHandlers[ev].push(cb);
    }),
    off:  vi.fn(),
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

function makeSession(): GameSession {
  return {
    id: 'session-1',
    pin: '123456',
    name: 'Teste',
    shareLink: '/sala/123456',
    facilitatorId: 'fac-1',
    state: 'WAITING',
    players: [{ id: 'p1', name: 'Jogador', score: 0, position: 0, isConnected: true }],
    currentPlayerIndex: 0,
    createdAt: Date.now(),
    quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
    maxPlayers: 2,
  };
}

function renderCharacterSelect() {
  return render(
    <MemoryRouter initialEntries={['/personagem']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

function fillAndConfirm(firstName: string, lastName: string, avatarIndex = 0) {
  act(() => {
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: firstName } });
    fireEvent.change(screen.getByTestId('last-name-input'),  { target: { value: lastName } });
    fireEvent.click(screen.getByTestId(`avatar-option-${avatarIndex}`));
  });
  act(() => {
    fireEvent.click(screen.getByTestId('confirm-button'));
  });
}

describe('CharacterSelectPage — PLAYER_RENAME', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(socket.emit).mockClear();
    useGameStore.setState({
      session: makeSession(),
      myPlayerId: 'p1',
      isMyTurn: false,
      gameResult: null,
    });
  });

  it('emite PLAYER_RENAME com nome + sobrenome + avatarId ao confirmar', () => {
    renderCharacterSelect();
    fillAndConfirm('Alice', 'Silva', 0); // 1º avatar
    const call = vi.mocked(socket.emit).mock.calls.find(
      ([ev]) => ev === EVENTS.PLAYER_RENAME,
    );
    expect(call?.[1]).toMatchObject({
      sessionId: 'session-1',
      playerId: 'p1',
      name: 'Alice Silva',
    });
    // Avatar enviado deve ser uma string (id da lista AVATARS) — não vazia
    expect(typeof (call?.[1] as { avatarId?: unknown })?.avatarId).toBe('string');
    expect((call?.[1] as { avatarId: string }).avatarId.length).toBeGreaterThan(0);
  });

  it('usa firstName + " " + lastName como nome completo', () => {
    renderCharacterSelect();
    fillAndConfirm('João', 'Santos');
    const call = vi.mocked(socket.emit).mock.calls.find(
      ([ev]) => ev === EVENTS.PLAYER_RENAME,
    );
    expect(call?.[1]).toMatchObject({ name: 'João Santos' });
  });

  it('navega para /lobby após confirmar', () => {
    renderCharacterSelect();
    fillAndConfirm('Alice', 'Silva');
    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
  });

  it('redireciona para home (/) sem sessão ativa devido ao GameGuard', () => {
    useGameStore.setState({ session: null, myPlayerId: null });
    renderCharacterSelect();
    
    // Como o GameGuard redireciona quando não há sessão, 
    // ele não deve estar na página de personagem
    expect(screen.queryByTestId('first-name-input')).not.toBeInTheDocument();
  });
});
