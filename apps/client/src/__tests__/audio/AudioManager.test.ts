import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Howl, Howler } from 'howler';
import { AudioManager } from '../../audio/AudioManager';

describe('AudioManager', () => {
  let mgr: AudioManager;

  beforeEach(() => {
    mgr = new AudioManager();
    vi.mocked(Howl).mockClear();
    vi.mocked(Howler.mute).mockClear();
  });

  it('setMuted(true) delega ao Howler.mute', () => {
    mgr.setMuted(true);
    expect(Howler.mute).toHaveBeenCalledWith(true);
    expect(mgr.isMuted()).toBe(true);
  });

  it('setMuted(false) remove o mute', () => {
    mgr.setMuted(true);
    mgr.setMuted(false);
    expect(Howler.mute).toHaveBeenLastCalledWith(false);
    expect(mgr.isMuted()).toBe(false);
  });

  it('startBoardTrack instancia Howl com a trilha do tabuleiro em loop', () => {
    mgr.startBoardTrack();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/track-board.mp3'],
      loop: true,
    }));
  });

  it('startLobbyTrack instancia Howl com a trilha do lobby em loop', () => {
    mgr.startLobbyTrack();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/track-lobby.mp3'],
      loop: true,
    }));
  });

  it('playCardStinger "accident" cria Howl com o stinger correto', () => {
    mgr.playCardStinger('accident');
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/stinger-accident.mp3'],
    }));
  });

  it('startBoardTrack reproduz o som', () => {
    mgr.startBoardTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).toHaveBeenCalled();
  });

  it('startBoardTrack não reproduz quando muted', () => {
    mgr.setMuted(true);
    mgr.startBoardTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).not.toHaveBeenCalled();
  });
});
