import { gameConfig } from "../config/gameConfig";

/**
 * Manages high score persistence using browser localStorage
 */
export class HighScoreManager {
  private static readonly STORAGE_KEY = gameConfig.scores.highScoreKey;
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
   * Get the current high score from localStorage
   * @returns The high score, or 0 if none exists
   */
  static getHighScore(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    } catch (error) {
      console.error('Failed to read high score from localStorage:', error);
      return 0;
    }
  }

  /**
   * Save a new high score to localStorage
   * @param score The score to save
   * @returns true if save was successful, false otherwise
   */
  static saveHighScore(score: number): boolean {
    if(!HighScoreManager.isDeveloperMode)
      try {
        localStorage.setItem(this.STORAGE_KEY, score.toString());
        return true;
      } catch (error) {
        console.error('Failed to save high score to localStorage:', error);
        return false;
      }
    return true;
  }

  /**
   * Update high score if the given score is higher
   * @param score The current score to check
   * @returns true if a new high score was set, false otherwise
   */
  static updateHighScore(score: number): boolean {
    if(!HighScoreManager.isDeveloperMode) {
      const currentHighScore = this.getHighScore();
      if (score > currentHighScore) {
        this.saveHighScore(score);
        return true;
      }
      return false;
    }
    return true
  }

  /**
   * Clear the high score from localStorage
   */
  static clearHighScore(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear high score from localStorage:', error);
    }
  }
}
