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

  // ─── Jogo ─────────────────────────────────────────────────────────────────
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_FINISHED: 'game:finished',

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
  code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'GAME_ALREADY_STARTED';
  message: string;
}
