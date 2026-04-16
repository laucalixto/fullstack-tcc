import type { GameState } from '@safety-board/shared';
import { EVENTS } from '@safety-board/shared';

type GameEvent = typeof EVENTS.GAME_START | typeof EVENTS.GAME_FINISHED;

export interface TransitionEvent {
  from: GameState;
  to: GameState;
  event: GameEvent;
}

type TransitionListener = (event: TransitionEvent) => void;

const KNOWN_EVENTS = new Set<string>([EVENTS.GAME_START, EVENTS.GAME_FINISHED]);

const TRANSITIONS: Record<GameState, Partial<Record<GameEvent, GameState>>> = {
  WAITING: {
    [EVENTS.GAME_START]: 'ACTIVE',
  },
  ACTIVE: {
    [EVENTS.GAME_FINISHED]: 'FINISHED',
  },
  FINISHED: {},
};

export class GameStateMachine {
  private _state: GameState = 'WAITING';
  private readonly listeners: TransitionListener[] = [];

  get state(): GameState {
    return this._state;
  }

  dispatch(event: string): void {
    if (!KNOWN_EVENTS.has(event)) {
      throw new Error(`Unknown event: "${event}"`);
    }

    const next = TRANSITIONS[this._state][event as GameEvent];

    if (next === undefined) {
      throw new Error(
        `Invalid transition: event "${event}" not allowed in state "${this._state}"`,
      );
    }

    const from = this._state;
    this._state = next;
    this.listeners.forEach((fn) => fn({ from, to: next, event: event as GameEvent }));
  }

  onTransition(listener: TransitionListener): void {
    this.listeners.push(listener);
  }
}
