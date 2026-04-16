import { randomUUID } from 'node:crypto';
import { GameStateMachine } from '../engine/GameStateMachine';
import { TurnManager } from '../engine/TurnManager';
import { DiceService } from '../engine/DiceService';
import { PINGenerator } from '../session/PINGenerator';
import { EVENTS } from '@safety-board/shared';
import type { GameSession, Player } from '@safety-board/shared';

const MAX_PLAYERS = 4;

interface SessionEntry {
  session: GameSession;
  fsm: GameStateMachine;
  turnManager: TurnManager | null;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly pinToId = new Map<string, string>();
  private readonly rollDiceFn: () => number;

  constructor(rollDiceFn: () => number = DiceService.roll) {
    this.rollDiceFn = rollDiceFn;
  }

  createSession(facilitatorId: string): GameSession {
    const existingPins = new Set(this.pinToId.keys());
    const pin = PINGenerator.generate(existingPins);
    const id = randomUUID();

    const session: GameSession = {
      id,
      pin,
      facilitatorId,
      state: 'WAITING',
      players: [],
      currentPlayerIndex: 0,
      createdAt: Date.now(),
    };

    this.sessions.set(id, { session, fsm: new GameStateMachine(), turnManager: null });
    this.pinToId.set(pin, id);
    return session;
  }

  getByPin(pin: string): GameSession | undefined {
    const id = this.pinToId.get(pin);
    return id ? this.sessions.get(id)?.session : undefined;
  }

  getById(id: string): GameSession | undefined {
    return this.sessions.get(id)?.session;
  }

  joinSession(pin: string, playerName: string): { session: GameSession; playerId: string } {
    const id = this.pinToId.get(pin);
    if (!id) throw new Error('ROOM_NOT_FOUND');

    const entry = this.sessions.get(id)!;
    const { session } = entry;

    if (session.state !== 'WAITING') throw new Error('GAME_ALREADY_STARTED');
    if (session.players.length >= MAX_PLAYERS) throw new Error('ROOM_FULL');

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: playerName,
      position: 0,
      score: 0,
      isConnected: true,
    };
    session.players.push(player);
    return { session, playerId };
  }

  startGame(sessionId: string): GameSession {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { session, fsm } = entry;
    const playerIds = session.players.map((p) => p.id);
    const tm = new TurnManager(playerIds);
    entry.turnManager = tm;

    fsm.dispatch(EVENTS.GAME_START);
    session.state = fsm.state;
    tm.start();
    return session;
  }

  rollDice(
    sessionId: string,
    playerId: string,
  ): { dice: number; newPosition: number; nextPlayerId: string } {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { session, turnManager } = entry;
    const currentPlayer = session.players[session.currentPlayerIndex];

    if (!turnManager || currentPlayer.id !== playerId) {
      throw new Error('NOT_YOUR_TURN');
    }

    const dice = this.rollDiceFn();
    const player = session.players.find((p) => p.id === playerId)!;
    player.position = Math.min(player.position + dice, 39);

    const nextPlayerId = turnManager.next();
    session.currentPlayerIndex = session.players.findIndex((p) => p.id === nextPlayerId);

    return { dice, newPosition: player.position, nextPlayerId };
  }
}
