import { useEffect, useCallback } from 'react';
import { socket } from '../ws/socket';
import { EVENTS } from '@safety-board/shared';
import type { GameSession } from '@safety-board/shared';

export function useSocket(onStateUpdate: (session: GameSession) => void) {
  useEffect(() => {
    socket.on(EVENTS.GAME_STATE, onStateUpdate);
    return () => {
      socket.off(EVENTS.GAME_STATE, onStateUpdate);
    };
  }, [onStateUpdate]);

  const createRoom = useCallback((facilitatorId: string) => {
    socket.emit(EVENTS.ROOM_CREATE, { facilitatorId });
  }, []);

  const joinRoom = useCallback((pin: string, playerName: string) => {
    socket.emit(EVENTS.ROOM_JOIN, { pin, playerName });
  }, []);

  const rollDice = useCallback((sessionId: string, playerId: string) => {
    socket.emit(EVENTS.TURN_ROLL, { sessionId, playerId });
  }, []);

  const startGame = useCallback((sessionId: string) => {
    socket.emit(EVENTS.GAME_START, { sessionId });
  }, []);

  return { createRoom, joinRoom, rollDice, startGame };
}
