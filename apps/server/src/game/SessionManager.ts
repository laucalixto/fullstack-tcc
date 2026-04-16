import { randomUUID } from 'node:crypto';
import { GameStateMachine } from '../engine/GameStateMachine';
import { TurnManager } from '../engine/TurnManager';
import { DiceService } from '../engine/DiceService';
import { PINGenerator } from '../session/PINGenerator';
import { QuizService, type ServedQuestion, type QuizCheckResult } from './QuizService';
import { EVENTS, isQuizTile, getNormForTile } from '@safety-board/shared';
import type { GameSession, Player, QuizConfig } from '@safety-board/shared';

const MAX_PLAYERS = 4;

const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  activeNormIds: ['NR-06', 'NR-10', 'NR-12', 'NR-35'],
  timeoutSeconds: 30,
};

interface PendingQuiz {
  playerId: string;
  questionId: string;
  nextPlayerId: string; // guardado para emitir TURN_CHANGED após resposta
}

interface SessionEntry {
  session: GameSession;
  fsm: GameStateMachine;
  turnManager: TurnManager | null;
  usedQuestionIds: Set<string>;
  pendingQuiz: PendingQuiz | null;
}

interface SessionManagerConfig {
  rollDiceFn?: () => number;
  quizService?: QuizService;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly pinToId = new Map<string, string>();
  private readonly rollDiceFn: () => number;
  private readonly quizService: QuizService;

  constructor(rollDiceFnOrConfig: (() => number) | SessionManagerConfig = {}) {
    if (typeof rollDiceFnOrConfig === 'function') {
      this.rollDiceFn = rollDiceFnOrConfig;
      this.quizService = new QuizService();
    } else {
      this.rollDiceFn = rollDiceFnOrConfig.rollDiceFn ?? DiceService.roll;
      this.quizService = rollDiceFnOrConfig.quizService ?? new QuizService();
    }
  }

  createSession(facilitatorId: string, quizConfig?: Partial<QuizConfig>): GameSession {
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
      quizConfig: {
        activeNormIds: quizConfig?.activeNormIds ?? DEFAULT_QUIZ_CONFIG.activeNormIds,
        timeoutSeconds: quizConfig?.timeoutSeconds ?? DEFAULT_QUIZ_CONFIG.timeoutSeconds,
      },
    };

    this.sessions.set(id, {
      session,
      fsm: new GameStateMachine(),
      turnManager: null,
      usedQuestionIds: new Set(),
      pendingQuiz: null,
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
  ): { dice: number; newPosition: number; nextPlayerId: string; quiz?: ServedQuestion } {
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

    // ── Quiz trigger ─────────────────────────────────────────────────────────
    if (isQuizTile(player.position)) {
      const normId = getNormForTile(player.position, session.quizConfig.activeNormIds);
      try {
        const question = this.quizService.getRandomQuestion(normId, entry.usedQuestionIds);
        const served = this.quizService.serveQuestion(question.id);
        if (served) {
          entry.pendingQuiz = { playerId, questionId: question.id, nextPlayerId };
          return { dice, newPosition: player.position, nextPlayerId, quiz: served };
        }
      } catch {
        // banco esgotado para essa norma — segue sem quiz
      }
    }

    return { dice, newPosition: player.position, nextPlayerId };
  }

  submitAnswer(
    sessionId: string,
    playerId: string,
    questionId: string,
    selectedText: string,
  ): { result: QuizCheckResult; nextPlayerId: string } {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('SESSION_NOT_FOUND');

    const { pendingQuiz } = entry;
    if (!pendingQuiz) throw new Error('NO_PENDING_QUIZ');
    if (pendingQuiz.playerId !== playerId) throw new Error('NOT_YOUR_TURN');
    if (pendingQuiz.questionId !== questionId) throw new Error('QUESTION_MISMATCH');

    entry.usedQuestionIds.add(questionId);
    entry.pendingQuiz = null;

    const result = this.quizService.checkAnswer(questionId, selectedText);
    if (result.correct) {
      const player = entry.session.players.find((p) => p.id === playerId);
      if (player) player.score += 1;
    }

    return { result, nextPlayerId: pendingQuiz.nextPlayerId };
  }
}
