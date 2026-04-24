import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TurnManager } from '../../engine/TurnManager.js';

// ─── RED: falha até TurnManager.ts ser implementado ──────────────────────────

describe('TurnManager', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('lança erro se criado com lista vazia de jogadores', () => {
    expect(() => new TurnManager([])).toThrow(/empty/i);
  });

  it('currentPlayer retorna o primeiro jogador inicialmente', () => {
    const tm = new TurnManager(['p1', 'p2', 'p3']);
    expect(tm.currentPlayer).toBe('p1');
  });

  it('next() avança para o próximo jogador', () => {
    const tm = new TurnManager(['p1', 'p2', 'p3']);
    tm.next();
    expect(tm.currentPlayer).toBe('p2');
  });

  it('next() rotaciona do último de volta ao primeiro', () => {
    const tm = new TurnManager(['p1', 'p2']);
    tm.next();
    tm.next();
    expect(tm.currentPlayer).toBe('p1');
  });

  it('aceita startIndex e começa nesse jogador', () => {
    const tm = new TurnManager(['p1', 'p2', 'p3', 'p4'], { startIndex: 2 });
    expect(tm.currentPlayer).toBe('p3');
  });

  it('next() a partir do startIndex rotaciona normalmente', () => {
    const tm = new TurnManager(['p1', 'p2', 'p3'], { startIndex: 2 });
    tm.next();
    expect(tm.currentPlayer).toBe('p1');
    tm.next();
    expect(tm.currentPlayer).toBe('p2');
  });

  it('startIndex fora do range lança erro', () => {
    expect(() => new TurnManager(['p1', 'p2'], { startIndex: 5 })).toThrow(/startIndex/i);
  });

  it('next() retorna o ID do próximo jogador', () => {
    const tm = new TurnManager(['p1', 'p2']);
    expect(tm.next()).toBe('p2');
  });

  it('dispara onInactivity com playerId após 15s', () => {
    const onInactivity = vi.fn();
    const tm = new TurnManager(['p1', 'p2'], { onInactivity });
    tm.start();
    vi.advanceTimersByTime(15_000);
    expect(onInactivity).toHaveBeenCalledTimes(1);
    expect(onInactivity).toHaveBeenCalledWith('p1');
  });

  it('não dispara onInactivity antes de 15s', () => {
    const onInactivity = vi.fn();
    const tm = new TurnManager(['p1'], { onInactivity });
    tm.start();
    vi.advanceTimersByTime(14_999);
    expect(onInactivity).not.toHaveBeenCalled();
  });

  it('next() reinicia o timer de inatividade', () => {
    const onInactivity = vi.fn();
    const tm = new TurnManager(['p1', 'p2'], { onInactivity });
    tm.start();
    vi.advanceTimersByTime(10_000);
    tm.next();                       // reset: começa a contar do zero novamente
    vi.advanceTimersByTime(10_000);  // só 10s desde o reset — não deve disparar
    expect(onInactivity).not.toHaveBeenCalled();
  });

  it('stop() cancela o timer de inatividade', () => {
    const onInactivity = vi.fn();
    const tm = new TurnManager(['p1'], { onInactivity });
    tm.start();
    tm.stop();
    vi.advanceTimersByTime(20_000);
    expect(onInactivity).not.toHaveBeenCalled();
  });

  it('funciona sem opções (sem callback de inatividade)', () => {
    const tm = new TurnManager(['p1']);
    tm.start();
    vi.advanceTimersByTime(15_000); // não deve lançar
    expect(tm.currentPlayer).toBe('p1');
  });

  it('aceita inactivityMs customizado', () => {
    const onInactivity = vi.fn();
    const tm = new TurnManager(['p1'], { onInactivity, inactivityMs: 5_000 });
    tm.start();
    vi.advanceTimersByTime(4_999);
    expect(onInactivity).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onInactivity).toHaveBeenCalledTimes(1);
  });
});
