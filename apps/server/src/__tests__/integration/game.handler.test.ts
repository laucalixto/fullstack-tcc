import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EVENTS, type GameSession } from '@safety-board/shared';
import { SessionManager } from '../../game/SessionManager.js';
import { attachSocketIO } from '../../socket.js';

vi.mock('../../db/models/GameResult.model.js', () => ({
  GameResultModel: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

// ─── TILE_EFFECT + TILE_EFFECT_ACK ───────────────────────────────────────────
// rollDiceFn = 2 → player lands on tile 2 (prevention/accident effect tile)

describe('game.handler — TILE_EFFECT e TILE_EFFECT_ACK', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 2 }));
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

  it('turn:roll em casa de efeito emite tile:effect ao jogador ativo', async () => {
    const fac = await connect();
    const p1  = await connect();

    const [session] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    const [, joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P1' })),
    ]);

    await Promise.all([
      waitFor(p1, EVENTS.GAME_STATE),
      waitFor(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: session.id })),
    ]);

    const [tileEffect] = await Promise.all([
      waitFor<{ sessionId: string; playerId: string; card: unknown }>(p1, EVENTS.TILE_EFFECT),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: joined.playerId })),
    ]);

    expect(tileEffect.sessionId).toBe(session.id);
    expect(tileEffect.playerId).toBe(joined.playerId);
    expect(tileEffect.card).toBeDefined();
  }, 8000);

  it('tile:effect:ack emite turn:changed', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const [session] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    const [, p1Joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P1' })),
    ]);

    await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p2, EVENTS.ROOM_JOINED),
      Promise.resolve(p2.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P2' })),
    ]);

    await Promise.all([
      waitFor(p1, EVENTS.GAME_STATE),
      waitFor(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: session.id })),
    ]);

    // Roll → tile effect (p1 is active player at index 0)
    await Promise.all([
      waitFor(p1, EVENTS.TILE_EFFECT),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: p1Joined.playerId })),
    ]);

    // ACK → TURN_CHANGED
    const [turnChanged] = await Promise.all([
      waitFor<{ playerId: string }>(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(p1.emit(EVENTS.TILE_EFFECT_ACK, { sessionId: session.id, playerId: p1Joined.playerId })),
    ]);

    expect(typeof turnChanged.playerId).toBe('string');
  }, 10000);
});

// ─── QUIZ_ANSWER ─────────────────────────────────────────────────────────────
// rollDiceFn = 5 → player lands on tile 5 (quiz tile)

describe('game.handler — QUIZ_ANSWER', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 5 }));
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

  it('quiz:answer emite quiz:result e turn:changed', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const [session] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    const [, p1Joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P1' })),
    ]);

    await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p2, EVENTS.ROOM_JOINED),
      Promise.resolve(p2.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P2' })),
    ]);

    await Promise.all([
      waitFor(p1, EVENTS.GAME_STATE),
      waitFor(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: session.id })),
    ]);

    const [quiz] = await Promise.all([
      waitFor<{ sessionId: string; playerId: string; question: { id: string; options: string[] } }>(p1, EVENTS.QUIZ_QUESTION),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: p1Joined.playerId })),
    ]);

    const [quizResult, turnChanged] = await Promise.all([
      waitFor<{ correct: boolean; correctText: string }>(p1, EVENTS.QUIZ_RESULT),
      waitFor<{ playerId: string }>(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(p1.emit(EVENTS.QUIZ_ANSWER, {
        sessionId: session.id,
        playerId: p1Joined.playerId,
        questionId: quiz.question.id,
        selectedText: quiz.question.options[0],
      })),
    ]);

    expect(typeof quizResult.correct).toBe('boolean');
    expect(typeof quizResult.correctText).toBe('string');
    expect(typeof turnChanged.playerId).toBe('string');
  }, 10000);
});

// ─── GAME_FINISHED ───────────────────────────────────────────────────────────
// rollDiceFn = 39 → player jumps to position 39 (finish) immediately

describe('game.handler — game:finished', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 39 }));
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

  it('jogador que chega ao fim emite game:finished', async () => {
    const fac = await connect();
    const p1  = await connect();

    const [session] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    const [, joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: session.pin, playerName: 'P1' })),
    ]);

    await Promise.all([
      waitFor(p1, EVENTS.GAME_STATE),
      waitFor(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: session.id })),
    ]);

    const [finished] = await Promise.all([
      waitFor<{ players: unknown[] }>(p1, EVENTS.GAME_FINISHED),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: joined.playerId })),
    ]);

    expect(Array.isArray(finished.players)).toBe(true);
  }, 10000);
});

// ─── GAME_START error ────────────────────────────────────────────────────────

describe('game.handler — GAME_START error', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 4 }));
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

  it('game:start com sessionId inválido emite room:error', async () => {
    const fac = await connect();

    const [error] = await Promise.all([
      waitFor<{ code: string }>(fac, EVENTS.ROOM_ERROR),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: 'nao-existe' })),
    ]);

    expect(error.code).toBe('ROOM_NOT_FOUND');
  }, 5000);
});
