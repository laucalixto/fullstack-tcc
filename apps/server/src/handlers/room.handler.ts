import type { Socket, Server } from 'socket.io';
import { EVENTS, type RoomCreatePayload, type RoomJoinPayload, type RoomJoinedPayload, type RoomErrorPayload } from '@safety-board/shared';
import { SessionManager } from '../game/SessionManager';

export function registerRoomHandler(socket: Socket, io: Server, sm: SessionManager): void {
  socket.on(EVENTS.ROOM_CREATE, (payload: RoomCreatePayload) => {
    const session = sm.createSession(payload.facilitatorId);
    socket.join(session.id);
    socket.emit(EVENTS.GAME_STATE, session);
  });

  socket.on(EVENTS.ROOM_JOIN, (payload: RoomJoinPayload) => {
    try {
      const { session, playerId } = sm.joinSession(payload.pin, payload.playerName);
      socket.join(session.id);

      const joined: RoomJoinedPayload = {
        sessionId: session.id,
        playerId,
        pin: payload.pin,
      };
      socket.emit(EVENTS.ROOM_JOINED, joined);
      io.to(session.id).emit(EVENTS.GAME_STATE, session);
    } catch (e) {
      const msg = (e as Error).message;
      const validCodes = new Set<RoomErrorPayload['code']>([
        'ROOM_NOT_FOUND',
        'ROOM_FULL',
        'GAME_ALREADY_STARTED',
      ]);
      const code: RoomErrorPayload['code'] = validCodes.has(msg as RoomErrorPayload['code'])
        ? (msg as RoomErrorPayload['code'])
        : 'ROOM_NOT_FOUND';

      const error: RoomErrorPayload = { code, message: msg };
      socket.emit(EVENTS.ROOM_ERROR, error);
    }
  });
}
