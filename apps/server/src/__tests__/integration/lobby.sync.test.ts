import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EVENTS, type GameSession } from '@safety-board/shared';
import { SessionManager } from '../../game/SessionManager.js';
import { attachSocketIO } from '../../socket.js';

// ─── RED: sincronização lobby + tabuleiro via socket ─────────────────────────

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout: ${event}`)), timeoutMs);
    socket.once(event, (d: T) => { clearTimeout(t); resolve(d); });
  });
}

describe('lobby sync — integração', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    // @ts-ignore — autoStartDelayMs ainda não aceito (será implementado)
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 3 }), { autoStartDelayMs: 100 });
    await new Promise<void>((r) => httpServer.listen(0, '127.0.0.1', r));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    await new Promise<void>((r) => httpServer.close(() => r()));
  });

  function connect(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const c = ioClient(`http://127.0.0.1:${port}`, { autoConnect: false });
      clients.push(c);
      c.once('connect', () => resolve(c));
      c.connect();
    });
  }

  async function createRoom(fac: ClientSocket, maxPlayers = 2): Promise<GameSession> {
    const [state] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1', maxPlayers })),
    ]);
    return state;
  }

  async function joinRoom(player: ClientSocket, pin: string): Promise<string> {
    const [, joined] = await Promise.all([
      waitFor(player, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(player, EVENTS.ROOM_JOINED),
      Promise.resolve(player.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Player' })),
    ]);
    return joined.playerId;
  }

  // ── Fase 1: LOBBY_READY → GAME_STARTING → GAME_STATE(ACTIVE) ────────────────

  it('LOBBY_READY de todos dispara GAME_STARTING com autoStartAt', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const { id: sessionId, pin } = await createRoom(fac, 2);
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);

    // Ambos sinalizam que estão no lobby
    const [starting] = await Promise.all([
      waitFor<{ sessionId: string; autoStartAt: number }>(p1, EVENTS.GAME_STARTING, 3000),
      Promise.resolve(p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id })),
      Promise.resolve(p2.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p2Id })),
    ]);

    expect(starting.sessionId).toBe(sessionId);
    expect(starting.autoStartAt).toBeGreaterThan(Date.now());
  }, 8000);

  it('GAME_STARTING dispara GAME_STATE(ACTIVE) após delay', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const { id: sessionId, pin } = await createRoom(fac, 2);
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);

    await Promise.all([
      waitFor(p1, EVENTS.GAME_STARTING, 3000),
      Promise.resolve(p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id })),
      Promise.resolve(p2.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p2Id })),
    ]);

    // Após delay (100ms no teste) deve vir GAME_STATE(ACTIVE)
    const activeState = await waitFor<GameSession>(p1, EVENTS.GAME_STATE, 3000);
    expect(activeState.state).toBe('ACTIVE');
  }, 10000);

  it('LOBBY_READY de apenas um jogador NÃO dispara GAME_STARTING', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const { id: sessionId, pin } = await createRoom(fac, 2);
    const p1Id = await joinRoom(p1, pin);
    await joinRoom(p2, pin);

    let receivedGameStarting = false;
    p1.once(EVENTS.GAME_STARTING, () => { receivedGameStarting = true; });
    p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id });

    await new Promise((r) => setTimeout(r, 500));
    expect(receivedGameStarting).toBe(false);
  }, 6000);

  // ── Fase 2: PLAYER_GAME_READY → GAME_BEGIN ───────────────────────────────────

  it('PLAYER_GAME_READY de todos dispara GAME_BEGIN', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const { id: sessionId, pin } = await createRoom(fac, 2);
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);

    // Iniciar jogo diretamente (pulando lobby sync para este teste)
    fac.emit(EVENTS.GAME_START, { sessionId });
    await waitFor(p1, EVENTS.GAME_STATE, 3000);

    // Ambos sinalizam prontos para o tabuleiro
    const [begin] = await Promise.all([
      waitFor<{ sessionId: string }>(p1, EVENTS.GAME_BEGIN, 3000),
      Promise.resolve(p1.emit(EVENTS.PLAYER_GAME_READY, { sessionId, playerId: p1Id })),
      Promise.resolve(p2.emit(EVENTS.PLAYER_GAME_READY, { sessionId, playerId: p2Id })),
    ]);

    expect(begin.sessionId).toBe(sessionId);
  }, 10000);

  it('PLAYER_GAME_READY de apenas um NÃO dispara GAME_BEGIN', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const { id: sessionId, pin } = await createRoom(fac, 2);
    const p1Id = await joinRoom(p1, pin);
    await joinRoom(p2, pin);

    fac.emit(EVENTS.GAME_START, { sessionId });
    await waitFor(p1, EVENTS.GAME_STATE, 3000);

    let receivedGameBegin = false;
    p1.once(EVENTS.GAME_BEGIN, () => { receivedGameBegin = true; });
    p1.emit(EVENTS.PLAYER_GAME_READY, { sessionId, playerId: p1Id });

    await new Promise((r) => setTimeout(r, 300));
    expect(receivedGameBegin).toBe(false);
  }, 8000);
});
