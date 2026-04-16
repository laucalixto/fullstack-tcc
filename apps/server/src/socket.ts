import { Server } from 'socket.io';
import type { HttpServer } from './types';
import { registerPingHandler } from './handlers/ping.handler';
import { registerRoomHandler } from './handlers/room.handler';
import { registerGameHandler } from './handlers/game.handler';
import { SessionManager } from './game/SessionManager';

export function attachSocketIO(httpServer: HttpServer, sessionManager?: SessionManager): Server {
  const sm = sessionManager ?? new SessionManager();

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerPingHandler(socket);
    registerRoomHandler(socket, io, sm);
    registerGameHandler(socket, io, sm);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
}
