import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RED: falha até audioStore.ts ser implementado ───────────────────────────

vi.mock('../../audio/AudioManager', () => ({
  audioManager: { setMuted: vi.fn() },
}));

import { audioManager } from '../../audio/AudioManager';
import { useAudioStore } from '../../stores/audioStore';

describe('audioStore', () => {
  beforeEach(() => {
    useAudioStore.setState({ muted: false });
    vi.mocked(audioManager.setMuted).mockClear();
  });

  it('estado inicial: muted = false', () => {
    expect(useAudioStore.getState().muted).toBe(false);
  });

  it('toggleMute muda de false para true', () => {
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().muted).toBe(true);
  });

  it('toggleMute muda de true para false', () => {
    useAudioStore.setState({ muted: true });
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().muted).toBe(false);
  });

  it('toggleMute delega ao audioManager.setMuted com o novo valor', () => {
    useAudioStore.getState().toggleMute();
    expect(audioManager.setMuted).toHaveBeenCalledWith(true);
  });

  it('setMuted(true) atualiza store e delega ao audioManager', () => {
    useAudioStore.getState().setMuted(true);
    expect(useAudioStore.getState().muted).toBe(true);
    expect(audioManager.setMuted).toHaveBeenCalledWith(true);
  });

  it('setMuted(false) atualiza store e delega ao audioManager', () => {
    useAudioStore.setState({ muted: true });
    useAudioStore.getState().setMuted(false);
    expect(useAudioStore.getState().muted).toBe(false);
    expect(audioManager.setMuted).toHaveBeenCalledWith(false);
  });
});
