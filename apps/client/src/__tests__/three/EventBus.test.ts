import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../three/EventBus';

// ─── RED: falha até EventBus.ts ser implementado ──────────────────────────────

describe('EventBus', () => {
  it('emit dispara handler registrado com on()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test-event', handler);
    bus.emit('test-event', { value: 42 });
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('handler não é chamado para eventos diferentes', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('event-a', handler);
    bus.emit('event-b', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('múltiplos handlers no mesmo evento são todos chamados', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('ev', h1);
    bus.on('ev', h2);
    bus.emit('ev', 'payload');
    expect(h1).toHaveBeenCalledWith('payload');
    expect(h2).toHaveBeenCalledWith('payload');
  });

  it('off() remove o handler corretamente', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.on('ev', handler);
    off(); // remove
    bus.emit('ev', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('emit sem payload não lança erro e chama o handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('ev', handler);
    expect(() => bus.emit('ev')).not.toThrow();
    // CustomEvent.detail é null quando detail não é fornecido (comportamento do DOM)
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
