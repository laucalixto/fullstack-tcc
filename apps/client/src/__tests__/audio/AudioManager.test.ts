import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Howl, Howler } from 'howler';
import { AudioManager } from '../../audio/AudioManager';

describe('AudioManager', () => {
  let mgr: AudioManager;

  beforeEach(() => {
    mgr = new AudioManager();
    vi.mocked(Howl).mockClear();
    vi.mocked(Howler.mute).mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  // ─── RED: unload para liberar recursos ───────────────────────────────────────

  it('stopBoardTrack chama unload após o fade terminar', () => {
    mgr.startBoardTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.stopBoardTrack();
    vi.runAllTimers();
    expect(instance.unload).toHaveBeenCalled();
  });

  it('stopLobbyTrack chama unload após o fade terminar', () => {
    mgr.startLobbyTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.stopLobbyTrack();
    vi.runAllTimers();
    expect(instance.unload).toHaveBeenCalled();
  });

  it('stopCardStinger chama unload no stinger anterior ao parar', () => {
    mgr.startBoardTrack(); // cria boardTrack (índice 0)
    mgr.playCardStinger('accident'); // cria stinger (índice 1)
    const stingerInstance = vi.mocked(Howl).mock.results[1].value;
    mgr.stopCardStinger();
    expect(stingerInstance.unload).toHaveBeenCalled();
  });

  it('playCardStinger chama unload no stinger anterior antes de criar novo', () => {
    mgr.startBoardTrack();
    mgr.playCardStinger('accident');
    const first = vi.mocked(Howl).mock.results[1].value;
    mgr.playCardStinger('prevention');
    expect(first.unload).toHaveBeenCalled();
  });

  // ─── RED: duckForQuiz / unduckFromQuiz ───────────────────────────────────────

  it('duckForQuiz faz fade do boardTrack para volume reduzido', () => {
    mgr.startBoardTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.duckForQuiz();
    expect(instance.fade).toHaveBeenCalled();
    const [, toVol] = instance.fade.mock.calls[0];
    expect(toVol).toBeLessThan(1.0);
  });

  it('unduckFromQuiz restaura boardTrack ao volume máximo', () => {
    mgr.startBoardTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.duckForQuiz();
    mgr.unduckFromQuiz();
    const lastCall = instance.fade.mock.calls.at(-1);
    expect(lastCall[1]).toBe(1.0);
  });

  it('duckForQuiz é no-op quando boardTrack é null', () => {
    expect(() => mgr.duckForQuiz()).not.toThrow();
  });

  it('unduckFromQuiz é no-op quando boardTrack é null', () => {
    expect(() => mgr.unduckFromQuiz()).not.toThrow();
  });

  // ─── RED: sincronização inicial do mute ──────────────────────────────────────

  it('syncMuted(true) aplica mute imediatamente ao audioManager', () => {
    mgr.syncMuted(true);
    expect(mgr.isMuted()).toBe(true);
    expect(Howler.mute).toHaveBeenCalledWith(true);
  });

  it('syncMuted(false) não altera estado quando já desmutado', () => {
    mgr.syncMuted(false);
    expect(mgr.isMuted()).toBe(false);
  });

  // ─── SFX do dado ─────────────────────────────────────────────────────────────

  it('playDiceClick instancia Howl com o SFX de clique do dado (sem loop)', () => {
    mgr.playDiceClick();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/sfx-dice-click.mp3'],
      loop: false,
    }));
  });

  it('playDiceClick não reproduz quando muted', () => {
    mgr.setMuted(true);
    mgr.playDiceClick();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).not.toHaveBeenCalled();
  });

  it('playDiceRoll instancia Howl com o SFX de rolagem do dado', () => {
    mgr.playDiceRoll();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/sfx-dice-roll.mp3'],
      loop: false,
    }));
  });

  it('playDiceRoll substitui instância anterior (unload)', () => {
    mgr.playDiceRoll();
    const first = vi.mocked(Howl).mock.results[0].value;
    mgr.playDiceRoll();
    expect(first.unload).toHaveBeenCalled();
  });

  // ─── Trilha de vitória ───────────────────────────────────────────────────────

  it('startVictoryTrack instancia Howl com a trilha de vitória em loop', () => {
    mgr.startVictoryTrack();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/track-victory.mp3'],
      loop: true,
    }));
  });

  it('startVictoryTrack para trilha do tabuleiro antes de tocar', () => {
    mgr.startBoardTrack();
    const board = vi.mocked(Howl).mock.results[0].value;
    mgr.startVictoryTrack();
    expect(board.unload).toHaveBeenCalled();
  });

  it('stopVictoryTrack chama unload após o fade terminar', () => {
    mgr.startVictoryTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.stopVictoryTrack();
    vi.runAllTimers();
    expect(instance.unload).toHaveBeenCalled();
  });

  it('startVictoryTrack não reproduz quando muted', () => {
    mgr.setMuted(true);
    mgr.startVictoryTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).not.toHaveBeenCalled();
  });

  it('stopVictoryTrack é no-op quando não iniciado', () => {
    expect(() => mgr.stopVictoryTrack()).not.toThrow();
  });

  // ─── SFX do sorteio do primeiro jogador ──────────────────────────────────────

  it('playDrawTick instancia Howl com o SFX do highlight do sorteio', () => {
    mgr.playDrawTick();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/sfx-draw-tick.mp3'],
      loop: false,
    }));
  });

  it('playDrawTick não reproduz quando muted', () => {
    mgr.setMuted(true);
    mgr.playDrawTick();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).not.toHaveBeenCalled();
  });

  it('playDrawWin instancia Howl com o SFX do vencedor do sorteio', () => {
    mgr.playDrawWin();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/sfx-draw-win.mp3'],
      loop: false,
    }));
  });

  // ─── Trilha do pódio ─────────────────────────────────────────────────────────

  it('startPodiumTrack instancia Howl com a trilha do pódio em loop', () => {
    mgr.startPodiumTrack();
    expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/audio/track-podium.mp3'],
      loop: true,
    }));
  });

  it('startPodiumTrack para quaisquer outras trilhas antes (stopAll)', () => {
    mgr.startBoardTrack();
    const board = vi.mocked(Howl).mock.results[0].value;
    mgr.startPodiumTrack();
    expect(board.unload).toHaveBeenCalled();
  });

  it('stopPodiumTrack chama unload após o fade terminar', () => {
    mgr.startPodiumTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    mgr.stopPodiumTrack();
    vi.runAllTimers();
    expect(instance.unload).toHaveBeenCalled();
  });

  it('startPodiumTrack não reproduz quando muted', () => {
    mgr.setMuted(true);
    mgr.startPodiumTrack();
    const instance = vi.mocked(Howl).mock.results[0].value;
    expect(instance.play).not.toHaveBeenCalled();
  });

  it('stopPodiumTrack é no-op quando não iniciado', () => {
    expect(() => mgr.stopPodiumTrack()).not.toThrow();
  });
});
