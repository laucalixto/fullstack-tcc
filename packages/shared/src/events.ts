// Catálogo central de eventos Socket.io — compartilhado entre client e server
// Toda string de evento vive aqui; nunca hard-code event names fora deste arquivo.

export const EVENTS = {
  // ─── Smoke / infra ────────────────────────────────────────────────────────
  PING: 'ping',
  PONG: 'pong',

  // ─── Sala / lobby ─────────────────────────────────────────────────────────
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_ERROR: 'room:error',
  LOBBY_READY: 'lobby:ready',
  GAME_STARTING: 'game:starting',

  // ─── Jogo ─────────────────────────────────────────────────────────────────
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_FINISHED: 'game:finished',
  PLAYER_GAME_READY: 'player:game:ready',
  GAME_BEGIN: 'game:begin',

  // ─── Turno ────────────────────────────────────────────────────────────────
  TURN_ROLL: 'turn:roll',
  TURN_RESULT: 'turn:result',
  TURN_CHANGED: 'turn:changed',

  // ─── Quiz ─────────────────────────────────────────────────────────────────
  QUIZ_QUESTION: 'quiz:question',
  QUIZ_ANSWER: 'quiz:answer',
  QUIZ_RESULT: 'quiz:result',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface PongPayload {
  ok: boolean;
  timestamp: number;
}

export interface RoomCreatePayload {
  facilitatorId: string;
  name?: string;
  maxPlayers?: 2 | 3 | 4;
  quizConfig?: {
    activeNormIds: string[];
    timeoutSeconds?: number;
  };
}

export interface RoomJoinPayload {
  pin: string;
  playerName: string;
}

export interface RoomJoinedPayload {
  sessionId: string;
  playerId: string;
  pin: string;
}

export interface RoomErrorPayload {
  code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'NOT_YOUR_TURN';
  message: string;
}

export interface QuizQuestionPayload {
  sessionId: string;
  playerId: string;        // jogador que deve responder
  question: {
    id: string;
    normId: string;
    text: string;
    options: string[];     // embaralhadas
  };
  timeoutSeconds: number;
}

export interface QuizAnswerPayload {
  sessionId: string;
  playerId: string;
  questionId: string;
  selectedText: string;
}

export interface QuizResultPayload {
  sessionId: string;
  playerId: string;
  correct: boolean;
  correctText: string;
}

export interface GameFinishedPayload {
  sessionId: string;
  players: import('./types').GameResultPlayer[];  // ordenados por rank
  durationSeconds: number;
}

export interface LobbyReadyPayload {
  sessionId: string;
  playerId: string;
}

export interface GameStartingPayload {
  sessionId: string;
  autoStartAt: number; // timestamp Date.now() + delayMs
}

export interface PlayerGameReadyPayload {
  sessionId: string;
  playerId: string;
}

export interface GameBeginPayload {
  sessionId: string;
}
