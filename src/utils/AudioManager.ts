import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';
import { Logger } from './Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Audio track identifiers for background music
 */
export type BackgroundTrack = 'menu' | 'game' | 'gameOver' | 'victory' | 'getReady';

/**
 * Sound effect identifiers
 */
export type SoundEffect =
  | 'pelletEat'
  | 'powerupCollect'
  | 'enemyHit'
  | 'enemyReturn'
  | 'playerDeath'
  | 'bonusCollect'
  | 'levelComplete'
  | 'menuSelect'
  | 'menuNavigate';

/**
 * Centralized audio manager for the game.
 * Handles background music and layered sound effects.
 * Implements singleton pattern for global access.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private scene: Phaser.Scene | null = null;
  private game: Phaser.Game | null = null;

  // Background music
  private backgroundMusic: Phaser.Sound.BaseSound | null = null;
  private currentTrack: BackgroundTrack | null = null;

  // Sound effects pool
  private soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();

  // Looping sound effects (for pellet eating, etc.)
  private loopingSounds: Map<string, Phaser.Sound.BaseSound> = new Map();

  // Volume settings
  private masterVolume: number = 1.0;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;

  // Mute states
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private isMasterMuted: boolean = false;

  // Track if audio has been loaded
  private audioLoaded: boolean = false;

  // Track if user has interacted (for autoplay policy)
  private userHasInteracted: boolean = false;

  // Pending track to play after user interaction
  private pendingTrack: { track: BackgroundTrack; loop: boolean } | null = null;

  private logger: Logger;

  private constructor() {
    this.logger = new Logger(LogGroup.SOUND);
    this.loadVolumeSettings();
  }

  /**
   * Get the singleton instance of AudioManager
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize the audio manager with a Phaser scene
   * Must be called after audio assets are loaded
   */
  initialize(scene: Phaser.Scene): void {
    this.scene = scene;
    this.game = scene.game;
    this.logger.log('AudioManager initialized');
  }

  /**
   * Check if audio has been loaded
   */
  isLoaded(): boolean {
    return this.audioLoaded;
  }

  /**
   * Mark audio as loaded (called after preload completes)
   */
  setLoaded(loaded: boolean): void {
    this.audioLoaded = loaded;
  }

  /**
   * Load volume settings from localStorage
   */
  private loadVolumeSettings(): void {
    try {
      const saved = localStorage.getItem('tubie-man-audio');
      if (saved) {
        const settings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 1.0;
        this.musicVolume = settings.musicVolume ?? 0.5;
        this.sfxVolume = settings.sfxVolume ?? 0.7;
        this.isMasterMuted = settings.isMasterMuted ?? false;
        this.isMusicMuted = settings.isMusicMuted ?? false;
        this.isSfxMuted = settings.isSfxMuted ?? false;
        this.logger.log('Loaded audio settings from localStorage');
      }
    } catch (e) {
      this.logger.log('Failed to load audio settings, using defaults');
    }
  }

  /**
   * Save volume settings to localStorage
   */
  private saveVolumeSettings(): void {
    try {
      const settings = {
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        isMasterMuted: this.isMasterMuted,
        isMusicMuted: this.isMusicMuted,
        isSfxMuted: this.isSfxMuted
      };
      localStorage.setItem('tubie-man-audio', JSON.stringify(settings));
    } catch (e) {
      this.logger.log('Failed to save audio settings');
    }
  }

  /**
   * Get the effective music volume considering mute states
   */
  private getEffectiveMusicVolume(): number {
    if (this.isMasterMuted || this.isMusicMuted) return 0;
    return this.masterVolume * this.musicVolume;
  }

  /**
   * Get the effective SFX volume considering mute states
   */
  private getEffectiveSfxVolume(): number {
    if (this.isMasterMuted || this.isSfxMuted) return 0;
    return this.masterVolume * this.sfxVolume;
  }

  // ==================== User Interaction Handling ====================

  /**
   * Check if user has interacted with the page (for autoplay policy)
   */
  hasUserInteracted(): boolean {
    return this.userHasInteracted;
  }

  /**
   * Mark that user has interacted and play any pending track
   * Call this on first user interaction (keydown, click, etc.)
   */
  onUserInteraction(): void {
    if (this.userHasInteracted) return;

    this.userHasInteracted = true;
    this.logger.log('User interaction detected, audio unlocked');

    // Play pending track if any
    if (this.pendingTrack) {
      this.logger.log(`Playing pending track: ${this.pendingTrack.track}`);
      this.playBackgroundMusicImmediate(this.pendingTrack.track, this.pendingTrack.loop);
      this.pendingTrack = null;
    }
  }

  // ==================== Background Music Controls ====================

  /**
   * Play a background music track
   * If user hasn't interacted yet, queues the track to play on first interaction
   * @param track The track identifier to play
   * @param loop Whether to loop the track (default: true)
   */
  playBackgroundMusic(track: BackgroundTrack, loop: boolean = true): void {
    // If user hasn't interacted yet, queue the track for later
    if (!this.userHasInteracted) {
      this.logger.log(`Queuing track for after user interaction: ${track}`);
      this.pendingTrack = { track, loop };
      return;
    }

    this.playBackgroundMusicImmediate(track, loop);
  }

  /**
   * Internal method to actually play the music (bypasses interaction check)
   */
  private playBackgroundMusicImmediate(track: BackgroundTrack, loop: boolean = true): void {
    if (!this.game || !this.audioLoaded) {
      this.logger.log('Cannot play music: game not initialized or audio not loaded');
      return;
    }

    const trackKey = gameConfig.audio.tracks[track];
    if (!trackKey) {
      this.logger.log(`Unknown track: ${track}`);
      return;
    }

    // Stop current music if playing a different track
    if (this.backgroundMusic && this.currentTrack !== track) {
      this.stopBackgroundMusic();
    }

    // Don't restart if already playing the same track
    if (this.currentTrack === track && this.backgroundMusic?.isPlaying) {
      return;
    }

    try {
      // Use game.sound instead of scene.sound for persistence across scenes
      this.backgroundMusic = this.game.sound.add(trackKey, {
        volume: this.getEffectiveMusicVolume(),
        loop: loop
      });
      this.backgroundMusic.play();
      this.currentTrack = track;
      this.logger.log(`Playing background music: ${track}`);
    } catch (e) {
      this.logger.log(`Failed to play background music: ${track}`);
    }
  }

  /**
   * Stop the background music
   */
  stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
      this.backgroundMusic.destroy();
      this.backgroundMusic = null;
      this.currentTrack = null;
      this.logger.log('Stopped background music');
    }
  }

  /**
   * Pause the background music
   */
  pauseBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.pause();
      this.logger.log('Paused background music');
    }
  }

  /**
   * Resume the background music
   */
  resumeBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.isPaused) {
      this.backgroundMusic.resume();
      this.logger.log('Resumed background music');
    }
  }

  /**
   * Restart the current background music from the beginning
   */
  restartBackgroundMusic(): void {
    if (this.currentTrack) {
      const track = this.currentTrack;
      this.stopBackgroundMusic();
      this.playBackgroundMusic(track);
    }
  }

  /**
   * Check if background music is currently playing
   */
  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic?.isPlaying ?? false;
  }

  // ==================== Sound Effects Controls ====================

  /**
   * Play a sound effect
   * @param effect The sound effect identifier
   * @param volumeMultiplier Optional volume multiplier (0-1)
   */
  playSoundEffect(effect: SoundEffect, volumeMultiplier: number = 1.0): void {
    if (!this.game || !this.audioLoaded) {
      return;
    }

    const effectKey = gameConfig.audio.effects[effect];
    if (!effectKey) {
      this.logger.log(`Unknown sound effect: ${effect}`);
      return;
    }

    try {
      // Use game.sound instead of scene.sound for persistence across scenes
      const sound = this.game.sound.add(effectKey, {
        volume: this.getEffectiveSfxVolume() * volumeMultiplier
      });
      sound.play();

      // Clean up after sound finishes
      sound.once('complete', () => {
        sound.destroy();
      });
    } catch (e) {
      this.logger.log(`Failed to play sound effect: ${effect}`);
    }
  }

  // ==================== Looping Sound Effects Controls ====================

  /**
   * Start a looping sound effect
   * @param effect The sound effect identifier
   * @param volumeMultiplier Optional volume multiplier (0-1)
   */
  startLoopingSoundEffect(effect: SoundEffect, volumeMultiplier: number = 1.0): void {
    if (!this.game || !this.audioLoaded) {
      return;
    }

    // Don't start if already playing
    if (this.loopingSounds.has(effect) && this.loopingSounds.get(effect)?.isPlaying) {
      return;
    }

    const effectKey = gameConfig.audio.effects[effect];
    if (!effectKey) {
      this.logger.log(`Unknown sound effect: ${effect}`);
      return;
    }

    try {
      const sound = this.game.sound.add(effectKey, {
        volume: this.getEffectiveSfxVolume() * volumeMultiplier,
        loop: true
      });
      sound.play();
      this.loopingSounds.set(effect, sound);
      this.logger.log(`Started looping sound: ${effect}`);
    } catch (e) {
      this.logger.log(`Failed to start looping sound effect: ${effect}`);
    }
  }

  /**
   * Stop a looping sound effect
   * @param effect The sound effect identifier
   */
  stopLoopingSoundEffect(effect: SoundEffect): void {
    const sound = this.loopingSounds.get(effect);
    if (sound) {
      sound.stop();
      sound.destroy();
      this.loopingSounds.delete(effect);
      this.logger.log(`Stopped looping sound: ${effect}`);
    }
  }

  /**
   * Check if a looping sound effect is currently playing
   * @param effect The sound effect identifier
   */
  isLoopingSoundPlaying(effect: SoundEffect): boolean {
    const sound = this.loopingSounds.get(effect);
    return sound?.isPlaying ?? false;
  }

  // ==================== Volume Controls ====================

  /**
   * Set the master volume (affects both music and SFX)
   * @param volume Volume level (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateMusicVolume();
    this.saveVolumeSettings();
    this.logger.log(`Master volume set to ${this.masterVolume}`);
  }

  /**
   * Get the current master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Set the music volume
   * @param volume Volume level (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateMusicVolume();
    this.saveVolumeSettings();
    this.logger.log(`Music volume set to ${this.musicVolume}`);
  }

  /**
   * Get the current music volume
   */
  getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Set the sound effects volume
   * @param volume Volume level (0-1)
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.saveVolumeSettings();
    this.logger.log(`SFX volume set to ${this.sfxVolume}`);
  }

  /**
   * Get the current sound effects volume
   */
  getSfxVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Increase master volume by a step
   * @param step Volume step (default: 0.1)
   */
  volumeUp(step: number = 0.1): void {
    this.setMasterVolume(this.masterVolume + step);
  }

  /**
   * Decrease master volume by a step
   * @param step Volume step (default: 0.1)
   */
  volumeDown(step: number = 0.1): void {
    this.setMasterVolume(this.masterVolume - step);
  }

  /**
   * Update the background music volume based on current settings
   */
  private updateMusicVolume(): void {
    if (this.backgroundMusic) {
      (this.backgroundMusic as Phaser.Sound.WebAudioSound).setVolume(this.getEffectiveMusicVolume());
    }
  }

  // ==================== Mute Controls ====================

  /**
   * Toggle master mute
   */
  toggleMasterMute(): void {
    this.isMasterMuted = !this.isMasterMuted;
    this.updateMusicVolume();
    this.saveVolumeSettings();
    this.logger.log(`Master mute: ${this.isMasterMuted}`);
  }

  /**
   * Toggle music mute
   */
  toggleMusicMute(): void {
    this.isMusicMuted = !this.isMusicMuted;
    this.updateMusicVolume();
    this.saveVolumeSettings();
    this.logger.log(`Music mute: ${this.isMusicMuted}`);
  }

  /**
   * Toggle sound effects mute
   */
  toggleSfxMute(): void {
    this.isSfxMuted = !this.isSfxMuted;
    this.saveVolumeSettings();
    this.logger.log(`SFX mute: ${this.isSfxMuted}`);
  }

  /**
   * Set master mute state
   */
  setMasterMuted(muted: boolean): void {
    this.isMasterMuted = muted;
    this.updateMusicVolume();
    this.saveVolumeSettings();
  }

  /**
   * Set music mute state
   */
  setMusicMuted(muted: boolean): void {
    this.isMusicMuted = muted;
    this.updateMusicVolume();
    this.saveVolumeSettings();
  }

  /**
   * Set SFX mute state
   */
  setSfxMuted(muted: boolean): void {
    this.isSfxMuted = muted;
    this.saveVolumeSettings();
  }

  /**
   * Check if master is muted
   */
  isMasterMutedState(): boolean {
    return this.isMasterMuted;
  }

  /**
   * Check if music is muted
   */
  isMusicMutedState(): boolean {
    return this.isMusicMuted;
  }

  /**
   * Check if SFX is muted
   */
  isSfxMutedState(): boolean {
    return this.isSfxMuted;
  }

  // ==================== Cleanup ====================

  /**
   * Clean up all audio resources
   * Call this when changing scenes or shutting down
   */
  cleanup(): void {
    this.stopBackgroundMusic();
    this.soundEffects.forEach(sound => {
      sound.stop();
      sound.destroy();
    });
    this.soundEffects.clear();
    // Clean up looping sounds
    this.loopingSounds.forEach(sound => {
      sound.stop();
      sound.destroy();
    });
    this.loopingSounds.clear();
    this.scene = null;
    this.logger.log('AudioManager cleaned up');
  }
}
