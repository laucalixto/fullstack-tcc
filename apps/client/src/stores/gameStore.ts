import { create } from 'zustand';
import type { GameSession, Player, GameResultPayload, LeaderboardEntry } from '@safety-board/shared';

interface GameStore {
  session: GameSession | null;
  myPlayerId: string | null;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  // Player registration flow
  pendingName: string | null;
  pendingAvatarId: string | null;
  // Post-game
  gameResult: GameResultPayload | null;
  leaderboardEntries: LeaderboardEntry[];

  setSession: (session: GameSession) => void;
  setMyPlayerId: (id: string) => void;
  setPendingPlayer: (name: string, avatarId: string) => void;
  setGameResult: (result: GameResultPayload) => void;
  setLeaderboardEntries: (entries: LeaderboardEntry[]) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  session: null,
  myPlayerId: null,
  currentPlayer: null,
  isMyTurn: false,
  pendingName: null,
  pendingAvatarId: null,
  gameResult: null,
  leaderboardEntries: [],

  setSession: (session) => {
    const myPlayerId = get().myPlayerId;
    const currentPlayer = session.players[session.currentPlayerIndex] ?? null;
    const isMyTurn = myPlayerId !== null && currentPlayer?.id === myPlayerId;
    set({ session, currentPlayer, isMyTurn });
  },

  setMyPlayerId: (id) => {
    const { session } = get();
    const currentPlayer = session?.players[session.currentPlayerIndex] ?? null;
    const isMyTurn = currentPlayer?.id === id;
    set({ myPlayerId: id, isMyTurn });
  },

  setPendingPlayer: (name, avatarId) => {
    set({ pendingName: name, pendingAvatarId: avatarId });
  },

  setGameResult: (result) => {
    set({ gameResult: result });
  },

  setLeaderboardEntries: (entries) => {
    set({ leaderboardEntries: entries });
  },
}));
