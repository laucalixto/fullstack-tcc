import { describe, it, expect, vi } from 'vitest';
import { registerPingHandler } from '../handlers/ping.handler';

// ─── RED: estes testes devem falhar até ping.handler.ts ser implementado ─────

describe('PingHandler', () => {
  it('registra listener para o evento "ping"', () => {
    const socket = { on: vi.fn(), emit: vi.fn() } as any;
    registerPingHandler(socket);
    const registeredEvents = socket.on.mock.calls.map(([event]: [string]) => event);
    expect(registeredEvents).toContain('ping');
  });

  it('emite "pong" com ok:true ao receber "ping"', () => {
    const socket = { on: vi.fn(), emit: vi.fn() } as any;
    registerPingHandler(socket);

    const [[, callback]] = socket.on.mock.calls.filter(([e]: [string]) => e === 'ping');
    callback();

    expect(socket.emit).toHaveBeenCalledWith('pong', expect.objectContaining({ ok: true }));
  });

  it('inclui timestamp numérico no payload do pong', () => {
    const before = Date.now();
    const socket = { on: vi.fn(), emit: vi.fn() } as any;
    registerPingHandler(socket);

    const [[, callback]] = socket.on.mock.calls.filter(([e]: [string]) => e === 'ping');
    callback();

    const [, payload] = socket.emit.mock.calls[0];
    expect(typeof payload.timestamp).toBe('number');
    expect(payload.timestamp).toBeGreaterThanOrEqual(before);
  });
});
