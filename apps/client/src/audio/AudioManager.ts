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

  isMuted(): boolean { return this.muted; }

  startLobbyTrack(): void {
    this.stopAll();
    this.lobbyTrack = new Howl({ src: [LOBBY_TRACK], loop: true, volume: FULL_VOLUME });
    if (!this.muted) this.lobbyTrack.play();
  }

  stopLobbyTrack(): void {
    if (!this.lobbyTrack) return;
    this.lobbyTrack.fade(this.lobbyTrack.volume(), 0, FADE_MS);
    setTimeout(() => { this.lobbyTrack?.stop(); this.lobbyTrack = null; }, FADE_MS + 50);
  }

  startBoardTrack(): void {
    this.stopAll();
    this.boardTrack = new Howl({ src: [BOARD_TRACK], loop: true, volume: FULL_VOLUME });
    if (!this.muted) this.boardTrack.play();
  }

  stopBoardTrack(): void {
    if (!this.boardTrack) return;
    this.boardTrack.fade(FULL_VOLUME, 0, FADE_MS);
    setTimeout(() => { this.boardTrack?.stop(); this.boardTrack = null; }, FADE_MS + 50);
  }

  playCardStinger(category: CardCategory): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), DUCK_BOARD_VOLUME, FADE_MS);
    this.activeStinger?.stop();
    this.activeStinger = new Howl({ src: [STINGERS[category]], volume: FULL_VOLUME });
    if (!this.muted) this.activeStinger.play();
  }

  stopCardStinger(): void {
    this.activeStinger?.stop();
    this.activeStinger = null;
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), FULL_VOLUME, FADE_MS);
  }

  duckForQuiz(): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), DUCK_QUIZ_VOLUME, FADE_MS);
  }

  unduckFromQuiz(): void {
    if (this.boardTrack) this.boardTrack.fade(this.boardTrack.volume(), FULL_VOLUME, FADE_MS);
  }

  private stopAll(): void {
    this.boardTrack?.stop();    this.boardTrack = null;
    this.lobbyTrack?.stop();    this.lobbyTrack = null;
    this.activeStinger?.stop(); this.activeStinger = null;
  }
}

export const audioManager = new AudioManager();
