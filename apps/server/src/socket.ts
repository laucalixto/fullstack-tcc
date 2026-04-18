import { Server } from 'socket.io';
import type { HttpServer } from './types.js';
import { registerPingHandler } from './handlers/ping.handler.js';
import { registerRoomHandler } from './handlers/room.handler.js';
import { registerGameHandler } from './handlers/game.handler.js';
import { SessionManager } from './game/SessionManager.js';

interface SocketOpts {
  autoStartDelayMs?: number;
}

export function attachSocketIO(httpServer: HttpServer, sessionManager?: SessionManager, opts?: SocketOpts): Server {
  const sm = sessionManager ?? new SessionManager();
  const autoStartDelayMs = opts?.autoStartDelayMs ?? 5000;

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerPingHandler(socket);
    registerRoomHandler(socket, io, sm, autoStartDelayMs);
    registerGameHandler(socket, io, sm);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
}
