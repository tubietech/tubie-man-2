import { gameConfig } from "../config/gameConfig";
import { Logger } from "./Logger";
import { LogGroup } from "../enums/LogGroup";

/**
 * Manages high score persistence using browser localStorage
 * Supports separate high scores for each difficulty level
 */
export class HighScoreManager {
  private static readonly STORAGE_KEY_PREFIX = gameConfig.scores.highScoreKey;
  private static isDeveloperMode: boolean = false;

  /**
   * Sets if the game is in developer mode.
   * In developer mode, high scores are not saved.
   * @param isDevMode true to enable developer mode, false to disable
   */
  static setDeveloperMode(isDevMode: boolean): void {
    this.isDeveloperMode = isDevMode;
  }

  /**
   * Get the storage key for a specific difficulty
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns The localStorage key for that difficulty
   */
  private static getStorageKey(difficulty: string): string {
    return `${this.STORAGE_KEY_PREFIX}_${difficulty}`;
  }

  /**
   * Get the current high score from localStorage for a specific difficulty
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns The high score, or 0 if none exists
   */
  static getHighScore(difficulty: string): number {
    try {
      const key = this.getStorageKey(difficulty);
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to read high score from localStorage: ${error}`);
      return 0;
    }
  }

  /**
   * Save a new high score to localStorage for a specific difficulty
   * @param score The score to save
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns true if save was successful, false otherwise
   */
  static saveHighScore(score: number, difficulty: string): boolean {
    if(!HighScoreManager.isDeveloperMode)
      try {
        const key = this.getStorageKey(difficulty);
        localStorage.setItem(key, score.toString());
        return true;
      } catch (error) {
        Logger.errorStatic(LogGroup.GAME, `Failed to save high score to localStorage: ${error}`);
        return false;
      }
    return true;
  }

  /**
   * Update high score if the given score is higher for a specific difficulty
   * @param score The current score to check
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns true if a new high score was set, false otherwise
   */
  static updateHighScore(score: number, difficulty: string): boolean {
    if(!HighScoreManager.isDeveloperMode) {
      const currentHighScore = this.getHighScore(difficulty);
      if (score > currentHighScore) {
        this.saveHighScore(score, difficulty);
        return true;
      }
      return false;
    }
    return true
  }

  /**
   * Clear the high score from localStorage for a specific difficulty
   * @param difficulty The difficulty level (easy, medium, hard)
   */
  static clearHighScore(difficulty: string): void {
    try {
      const key = this.getStorageKey(difficulty);
      localStorage.removeItem(key);
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to clear high score from localStorage: ${error}`);
    }
  }

  /**
   * Clear all high scores from localStorage (all difficulties)
   */
  static clearAllHighScores(): void {
    const difficulties = ['easy', 'medium', 'hard'];
    difficulties.forEach(difficulty => {
      this.clearHighScore(difficulty);
    });
  }
}
