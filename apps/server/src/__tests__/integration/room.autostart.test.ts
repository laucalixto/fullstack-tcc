import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EVENTS, type GameSession } from '@safety-board/shared';
import { SessionManager } from '../../game/SessionManager.js';
import { attachSocketIO } from '../../socket.js';

// ─── RED: Bugs 1 & 2 — maxPlayers via payload + auto-start ──────────────────
//
// Bug 2: ROOM_CREATE ignora maxPlayers; servidor deve respeitar configuração.
// Bug 1: quando sala atinge maxPlayers, jogo deve iniciar automaticamente
//        após um breve delay (autoStartDelayMs, padrão 5000ms, injetável nos testes).

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => { clearTimeout(timer); resolve(data); });
  });
}

describe('room — maxPlayers e auto-start (integração)', () => {
  let httpServer: HttpServer;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    // autoStartDelayMs=100 para testes rápidos — parâmetro ainda não existe (RED)
    // @ts-ignore — segundo argumento (opts) ainda não aceito por attachSocketIO
    attachSocketIO(httpServer, new SessionManager({ rollDiceFn: () => 3 }), { autoStartDelayMs: 100 });
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

  // ── Bug 2: maxPlayers no ROOM_CREATE ─────────────────────────────────────

  it('room:join emite room:error ROOM_FULL quando sala com maxPlayers=2 já está cheia', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();
    const p3  = await connect();

    // Cria sala com maxPlayers=2 (campo ainda não processado no servidor — RED)
    const state = await new Promise<GameSession>((resolve) => {
      fac.once(EVENTS.GAME_STATE, resolve);
      fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1', maxPlayers: 2 });
    });
    const pin = state.pin;

    // P1 e P2 entram — deveria lotar com maxPlayers=2
    const join = (sock: ClientSocket) =>
      new Promise<void>((resolve) => {
        sock.once(EVENTS.GAME_STATE, () => resolve());
        sock.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Player' });
      });

    await join(p1);
    await join(p2);

    // P3 tenta entrar — deve receber ROOM_FULL
    const [error] = await Promise.all([
      waitFor<{ code: string }>(p3, EVENTS.ROOM_ERROR),
      Promise.resolve(p3.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'P3' })),
    ]);

    expect(error.code).toBe('ROOM_FULL');
  }, 8000);

  it('sala com maxPlayers=2 não permite 3º jogador enquanto sala com maxPlayers=4 permite', async () => {
    const fac  = await connect();
    const fac2 = await connect();
    const p1   = await connect();
    const p2   = await connect();
    const p3   = await connect();
    const p4   = await connect();

    // Sala A: maxPlayers=2
    const stateA = await new Promise<GameSession>((resolve) => {
      fac.once(EVENTS.GAME_STATE, resolve);
      fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1', maxPlayers: 2 });
    });

    // Sala B: maxPlayers=4 (padrão)
    const stateB = await new Promise<GameSession>((resolve) => {
      fac2.once(EVENTS.GAME_STATE, resolve);
      fac2.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-2' });
    });

    // Encher sala A
    await new Promise<void>((r) => { p1.once(EVENTS.GAME_STATE, () => r()); p1.emit(EVENTS.ROOM_JOIN, { pin: stateA.pin, playerName: 'P1' }); });
    await new Promise<void>((r) => { p2.once(EVENTS.GAME_STATE, () => r()); p2.emit(EVENTS.ROOM_JOIN, { pin: stateA.pin, playerName: 'P2' }); });

    // Sala A: 3º deve ser rejeitado
    const [errorA] = await Promise.all([
      waitFor<{ code: string }>(p3, EVENTS.ROOM_ERROR),
      Promise.resolve(p3.emit(EVENTS.ROOM_JOIN, { pin: stateA.pin, playerName: 'P3' })),
    ]);
    expect(errorA.code).toBe('ROOM_FULL');

    // Sala B: 3º deve ser aceito (maxPlayers=4)
    const joinedB = await new Promise<{ playerId: string } | null>((resolve) => {
      p4.once(EVENTS.ROOM_JOINED, resolve);
      p4.once(EVENTS.ROOM_ERROR, () => resolve(null));
      p4.emit(EVENTS.ROOM_JOIN, { pin: stateB.pin, playerName: 'P4' });
    });
    expect(joinedB).not.toBeNull();
  }, 10000);

  // ── Bug 1: auto-start quando sala lota ────────────────────────────────────

  it('jogo inicia automaticamente após delay quando sala atinge maxPlayers', async () => {
    const fac = await connect();
    const p1  = await connect();
    const p2  = await connect();

    const state = await new Promise<GameSession>((resolve) => {
      fac.once(EVENTS.GAME_STATE, resolve);
      fac.emit(EVENTS.ROOM_CREATE, { facilitatorId: 'fac-1', maxPlayers: 2 });
    });
    const pin = state.pin;

    // P1 e P2 entram — sala lota → deve disparar auto-start após 100ms
    await new Promise<void>((r) => { p1.once(EVENTS.GAME_STATE, () => r()); p1.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'P1' }); });

    // Aguarda auto-start após P2 entrar (2000ms para folga de rede + delay=100ms)
    const [gameState] = await Promise.all([
      waitFor<GameSession>(p2, EVENTS.GAME_STATE, 2000),
      new Promise<void>((r) => {
        p2.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'P2' });
        r();
      }),
    ]);

    // Primeiro GAME_STATE é do join; aguarda o próximo com state=ACTIVE
    if (gameState.state !== 'ACTIVE') {
      const activeState = await waitFor<GameSession>(p2, EVENTS.GAME_STATE, 2000);
      expect(activeState.state).toBe('ACTIVE');
    } else {
      expect(gameState.state).toBe('ACTIVE');
    }
  }, 10000);
});
