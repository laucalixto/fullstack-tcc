import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerState {
  token: string | null;
  playerId: string | null;
  name: string | null;
  email: string | null;
  industrialUnit: string | null;
  totalScore: number;
  setPlayer: (data: {
    token: string;
    playerId: string;
    name: string;
    email: string;
    industrialUnit: string;
    totalScore: number;
  }) => void;
  clearPlayer: () => void;
  isAuthenticated: () => boolean;
  updateScore: (totalScore: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      token: null,
      playerId: null,
      name: null,
      email: null,
      industrialUnit: null,
      totalScore: 0,
      setPlayer: (data) => set(data),
      clearPlayer: () =>
        set({ token: null, playerId: null, name: null, email: null, industrialUnit: null, totalScore: 0 }),
      isAuthenticated: () => !!(get().token && get().playerId),
      updateScore: (totalScore) => set({ totalScore }),
    }),
    { name: 'safety-board-player' },
  ),
);
