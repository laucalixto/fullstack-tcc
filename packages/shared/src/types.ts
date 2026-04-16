// Tipos de domínio compartilhados entre client e server.
// Tipos específicos de cada camada ficam nos próprios pacotes.

export type PlayerId = string;
export type SessionId = string;
export type FacilitatorId = string;

export type GameState = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface Player {
  id: PlayerId;
  name: string;
  position: number; // índice 0-39 no BOARD_PATH
  score: number;
  isConnected: boolean;
}

export interface QuizConfig {
  activeNormIds: string[];  // normas ativas escolhidas pelo facilitador
  timeoutSeconds: number;   // tempo por pergunta (padrão: 30)
}

export interface QuizServedQuestion {
  id: string;
  normId: string;
  text: string;
  options: string[]; // embaralhadas — sem correctIndex
}

export interface GameSession {
  id: SessionId;
  pin: string;
  facilitatorId: FacilitatorId;
  state: GameState;
  players: Player[];
  currentPlayerIndex: number;
  createdAt: number;
  quizConfig: QuizConfig;
}

export interface GameResultPlayer {
  playerId: PlayerId;
  name: string;
  score: number;
  rank: 1 | 2 | 3 | 4;         // calculado pelo server
  finalPosition: number;         // casa final no tabuleiro
  correctAnswers: number;
  totalAnswers: number;
}

export interface GameResultPayload {
  sessionId: SessionId;
  players: GameResultPlayer[];   // ordenados por rank (1º primeiro)
  durationSeconds: number;       // tempo da partida
}
