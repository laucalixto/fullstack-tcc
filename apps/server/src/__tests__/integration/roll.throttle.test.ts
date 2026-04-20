import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EVENTS, type GameSession } from '@safety-board/shared';
import { SessionManager } from '../../game/SessionManager.js';
import { attachSocketIO } from '../../socket.js';

// ─── RED: falha até throttleRoll ser implementado em game.handler.ts ─────────

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`waitFor timeout: ${event}`)), timeoutMs);
    socket.once(event, (data: T) => { clearTimeout(timer); resolve(data); });
  });
}

describe('TURN_ROLL throttle — integração', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    // dado fixo em 1 → casa 1 (normal, sem quiz nem tileEffect)
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 1 }));
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function connect(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const c = ioClient(`http://127.0.0.1:${port}`, { autoConnect: false });
      clients.push(c);
      c.once('connect', () => resolve(c));
      c.connect();
    });
  }

  async function setupTwoPlayerGame() {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    // Criar sala
    const [session] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    // p1 entra
    const [, p1Joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P1' })),
    ]);

    // p2 entra
    const [, p2Joined] = await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p2, EVENTS.ROOM_JOINED),
      Promise.resolve(p2.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P2' })),
    ]);

    // Iniciar partida
    fac.emit(EVENTS.GAME_START, { sessionId: session.id });
    await waitFor<GameSession>(p1, EVENTS.GAME_STATE);

    return { p1, p2, sessionId: session.id, p1Id: p1Joined.playerId, p2Id: p2Joined.playerId };
  }

  it('segunda TURN_ROLL imediata retorna ROOM_ERROR com code NOT_YOUR_TURN', async () => {
    const { p1, p1Id, sessionId } = await setupTwoPlayerGame();

    // Primeira rolagem deve passar
    const firstResult = waitFor(p1, EVENTS.TURN_RESULT);
    p1.emit(EVENTS.TURN_ROLL, { sessionId, playerId: p1Id });
    await firstResult;

    // Segunda rolagem imediata (< 2s) deve ser bloqueada pelo throttle
    const errorPromise = waitFor<{ code: string }>(p1, EVENTS.ROOM_ERROR);
    p1.emit(EVENTS.TURN_ROLL, { sessionId, playerId: p1Id });
    const error = await errorPromise;

    expect(error.code).toBe('NOT_YOUR_TURN');
  }, 15_000);

  it('throttle é por socket — outro jogador pode rolar sem cooldown', async () => {
    const { p1, p2, p1Id, p2Id, sessionId } = await setupTwoPlayerGame();

    // p1 rola normalmente (turno de p1 no início)
    await Promise.all([
      waitFor(p1, EVENTS.TURN_RESULT),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId, playerId: p1Id })),
    ]);

    // Agora é turno de p2 — deve funcionar sem cooldown cruzado
    await waitFor(p2, EVENTS.TURN_CHANGED);
    const p2ResultPromise = waitFor<{ dice: number }>(p2, EVENTS.TURN_RESULT);
    p2.emit(EVENTS.TURN_ROLL, { sessionId, playerId: p2Id });
    const p2Result = await p2ResultPromise;

    expect(p2Result.dice).toBe(1);
  }, 15_000);
});
