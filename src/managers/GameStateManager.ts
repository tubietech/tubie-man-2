import Phaser from 'phaser';
import { Difficulty } from '../enums/Difficulty';
import { IGameState, IGameStateCallbacks } from '../interfaces/IGameState';
import { HighScoreManager } from '../utils/HighScoreManager';
import { gameConfig } from '../config/gameConfig';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Manages all game state including score, lives, level, and game flow states.
 * Provides callbacks for UI updates when state changes.
 */
export class GameStateManager {
  private scene: Phaser.Scene;
  private state: IGameState;
  private callbacks: IGameStateCallbacks;
  private logger: Logger;

  constructor(
    scene: Phaser.Scene,
    difficulty: Difficulty,
    level: number = 1,
    score: number = 0,
    lives?: number,
    callbacks?: IGameStateCallbacks
  ) {
    this.scene = scene;
    this.callbacks = callbacks || {};
    this.logger = new Logger(LogGroup.GAME);

    // Initialize lives based on difficulty if not provided
    const startLives = lives ?? gameConfig.player.startLives[difficulty as keyof typeof gameConfig.player.startLives];

    this.state = {
      score,
      highScore: HighScoreManager.getHighScore(difficulty),
      level,
      lives: startLives,
      difficulty,
      isPaused: false,
      isGameOver: false,
      isGetReady: true,
      pelletsEaten: 0,
      injuryComboCount: 0,
      lastInjuryTime: 0
    };

    this.logger.log(`GameStateManager initialized - Level: ${level}, Score: ${score}, Lives: ${startLives}, Difficulty: ${difficulty}`);
  }

  // === State Accessors ===

  getState(): Readonly<IGameState> {
    return this.state;
  }

  getScore(): number {
    return this.state.score;
  }

  getHighScore(): number {
    return this.state.highScore;
  }

  getLevel(): number {
    return this.state.level;
  }

  getLives(): number {
    return this.state.lives;
  }

  getDifficulty(): Difficulty {
    return this.state.difficulty;
  }

  isPaused(): boolean {
    return this.state.isPaused;
  }

  isGameOver(): boolean {
    return this.state.isGameOver;
  }

  isGetReady(): boolean {
    return this.state.isGetReady;
  }

  getPelletsEaten(): number {
    return this.state.pelletsEaten;
  }

  // === State Mutators ===

  addScore(points: number): void {
    this.state.score += points;

    // Update high score if exceeded
    if (this.state.score > this.state.highScore)
      this.state.highScore = this.state.score;

    if (this.callbacks.onScoreChanged)
      this.callbacks.onScoreChanged(this.state.score, this.state.highScore);
  }

  /**
   * Decrements lives and returns remaining count.
   * Does not trigger game over - that's the caller's responsibility.
   */
  loseLife(): number {
    this.state.lives--;

    if (this.callbacks.onLivesChanged)
      this.callbacks.onLivesChanged(this.state.lives);

    return this.state.lives;
  }

  /**
   * Advances to the next level.
   */
  nextLevel(): void {
    this.state.level++;
    this.state.pelletsEaten = 0;
    this.state.isGetReady = true;

    if (this.callbacks.onLevelChanged)
      this.callbacks.onLevelChanged(this.state.level);

    if (this.callbacks.onGameStateChanged)
      this.callbacks.onGameStateChanged('getReady');
  }

  setPaused(paused: boolean): void {
    this.state.isPaused = paused;

    if (this.callbacks.onGameStateChanged)
      this.callbacks.onGameStateChanged(paused ? 'paused' : 'playing');
  }

  setGameOver(): void {
    this.state.isGameOver = true;

    if (this.callbacks.onGameStateChanged)
      this.callbacks.onGameStateChanged('gameOver');
  }

  setGetReady(ready: boolean): void {
    this.state.isGetReady = ready;

    if (this.callbacks.onGameStateChanged)
      this.callbacks.onGameStateChanged(ready ? 'getReady' : 'playing');
  }

  /**
   * Increments pellets eaten counter and returns the new total.
   */
  incrementPelletsEaten(): number {
    this.state.pelletsEaten++;
    return this.state.pelletsEaten;
  }

  // === Combo Tracking ===

  /**
   * Records an enemy injury and returns the appropriate combo score.
   * Resets combo if too much time has passed since last injury.
   */
  recordInjury(currentTime: number): number {
    // Reset combo if expired
    if (currentTime - this.state.lastInjuryTime > gameConfig.player.injuryComboResetTime)
      this.state.injuryComboCount = 0;

    // Calculate score based on combo count
    const scores = gameConfig.enemy.injuryScores;
    const scoreIndex = Math.min(this.state.injuryComboCount, scores.length - 1);
    const injuryScore = scores[scoreIndex];

    // Increment combo (capped at array length - 1)
    if (this.state.injuryComboCount < scores.length - 1)
      this.state.injuryComboCount++;

    // Update last injury time
    this.state.lastInjuryTime = currentTime;

    this.logger.log(`Enemy injured! Score +${injuryScore}, Combo: ${this.state.injuryComboCount}`);

    return injuryScore;
  }

  /**
   * Resets combo count if timer has expired.
   * Call this periodically to ensure combo resets properly.
   */
  resetComboIfExpired(currentTime: number): void {
    if (currentTime - this.state.lastInjuryTime > gameConfig.player.injuryComboResetTime)
      this.state.injuryComboCount = 0;
  }

  getInjuryComboCount(): number {
    return this.state.injuryComboCount;
  }

  getLastInjuryTime(): number {
    return this.state.lastInjuryTime;
  }

  // === Reset Methods ===

  /**
   * Resets state for starting a completely new game.
   */
  resetForNewGame(): void {
    this.state.score = 0;
    this.state.level = 1;
    this.state.lives = gameConfig.player.startLives[this.state.difficulty as keyof typeof gameConfig.player.startLives];
    this.state.isGameOver = false;
    this.state.isPaused = false;
    this.state.isGetReady = true;
    this.state.pelletsEaten = 0;
    this.state.injuryComboCount = 0;
    this.state.lastInjuryTime = 0;

    // Reload high score
    this.state.highScore = HighScoreManager.getHighScore(this.state.difficulty);

    if (this.callbacks.onScoreChanged)
      this.callbacks.onScoreChanged(this.state.score, this.state.highScore);

    if (this.callbacks.onLivesChanged)
      this.callbacks.onLivesChanged(this.state.lives);

    if (this.callbacks.onLevelChanged)
      this.callbacks.onLevelChanged(this.state.level);
  }

  /**
   * Resets state for transitioning to the next level (preserves score, lives).
   */
  resetForNextLevel(): void {
    this.state.isGetReady = true;
    this.state.pelletsEaten = 0;
    this.state.injuryComboCount = 0;
    this.state.lastInjuryTime = 0;
  }

  /**
   * Returns data needed to restart the scene.
   */
  getSceneRestartData(reset: boolean): {
    difficulty: Difficulty;
    reset: boolean;
    score?: number;
    level?: number;
    lives?: number;
  } {
    return {
      difficulty: this.state.difficulty,
      reset,
      score: reset ? undefined : this.state.score,
      level: reset ? undefined : this.state.level,
      lives: reset ? undefined : this.state.lives
    };
  }
}
