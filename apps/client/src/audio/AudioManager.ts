import { Howl, Howler } from 'howler';
import type { CardCategory } from './cardAudioCategory.js';

const BOARD_TRACK  = '/audio/track-board.mp3';
const LOBBY_TRACK  = '/audio/track-lobby.mp3';

const STINGERS: Record<CardCategory, string> = {
  accident:   '/audio/stinger-accident.mp3',
  prevention: '/audio/stinger-prevention.mp3',
  special:    '/audio/stinger-special.mp3',
};

const FULL_VOLUME       = 1.0;
const DUCK_BOARD_VOLUME = 0.15;
const DUCK_QUIZ_VOLUME  = 0.20;
const FADE_MS           = 500;

export class AudioManager {
  private boardTrack:    Howl | null = null;
  private lobbyTrack:    Howl | null = null;
  private activeStinger: Howl | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    Howler.mute(muted);
  }

  /** Sincroniza o estado inicial de mute a partir do store persistido (no-op se já correto). */
  syncMuted(muted: boolean): void {
    this.muted = muted;
    Howler.mute(muted);
  }

  isMuted(): boolean { return this.muted; }

  startLobbyTrack(): void {
    this.stopAll();
    this.lobbyTrack = new Howl({ src: [LOBBY_TRACK], loop: true, volume: FULL_VOLUME });
    if (!this.muted) this.lobbyTrack.play();
  }

  stopLobbyTrack(): void {
    if (!this.lobbyTrack) return;
    const track = this.lobbyTrack;
    this.lobbyTrack = null;
    track.fade(track.volume(), 0, FADE_MS);
    setTimeout(() => { track.stop(); track.unload(); }, FADE_MS + 50);
  }

  startBoardTrack(): void {
    this.stopAll();
    this.boardTrack = new Howl({ src: [BOARD_TRACK], loop: true, volume: FULL_VOLUME });
    if (!this.muted) this.boardTrack.play();
  }

  stopBoardTrack(): void {
    if (!this.boardTrack) return;
    const track = this.boardTrack;
    this.boardTrack = null;
    track.fade(FULL_VOLUME, 0, FADE_MS);
    setTimeout(() => { track.stop(); track.unload(); }, FADE_MS + 50);
  }

  playCardStinger(category: CardCategory): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), DUCK_BOARD_VOLUME, FADE_MS);
    if (this.activeStinger) {
      this.activeStinger.stop();
      this.activeStinger.unload();
    }
    this.activeStinger = new Howl({ src: [STINGERS[category]], volume: FULL_VOLUME });
    if (!this.muted) this.activeStinger.play();
  }

  stopCardStinger(): void {
    if (this.activeStinger) {
      this.activeStinger.stop();
      this.activeStinger.unload();
      this.activeStinger = null;
    }
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), FULL_VOLUME, FADE_MS);
  }

  duckForQuiz(): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), DUCK_QUIZ_VOLUME, FADE_MS);
  }

  unduckFromQuiz(): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), FULL_VOLUME, FADE_MS);
  }

  private stopAll(): void {
    if (this.boardTrack)    { this.boardTrack.stop();    this.boardTrack.unload();    this.boardTrack    = null; }
    if (this.lobbyTrack)    { this.lobbyTrack.stop();    this.lobbyTrack.unload();    this.lobbyTrack    = null; }
    if (this.activeStinger) { this.activeStinger.stop(); this.activeStinger.unload(); this.activeStinger = null; }
  }
}

export const audioManager = new AudioManager();
