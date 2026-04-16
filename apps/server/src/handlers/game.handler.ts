import type { Socket, Server } from 'socket.io';
import { EVENTS, type RoomErrorPayload } from '@safety-board/shared';
import { SessionManager } from '../game/SessionManager';

export function registerGameHandler(socket: Socket, io: Server, sm: SessionManager): void {
  socket.on(EVENTS.GAME_START, (payload: { sessionId: string }) => {
    try {
      const session = sm.startGame(payload.sessionId);
      io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
      const currentPlayer = session.players[session.currentPlayerIndex];
      io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: currentPlayer.id });
    } catch (e) {
      const error: RoomErrorPayload = {
        code: 'ROOM_NOT_FOUND',
        message: (e as Error).message,
      };
      socket.emit(EVENTS.ROOM_ERROR, error);
    }
  });

  socket.on(EVENTS.TURN_ROLL, (payload: { sessionId: string; playerId: string }) => {
    try {
      const result = sm.rollDice(payload.sessionId, payload.playerId);

      io.to(payload.sessionId).emit(EVENTS.TURN_RESULT, {
        playerId: payload.playerId,
        dice: result.dice,
        newPosition: result.newPosition,
      });
      io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: result.nextPlayerId });

      const session = sm.getById(payload.sessionId);
      if (session) {
        io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
      }
    } catch (e) {
      const msg = (e as Error).message;
      const code: RoomErrorPayload['code'] =
        msg === 'NOT_YOUR_TURN' ? 'NOT_YOUR_TURN' : 'ROOM_NOT_FOUND';
      const error: RoomErrorPayload = { code, message: msg };
      socket.emit(EVENTS.ROOM_ERROR, error);
    }
  });
}
