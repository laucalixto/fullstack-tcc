import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import { socket } from '../../ws/socket';
import { EVENTS } from '@safety-board/shared';
import type { GameSession } from '@safety-board/shared';

// ─── RED: falha até useSocket.ts ser implementado ────────────────────────────

vi.mock('../../ws/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('@safety-board/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@safety-board/shared')>();
  return actual;
});

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra listener game:state ao montar', () => {
    renderHook(() => useSocket(vi.fn()));

    const events = (socket.on as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as string,
    );
    expect(events).toContain(EVENTS.GAME_STATE);
  });

  it('remove listener game:state ao desmontar', () => {
    const { unmount } = renderHook(() => useSocket(vi.fn()));
    unmount();

    const events = (socket.off as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as string,
    );
    expect(events).toContain(EVENTS.GAME_STATE);
  });

  it('chama onStateUpdate quando game:state é recebido', () => {
    const onStateUpdate = vi.fn();
    renderHook(() => useSocket(onStateUpdate));

    const [[, cb]] = (socket.on as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => call[0] === EVENTS.GAME_STATE,
    );

    const fakeSession: Partial<GameSession> = { state: 'WAITING', pin: '123456' };
    act(() => cb(fakeSession));

    expect(onStateUpdate).toHaveBeenCalledWith(fakeSession);
  });

  it('createRoom emite room:create com facilitatorId', () => {
    const { result } = renderHook(() => useSocket(vi.fn()));

    act(() => result.current.createRoom('fac-1'));

    expect(socket.emit).toHaveBeenCalledWith(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' });
  });

  it('joinRoom emite room:join com pin e playerName', () => {
    const { result } = renderHook(() => useSocket(vi.fn()));

    act(() => result.current.joinRoom('654321', 'Alice'));

    expect(socket.emit).toHaveBeenCalledWith(EVENTS.ROOM_JOIN, {
      pin: '654321',
      playerName: 'Alice',
    });
  });

  it('rollDice emite turn:roll com sessionId e playerId', () => {
    const { result } = renderHook(() => useSocket(vi.fn()));

    act(() => result.current.rollDice('sess-1', 'player-1'));

    expect(socket.emit).toHaveBeenCalledWith(EVENTS.TURN_ROLL, {
      sessionId: 'sess-1',
      playerId: 'player-1',
    });
  });

  it('startGame emite game:start com sessionId', () => {
    const { result } = renderHook(() => useSocket(vi.fn()));

    act(() => result.current.startGame('sess-1'));

    expect(socket.emit).toHaveBeenCalledWith(EVENTS.GAME_START, { sessionId: 'sess-1' });
  });
});
