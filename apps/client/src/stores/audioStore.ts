import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioManager } from '../audio/AudioManager';

interface AudioState {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMute: () =>
        set((state) => {
          const next = !state.muted;
          audioManager.setMuted(next);
          return { muted: next };
        }),
      setMuted: (muted) => {
        audioManager.setMuted(muted);
        set({ muted });
      },
    }),
    { name: 'safety-board-audio' },
  ),
);
