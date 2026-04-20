import { randomUUID } from 'node:crypto';
import { GameStateMachine } from '../engine/GameStateMachine.js';
import { TurnManager } from '../engine/TurnManager.js';
import { DiceService } from '../engine/DiceService.js';
import { PINGenerator } from '../session/PINGenerator.js';
import { QuizService, type ServedQuestion, type QuizCheckResult } from './QuizService.js';
import { EVENTS, isQuizTile, getNormForTile, isTileEffect, TILE_EFFECTS } from '@safety-board/shared';
import type { GameSession, Player, QuizConfig, GameResultPayload, GameResultPlayer, TileEffectDefinition } from '@safety-board/shared';

const DEFAULT_MAX_PLAYERS = 4;

const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  activeNormIds: ['NR-06', 'NR-10', 'NR-12', 'NR-35'],
  timeoutSeconds: 30,
};

interface PendingQuiz {
  playerId: string;
  questionId: string;
  nextPlayerId: string;
  servedAt: number;
}

interface PendingTileEffect {
  playerId: string;
  effect: TileEffectDefinition;
  nextPlayerId: string;
}

interface SessionEntry {
  session: GameSession;
  fsm: GameStateMachine;
  turnManager: TurnManager | null;
  usedQuestionIds: Set<string>;
  pendingQuiz: PendingQuiz | null;
  startedAt: number | null;
  correctAnswersByPlayer: Map<string, number>;
  totalAnswersByPlayer: Map<string, number>;
  lobbyReadyPlayers: Set<string>;
  gameReadyPlayers: Set<string>;
  finishCandidateId: string | null;
  finishRoundLastPlayerIndex: number | null;
  pendingTileEffect: PendingTileEffect | null;
}

interface SessionManagerConfig {
  rollDiceFn?: () => number;
  quizService?: QuizService;
  nowFn?: () => number;  // injetável para testes determinísticos
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly pinToId = new Map<string, string>();
  private readonly rollDiceFn: () => number;
  private readonly quizService: QuizService;
  private readonly nowFn: () => number;

  constructor(rollDiceFnOrConfig: (() => number) | SessionManagerConfig = {}) {
    if (typeof rollDiceFnOrConfig === 'function') {
      this.rollDiceFn = rollDiceFnOrConfig;
      this.quizService = new QuizService();
      this.nowFn = Date.now;
    } else {
      this.rollDiceFn = rollDiceFnOrConfig.rollDiceFn ?? DiceService.roll;
      this.quizService = rollDiceFnOrConfig.quizService ?? new QuizService();
      this.nowFn = rollDiceFnOrConfig.nowFn ?? Date.now;
    }
  }

  createSession(facilitatorId: string, quizConfig?: Partial<QuizConfig>, name?: string, maxPlayers: 2 | 3 | 4 = DEFAULT_MAX_PLAYERS): GameSession {
    const existingPins = new Set(this.pinToId.keys());
    const pin = PINGenerator.generate(existingPins);
    const id = randomUUID();
    const sessionName = name ?? 'Sessão Safety Board';
    const shareLink = `/sala/${pin}`;

    const session: GameSession = {
      id,
      pin,
      name: sessionName,
      shareLink,
      facilitatorId,
      state: 'WAITING',
      players: [],
      currentPlayerIndex: 0,
      createdAt: Date.now(),
      quizConfig: {
        activeNormIds: quizConfig?.activeNormIds ?? DEFAULT_QUIZ_CONFIG.activeNormIds,
        timeoutSeconds: quizConfig?.timeoutSeconds ?? DEFAULT_QUIZ_CONFIG.timeoutSeconds,
      },
      maxPlayers,
      lobbyReadyPlayers: [],
    };

    this.sessions.set(id, {
      session,
      fsm: new GameStateMachine(),
      turnManager: null,
      usedQuestionIds: new Set(),
      pendingQuiz: null,
      startedAt: null,
      correctAnswersByPlayer: new Map(),
      totalAnswersByPlayer: new Map(),
      lobbyReadyPlayers: new Set(),
      gameReadyPlayers: new Set(),
      finishCandidateId: null,
      finishRoundLastPlayerIndex: null,
      pendingTileEffect: null,
    });
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

  joinSession(pin: string, playerName: string): { session: GameSession; playerId: string; isFull: boolean } {
    const id = this.pinToId.get(pin);
    if (!id) throw new Error('ROOM_NOT_FOUND');

    const entry = this.sessions.get(id)!;
    const { session } = entry;

    if (session.state !== 'WAITING') throw new Error('GAME_ALREADY_STARTED');
    if (session.players.length >= session.maxPlayers) throw new Error('ROOM_FULL');

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: playerName,
      position: 0,
      score: 0,
      isConnected: true,
    };
    session.players.push(player);
    const isFull = session.players.length >= session.maxPlayers;
    return { session, playerId, isFull };
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
    entry.startedAt = Date.now();
    tm.start();
    return session;
  }

  rollDice(
    sessionId: string,
    playerId: string,
  ): { dice: number; newPosition: number; nextPlayerId: string; quiz?: ServedQuestion; tileEffect?: TileEffectDefinition; gameOver?: boolean } {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { session, turnManager } = entry;
    const rollerIndex = session.currentPlayerIndex;
    const currentPlayer = session.players[rollerIndex];

    if (!turnManager || currentPlayer.id !== playerId) {
      throw new Error('NOT_YOUR_TURN');
    }

    const dice = this.rollDiceFn();
    const player = session.players.find((p) => p.id === playerId)!;
    player.position = Math.min(player.position + dice, 39);

    // ── Avanço de turno com skip ─────────────────────────────────────────────
    let nextPlayerId = turnManager.next();
    let nextPlayer = session.players.find((p) => p.id === nextPlayerId)!;
    if (nextPlayer.skipNextTurn) {
      nextPlayer.skipNextTurn = false;
      nextPlayerId = turnManager.next();
    }
    session.currentPlayerIndex = session.players.findIndex((p) => p.id === nextPlayerId);

    // ── Última rodada ────────────────────────────────────────────────────────
    const isLastInRound = rollerIndex === session.players.length - 1;
    if (entry.finishCandidateId !== null && isLastInRound) {
      return { dice, newPosition: player.position, nextPlayerId, gameOver: true };
    }

    if (player.position >= 39) {
      if (isLastInRound) {
        return { dice, newPosition: player.position, nextPlayerId, gameOver: true };
      }
      entry.finishCandidateId = playerId;
      entry.finishRoundLastPlayerIndex = session.players.length - 1;
      session.finishCandidateId = playerId;
    }

    // ── Tile effect trigger ──────────────────────────────────────────────────
    if (isTileEffect(player.position)) {
      const effect = TILE_EFFECTS[player.position];
      entry.pendingTileEffect = { playerId, effect, nextPlayerId };
      return { dice, newPosition: player.position, nextPlayerId, tileEffect: effect };
    }

    // ── Quiz trigger ─────────────────────────────────────────────────────────
    if (isQuizTile(player.position)) {
      const normId = getNormForTile(player.position, session.quizConfig.activeNormIds);
      try {
        const question = this.quizService.getRandomQuestion(normId, entry.usedQuestionIds);
        const served = this.quizService.serveQuestion(question.id);
        if (served) {
          entry.pendingQuiz = { playerId, questionId: question.id, nextPlayerId, servedAt: this.nowFn() };
          return { dice, newPosition: player.position, nextPlayerId, quiz: served };
        }
      } catch {
        // banco esgotado para essa norma — segue sem quiz
      }
    }

    return { dice, newPosition: player.position, nextPlayerId };
  }

  applyTileEffect(sessionId: string, playerId: string): { nextPlayerId: string } {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { pendingTileEffect, session } = entry;
    if (!pendingTileEffect) throw new Error('NO_PENDING_TILE_EFFECT');
    if (pendingTileEffect.playerId !== playerId) throw new Error('NOT_YOUR_TURN');

    const player = session.players.find((p) => p.id === playerId)!;
    const { effect, nextPlayerId } = pendingTileEffect;
    entry.pendingTileEffect = null;

    if (effect.backToStart) {
      player.position = 0;
    } else {
      player.position = Math.max(0, Math.min(39, player.position + effect.deltaPosition));
    }

    player.score += effect.deltaScore;

    if (effect.skipTurns > 0) {
      player.skipNextTurn = true;
    }

    return { nextPlayerId };
  }

  submitAnswer(
    sessionId: string,
    playerId: string,
    questionId: string,
    selectedText: string,
    latencyMs: number = 0,
  ): { result: QuizCheckResult; nextPlayerId: string } {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { pendingQuiz } = entry;
    if (!pendingQuiz) throw new Error('NO_PENDING_QUIZ');
    if (pendingQuiz.playerId !== playerId) throw new Error('NOT_YOUR_TURN');
    if (pendingQuiz.questionId !== questionId) throw new Error('QUESTION_MISMATCH');

    entry.usedQuestionIds.add(questionId);
    entry.pendingQuiz = null;

    const prev = entry.totalAnswersByPlayer.get(playerId) ?? 0;
    entry.totalAnswersByPlayer.set(playerId, prev + 1);

    const result = this.quizService.checkAnswer(questionId, selectedText);
    const points = this._calcPoints(pendingQuiz.servedAt, latencyMs, entry.session.quizConfig.timeoutSeconds);

    const player = entry.session.players.find((p) => p.id === playerId);
    if (player) {
      player.score += result.correct ? points : -points;
    }

    if (result.correct) {
      const prevCorrect = entry.correctAnswersByPlayer.get(playerId) ?? 0;
      entry.correctAnswersByPlayer.set(playerId, prevCorrect + 1);
    }

    return { result, nextPlayerId: pendingQuiz.nextPlayerId };
  }

  private _calcPoints(servedAt: number, latencyMs: number, timeoutSeconds: number): number {
    const timeoutMs = timeoutSeconds * 1000;
    const elapsed = this.nowFn() - servedAt;
    const oneWayMs = latencyMs / 2;
    const adjusted = Math.max(elapsed - oneWayMs, 0);
    const timeLeftMs = Math.max(timeoutMs - adjusted, 0);
    return Math.round((timeLeftMs / timeoutMs) * 100);
  }

  finishGame(sessionId: string): GameResultPayload {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { session, fsm } = entry;
    fsm.dispatch(EVENTS.GAME_FINISHED);
    session.state = fsm.state;

    const durationSeconds = entry.startedAt
      ? Math.round((Date.now() - entry.startedAt) / 1000)
      : 0;

    const sorted = [...session.players].sort((a, b) => b.score - a.score);

    const players: GameResultPlayer[] = sorted.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      score: p.score,
      rank: (i + 1) as 1 | 2 | 3 | 4,
      finalPosition: p.position,
      correctAnswers: entry.correctAnswersByPlayer.get(p.id) ?? 0,
      totalAnswers: entry.totalAnswersByPlayer.get(p.id) ?? 0,
    }));

    return { sessionId, players, durationSeconds };
  }

  markLobbyReady(sessionId: string, playerId: string): boolean {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');
    entry.lobbyReadyPlayers.add(playerId);
    // Keep session.lobbyReadyPlayers in sync (for GAME_STATE broadcasts)
    entry.session.lobbyReadyPlayers = [...entry.lobbyReadyPlayers];
    return entry.lobbyReadyPlayers.size >= entry.session.maxPlayers;
  }

  renamePlayer(sessionId: string, playerId: string, name: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');
    const player = entry.session.players.find((p) => p.id === playerId);
    if (!player) throw new Error('PLAYER_NOT_FOUND');
    player.name = name;
  }

  markGameReady(sessionId: string, playerId: string): boolean {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');
    entry.gameReadyPlayers.add(playerId);
    return entry.gameReadyPlayers.size >= entry.session.players.length;
  }

  allSessions(): Array<{ session: GameSession; startedAt: number | null }> {
    return [...this.sessions.values()].map((e) => ({
      session: e.session,
      startedAt: e.startedAt,
    }));
  }
}
