import type { Socket } from 'socket.io';
import { EVENTS, type PongPayload } from '@safety-board/shared';

export function registerPingHandler(socket: Socket): void {
  socket.data.latencyMs = 0;

  socket.on(EVENTS.PING, () => {
    const payload: PongPayload = { ok: true, timestamp: Date.now() };
    socket.emit(EVENTS.PONG, payload);
  });

  // Cliente mede o RTT após receber o pong e reporta de volta
  socket.on('latency', (rtt: number) => {
    socket.data.latencyMs = rtt;
  });
}
