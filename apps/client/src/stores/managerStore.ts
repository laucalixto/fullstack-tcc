import { create } from 'zustand';
import type { DashboardStats, SessionSummary } from '@safety-board/shared';

interface ManagerStore {
  token: string | null;
  managerName: string | null;
  managerEmail: string | null;
  stats: DashboardStats | null;
  recentSessions: SessionSummary[];
  generatedPin: string | null;
  shareLink: string | null;
  isLoading: boolean;
  error: string | null;

  setToken: (token: string | null) => void;
  setManagerProfile: (name: string, email: string) => void;
  setStats: (stats: DashboardStats) => void;
  setRecentSessions: (sessions: SessionSummary[]) => void;
  setNewSession: (pin: string, shareLink: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearToken: () => void;
  logout: () => void;
}

export const useManagerStore = create<ManagerStore>()((set) => ({
  token: null,
  managerName: null,
  managerEmail: null,
  stats: null,
  recentSessions: [],
  generatedPin: null,
  shareLink: null,
  isLoading: false,
  error: null,

  setToken: (token) => set({ token }),
  setManagerProfile: (managerName, managerEmail) => set({ managerName, managerEmail }),
  setStats: (stats) => set({ stats }),
  setRecentSessions: (sessions) => set({ recentSessions: sessions }),
  setNewSession: (pin, shareLink) => set({ generatedPin: pin, shareLink }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearToken: () => set({ token: null }),
  logout: () => set({ token: null, managerName: null, managerEmail: null, stats: null, recentSessions: [], generatedPin: null, shareLink: null }),
}));
