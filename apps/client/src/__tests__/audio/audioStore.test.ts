import { describe, it, expect, vi, beforeEach } from 'vitest';

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

  it('toggleMute muda o estado e delega ao audioManager', () => {
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().muted).toBe(true);
    expect(audioManager.setMuted).toHaveBeenCalledWith(true);
  });

  it('setMuted(true) atualiza store e delega ao audioManager', () => {
    useAudioStore.getState().setMuted(true);
    expect(useAudioStore.getState().muted).toBe(true);
    expect(audioManager.setMuted).toHaveBeenCalledWith(true);
  });
});
