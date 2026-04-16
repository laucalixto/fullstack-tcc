import { describe, it, expect, vi } from 'vitest';
import { GameStateMachine } from '../../engine/GameStateMachine';

// ─── RED: falha até GameStateMachine.ts ser implementado ─────────────────────

describe('GameStateMachine', () => {
  it('inicia no estado WAITING', () => {
    const fsm = new GameStateMachine();
    expect(fsm.state).toBe('WAITING');
  });

  it('transiciona para ACTIVE ao receber game:start em WAITING', () => {
    const fsm = new GameStateMachine();
    fsm.dispatch('game:start');
    expect(fsm.state).toBe('ACTIVE');
  });

  it('transiciona para FINISHED ao receber game:finished em ACTIVE', () => {
    const fsm = new GameStateMachine();
    fsm.dispatch('game:start');
    fsm.dispatch('game:finished');
    expect(fsm.state).toBe('FINISHED');
  });

  it('rejeita game:start se já está ACTIVE', () => {
    const fsm = new GameStateMachine();
    fsm.dispatch('game:start');
    expect(() => fsm.dispatch('game:start')).toThrow(/invalid transition/i);
  });

  it('rejeita game:finished em WAITING', () => {
    const fsm = new GameStateMachine();
    expect(() => fsm.dispatch('game:finished')).toThrow(/invalid transition/i);
  });

  it('rejeita qualquer evento em FINISHED', () => {
    const fsm = new GameStateMachine();
    fsm.dispatch('game:start');
    fsm.dispatch('game:finished');
    expect(() => fsm.dispatch('game:start')).toThrow(/invalid transition/i);
  });

  it('rejeita eventos desconhecidos', () => {
    const fsm = new GameStateMachine();
    expect(() => fsm.dispatch('evento:invalido')).toThrow(/unknown event/i);
  });

  it('notifica listener de transição com from, to e event', () => {
    const fsm = new GameStateMachine();
    const listener = vi.fn();
    fsm.onTransition(listener);
    fsm.dispatch('game:start');
    expect(listener).toHaveBeenCalledWith({
      from: 'WAITING',
      to: 'ACTIVE',
      event: 'game:start',
    });
  });

  it('suporta múltiplos listeners de transição', () => {
    const fsm = new GameStateMachine();
    const a = vi.fn();
    const b = vi.fn();
    fsm.onTransition(a);
    fsm.onTransition(b);
    fsm.dispatch('game:start');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
