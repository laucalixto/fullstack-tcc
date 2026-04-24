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

  // ── Fase 3: LOBBY_FORCE_START ────────────────────────────────────────────────
  //
  // O socket `creator` abaixo apenas emite ROOM_CREATE para instanciar a sala
  // no teste. Ele não participa do início — esse cabe exclusivamente aos
  // jogadores presentes no lobby (voto unânime) ou ao auto-start quando a sala
  // enche. Nenhuma lógica desse fluxo depende de um facilitador em runtime.

  it('voto unânime de LOBBY_FORCE_START inicia com subset e dropa ausentes', async () => {
    const creator = await connect();
    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();

    const { id: sessionId, pin } = await createRoom(creator, 4); // sala de 4
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);
    const p3Id = await joinRoom(p3, pin); // P4 nunca vai entrar

    p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id });
    p2.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p2Id });
    p3.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p3Id });

    await new Promise((r) => setTimeout(r, 150));

    p1.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p1Id });
    p2.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p2Id });

    const [starting] = await Promise.all([
      waitFor<{ sessionId: string; autoStartAt: number }>(p1, EVENTS.GAME_STARTING, 3000),
      Promise.resolve(p3.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p3Id })),
    ]);
    expect(starting.sessionId).toBe(sessionId);
  }, 10000);

  it('jogador no CharacterSelect recebe PLAYER_DROPPED no voto unânime', async () => {
    const creator = await connect();
    const p1 = await connect();
    const p2 = await connect();
    const pAbsent = await connect();

    const { id: sessionId, pin } = await createRoom(creator, 3); // sala de 3
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);
    const pAbsentId = await joinRoom(pAbsent, pin); // entrou mas não foi ao lobby

    p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id });
    p2.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p2Id });
    await new Promise((r) => setTimeout(r, 150));

    const [dropped] = await Promise.all([
      waitFor<{ sessionId: string; playerId: string; reason: string }>(pAbsent, EVENTS.PLAYER_DROPPED, 3000),
      Promise.resolve(p1.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p1Id })),
      Promise.resolve(p2.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p2Id })),
    ]);

    expect(dropped.sessionId).toBe(sessionId);
    expect(dropped.playerId).toBe(pAbsentId);
    expect(dropped.reason).toBe('FORCE_START');
  }, 10000);

  it('LOBBY_FORCE_START emite progresso parcial aos presentes', async () => {
    const creator = await connect();
    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();

    const { id: sessionId, pin } = await createRoom(creator, 4);
    const p1Id = await joinRoom(p1, pin);
    const p2Id = await joinRoom(p2, pin);
    await joinRoom(p3, pin);

    p1.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p1Id });
    p2.emit(EVENTS.LOBBY_READY, { sessionId, playerId: p2Id });
    await new Promise((r) => setTimeout(r, 150));

    const [progress] = await Promise.all([
      waitFor<{ sessionId: string; votes: number; needed: number }>(p2, EVENTS.LOBBY_FORCE_START_PROGRESS, 3000),
      Promise.resolve(p1.emit(EVENTS.LOBBY_FORCE_START, { sessionId, playerId: p1Id })),
    ]);

    expect(progress.votes).toBe(1);
    expect(progress.needed).toBe(2);
  }, 8000);

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
