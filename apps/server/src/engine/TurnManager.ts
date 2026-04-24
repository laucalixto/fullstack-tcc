import type { PlayerId } from '@safety-board/shared';

interface TurnManagerOptions {
  onInactivity?: (playerId: PlayerId) => void;
  inactivityMs?: number;
  startIndex?: number;
}

export class TurnManager {
  private readonly players: PlayerId[];
  private currentIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly onInactivity: (playerId: PlayerId) => void;
  private readonly inactivityMs: number;

  constructor(players: PlayerId[], options: TurnManagerOptions = {}) {
    if (players.length === 0) {
      throw new Error('TurnManager: players list cannot be empty');
    }
    if (options.startIndex !== undefined) {
      if (options.startIndex < 0 || options.startIndex >= players.length) {
        throw new Error(`TurnManager: startIndex out of range`);
      }
      this.currentIndex = options.startIndex;
    }
    this.players = [...players];
    this.onInactivity = options.onInactivity ?? (() => undefined);
    this.inactivityMs = options.inactivityMs ?? 15_000;
  }

  get currentPlayer(): PlayerId {
    return this.players[this.currentIndex];
  }

  /** Avança para o próximo jogador e reinicia o timer de inatividade. */
  next(): PlayerId {
    this.currentIndex = (this.currentIndex + 1) % this.players.length;
    this.resetTimer();
    return this.players[this.currentIndex];
  }

  /** Inicia o timer de inatividade para o turno atual. */
  start(): void {
    this.resetTimer();
  }

  /** Para o timer de inatividade sem avançar o turno. */
  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private resetTimer(): void {
    this.stop();
    this.timer = setTimeout(() => {
      this.onInactivity(this.currentPlayer);
    }, this.inactivityMs);
  }
}
