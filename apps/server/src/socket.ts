import { Server } from 'socket.io';
import type { HttpServer } from './types';
import { registerPingHandler } from './handlers/ping.handler';

export function attachSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerPingHandler(socket);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
}
