import type { Socket } from 'socket.io';
import { EVENTS, type PongPayload } from '@safety-board/shared';

export function registerPingHandler(socket: Socket): void {
  socket.on(EVENTS.PING, () => {
    const payload: PongPayload = { ok: true, timestamp: Date.now() };
    socket.emit(EVENTS.PONG, payload);
  });
}
