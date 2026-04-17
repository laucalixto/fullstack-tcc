import { create } from 'zustand';
import type { DashboardStats, SessionSummary } from '@safety-board/shared';

interface ManagerStore {
  token: string | null;
  stats: DashboardStats | null;
  recentSessions: SessionSummary[];
  generatedPin: string | null;
  shareLink: string | null;
  isLoading: boolean;
  error: string | null;

  setToken: (token: string | null) => void;
  setStats: (stats: DashboardStats) => void;
  setRecentSessions: (sessions: SessionSummary[]) => void;
  setNewSession: (pin: string, shareLink: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useManagerStore = create<ManagerStore>()((set) => ({
  token: null,
  stats: null,
  recentSessions: [],
  generatedPin: null,
  shareLink: null,
  isLoading: false,
  error: null,

  setToken: (token) => set({ token }),
  setStats: (stats) => set({ stats }),
  setRecentSessions: (sessions) => set({ recentSessions: sessions }),
  setNewSession: (pin, shareLink) => set({ generatedPin: pin, shareLink }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ token: null, stats: null, recentSessions: [], generatedPin: null, shareLink: null }),
}));
