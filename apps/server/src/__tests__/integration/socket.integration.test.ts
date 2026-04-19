import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EVENTS, type GameSession } from '@safety-board/shared';
import { SessionManager } from '../../game/SessionManager.js';
import { attachSocketIO } from '../../socket.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('WebSocket sync — integração', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    // rollDiceFn fixo em 3 garante que o jogador nunca caia em casa de quiz
    // (QUIZ_TILE_INDICES = {5, 8, 15, 18, 25, 28, 35, 38}), evitando timeout por QUIZ_QUESTION
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 3 }));
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

  // ── Helpers de fluxo reutilizáveis ────────────────────────────────────────

  async function createRoom(fac: ClientSocket): Promise<GameSession> {
    const [state] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);
    return state;
  }

  async function joinRoom(
    player: ClientSocket,
    pin: string,
  ): Promise<{ joined: { playerId: string; sessionId: string; pin: string }; state: GameSession }> {
    // Registra ambos os listeners ANTES de emitir para evitar race condition
    const [state, joined] = await Promise.all([
      waitFor<GameSession>(player, EVENTS.GAME_STATE),
      waitFor<{ playerId: string; sessionId: string; pin: string }>(player, EVENTS.ROOM_JOINED),
      Promise.resolve(player.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Player' })),
    ]);
    return { joined, state };
  }

  async function startGame(
    fac: ClientSocket,
    observer: ClientSocket,
    sessionId: string,
  ): Promise<{ state: GameSession; turn: { playerId: string } }> {
    // Registra listeners no observer ANTES de emitir
    const [state, turn] = await Promise.all([
      waitFor<GameSession>(observer, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(observer, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId })),
    ]);
    return { state, turn };
  }

  // ── Testes ────────────────────────────────────────────────────────────────

  it('room:create emite game:state de volta ao criador', async () => {
    const fac = await connect();
    const state = await createRoom(fac);

    expect(state.state).toBe('WAITING');
    expect(state.facilitatorId).toBe('fac-1');
    expect(state.pin).toMatch(/^\d{6}$/);
  }, 5000);

  it('room:join emite room:joined ao entrante e game:state a todos na sala', async () => {
    const fac = await connect();
    const player = await connect();

    const { pin } = await createRoom(fac);
    const { joined, state } = await joinRoom(player, pin);

    expect(joined.pin).toBe(pin);
    expect(typeof joined.playerId).toBe('string');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Player');
  }, 5000);

  it('room:join com PIN inválido emite room:error ao entrante', async () => {
    const player = await connect();

    const [error] = await Promise.all([
      waitFor<{ code: string; message: string }>(player, EVENTS.ROOM_ERROR),
      Promise.resolve(player.emit(EVENTS.ROOM_JOIN, { pin: '000000', playerName: 'Ghost' })),
    ]);

    expect(error.code).toBe('ROOM_NOT_FOUND');
  }, 5000);

  it('game:start emite game:state ACTIVE e turn:changed a todos na sala', async () => {
    const fac = await connect();
    const player = await connect();

    const { id: sessionId, pin } = await createRoom(fac);
    await joinRoom(player, pin);

    const { state, turn } = await startGame(fac, player, sessionId);

    expect(state.state).toBe('ACTIVE');
    expect(typeof turn.playerId).toBe('string');
  }, 5000);

  it('turn:roll pelo jogador ativo emite turn:result e turn:changed a todos', async () => {
    const fac = await connect();
    const player = await connect();

    const { id: sessionId, pin } = await createRoom(fac);
    const { joined } = await joinRoom(player, pin);
    await startGame(fac, player, sessionId);

    const [result, turn] = await Promise.all([
      waitFor<{ playerId: string; dice: number; newPosition: number }>(player, EVENTS.TURN_RESULT),
      waitFor<{ playerId: string }>(player, EVENTS.TURN_CHANGED),
      Promise.resolve(player.emit(EVENTS.TURN_ROLL, { sessionId, playerId: joined.playerId })),
    ]);

    expect(result.dice).toBeGreaterThanOrEqual(1);
    expect(result.dice).toBeLessThanOrEqual(6);
    expect(result.newPosition).toBeGreaterThanOrEqual(1);
    expect(typeof turn.playerId).toBe('string');
  }, 5000);

  it('turn:roll por jogador não ativo emite room:error NOT_YOUR_TURN', async () => {
    const fac = await connect();
    const p1 = await connect();
    const p2 = await connect();

    const { id: sessionId, pin } = await createRoom(fac);
    await joinRoom(p1, pin);

    // p2 usa nome diferente para evitar conflito no game:state
    const [, p2Joined] = await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p2, EVENTS.ROOM_JOINED),
      Promise.resolve(p2.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'P2' })),
    ]);

    // Registra listeners de p2 ANTES de emitir game:start para evitar race condition
    const p2Ready = Promise.all([
      waitFor(p2, EVENTS.GAME_STATE),
      waitFor(p2, EVENTS.TURN_CHANGED),
    ]);
    await startGame(fac, p1, sessionId);
    await p2Ready;

    // p2 tenta rolar (turno é do p1)
    const [error] = await Promise.all([
      waitFor<{ code: string }>(p2, EVENTS.ROOM_ERROR),
      Promise.resolve(p2.emit(EVENTS.TURN_ROLL, { sessionId, playerId: p2Joined.playerId })),
    ]);

    expect(error.code).toBe('NOT_YOUR_TURN');
  }, 8000);
});

// ─── RED: quiz:question deve ir APENAS ao jogador da vez ─────────────────────
// Bug: io.to(sessionId).emit(QUIZ_QUESTION) → broadcast para todos os jogadores.
// Correto: socket.emit → somente o jogador que rolou recebe a pergunta.

describe('WebSocket sync — quiz:question direcionado', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  // rollDiceFn = 5: posição 0 + 5 = tile 5 = casa de quiz
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

  it('quiz:question chega apenas ao jogador ativo — outros jogadores NÃO recebem', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    // Criar sala e entrar com p1 e p2
    const [sessionState] = await Promise.all([
      waitFor<GameSession>(fac, EVENTS.GAME_STATE),
      Promise.resolve(fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1' })),
    ]);

    const [, p1Joined] = await Promise.all([
      waitFor<GameSession>(p1, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p1, EVENTS.ROOM_JOINED),
      Promise.resolve(p1.emit(EVENTS.ROOM_JOIN, { pin: sessionState.pin, playerName: 'P1' })),
    ]);

    await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE),
      waitFor<{ playerId: string }>(p2, EVENTS.ROOM_JOINED),
      Promise.resolve(p2.emit(EVENTS.ROOM_JOIN, { pin: sessionState.pin, playerName: 'P2' })),
    ]);

    // Iniciar jogo
    await Promise.all([
      waitFor(p1, EVENTS.GAME_STATE),
      waitFor(p1, EVENTS.TURN_CHANGED),
      Promise.resolve(fac.emit(EVENTS.GAME_START, { sessionId: sessionState.id })),
    ]);

    // Monitorar se p2 recebe QUIZ_QUESTION (não deveria)
    let p2ReceivedQuiz = false;
    p2.on(EVENTS.QUIZ_QUESTION, () => { p2ReceivedQuiz = true; });

    // p1 rola dado → tile 5 = casa de quiz → p1 deve receber QUIZ_QUESTION
    const [quiz] = await Promise.all([
      waitFor<{ playerId: string; question: unknown }>(p1, EVENTS.QUIZ_QUESTION),
      Promise.resolve(p1.emit(EVENTS.TURN_ROLL, { sessionId: sessionState.id, playerId: p1Joined.playerId })),
    ]);

    // Aguarda um tick para garantir que p2 teria recebido se fosse broadcast
    await new Promise((r) => setTimeout(r, 100));

    expect(quiz.playerId).toBe(p1Joined.playerId);
    expect(p2ReceivedQuiz).toBe(false);
  }, 8000);
});
