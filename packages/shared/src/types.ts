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

export interface GameSession {
  id: SessionId;
  pin: string;
  facilitatorId: FacilitatorId;
  state: GameState;
  players: Player[];
  currentPlayerIndex: number;
  createdAt: number;
}
