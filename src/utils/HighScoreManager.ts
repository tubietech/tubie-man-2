import { gameConfig } from "../config/gameConfig";
import { Logger } from "./Logger";
import { LogGroup } from "../enums/LogGroup";
import { IHighScoreEntry, IHighScoreData } from "../interfaces/IHighScore";

/**
 * Manages high score persistence using browser localStorage
 * Supports separate high scores for each difficulty level
 * Stores top 10 scores per difficulty with player names and timestamps
 */
export class HighScoreManager {
  private static readonly OLD_STORAGE_KEY_PREFIX = gameConfig.scores.highScoreKey;
  private static readonly NEW_STORAGE_KEY_PREFIX = gameConfig.scores.highScoreKey + 's';
  private static readonly MAX_ENTRIES = gameConfig.scores.maxEntries;
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
   * Get the old storage key for a specific difficulty (for migration)
   */
  private static getOldStorageKey(difficulty: string): string {
    return `${this.OLD_STORAGE_KEY_PREFIX}_${difficulty}`;
  }

  /**
   * Get the new storage key for a specific difficulty
   */
  private static getNewStorageKey(difficulty: string): string {
    return `${this.NEW_STORAGE_KEY_PREFIX}_${difficulty}`;
  }

  /**
   * Migrate old single-score format to new multi-entry format
   */
  private static migrateOldFormat(difficulty: string): void {
    try {
      const oldKey = this.getOldStorageKey(difficulty);
      const newKey = this.getNewStorageKey(difficulty);

      // Check if old format exists and new format doesn't
      const oldData = localStorage.getItem(oldKey);
      const newData = localStorage.getItem(newKey);

      if (oldData !== null && newData === null) {
        const oldScore = parseInt(oldData, 10);
        if (!isNaN(oldScore) && oldScore > 0) {
          // Create new format with migrated score
          const newScoreData: IHighScoreData = {
            entries: [{
              score: oldScore,
              name: '???',
              datetime: new Date().toISOString()
            }]
          };
          localStorage.setItem(newKey, JSON.stringify(newScoreData));
          Logger.logStatic(LogGroup.GAME, `Migrated high score for ${difficulty}: ${oldScore}`);
        }
        // Remove old key after migration
        localStorage.removeItem(oldKey);
      }
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to migrate high score: ${error}`);
    }
  }

  /**
   * Get all high scores for a difficulty (top 10)
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns Array of high score entries, sorted highest to lowest
   */
  static getHighScores(difficulty: string): IHighScoreEntry[] {
    try {
      // Attempt migration first
      this.migrateOldFormat(difficulty);

      const key = this.getNewStorageKey(difficulty);
      const stored = localStorage.getItem(key);

      if (stored !== null) {
        const data: IHighScoreData = JSON.parse(stored);
        return data.entries || [];
      }
      return [];
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to read high scores from localStorage: ${error}`);
      return [];
    }
  }

  /**
   * Get the current highest score from localStorage for a specific difficulty
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns The highest score, or 0 if none exists
   */
  static getHighScore(difficulty: string): number {
    const scores = this.getHighScores(difficulty);
    if (scores.length > 0) {
      return scores[0].score;
    }
    return 0;
  }

  /**
   * Check if a score qualifies for the high score list
   * @param score The score to check
   * @param difficulty The difficulty level
   * @returns true if score should be added to high scores
   */
  static isHighScore(score: number, difficulty: string): boolean {
    if (score <= 0) return false;

    const scores = this.getHighScores(difficulty);

    // If less than max entries, any positive score qualifies
    if (scores.length < this.MAX_ENTRIES) {
      return true;
    }

    // Check if score beats the lowest entry
    const lowestScore = scores[scores.length - 1].score;
    return score > lowestScore;
  }

  /**
   * Add a new high score entry
   * @param score The score to add
   * @param name The 3-character player name
   * @param difficulty The difficulty level
   * @returns true if score was added successfully
   */
  static addHighScore(score: number, name: string, difficulty: string): boolean {
    if (this.isDeveloperMode) {
      Logger.logStatic(LogGroup.GAME, 'Developer mode: high score not saved');
      return true;
    }

    try {
      const scores = this.getHighScores(difficulty);

      // Create new entry
      const newEntry: IHighScoreEntry = {
        score,
        name: name.substring(0, 3).toUpperCase(),
        datetime: new Date().toISOString()
      };

      // Add to list
      scores.push(newEntry);

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // Keep only top entries
      const trimmedScores = scores.slice(0, this.MAX_ENTRIES);

      // Save
      const key = this.getNewStorageKey(difficulty);
      const data: IHighScoreData = { entries: trimmedScores };
      localStorage.setItem(key, JSON.stringify(data));

      Logger.logStatic(LogGroup.GAME, `Added high score: ${name} - ${score} (${difficulty})`);
      return true;
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to add high score: ${error}`);
      return false;
    }
  }

  /**
   * Save a new high score to localStorage for a specific difficulty
   * @deprecated Use addHighScore instead
   * @param score The score to save
   * @param difficulty The difficulty level (easy, medium, hard)
   * @returns true if save was successful, false otherwise
   */
  static saveHighScore(score: number, difficulty: string): boolean {
    if (!HighScoreManager.isDeveloperMode) {
      // Use new format - add with default name
      return this.addHighScore(score, '???', difficulty);
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
    if (!HighScoreManager.isDeveloperMode) {
      const currentHighScore = this.getHighScore(difficulty);
      if (score > currentHighScore) {
        // Don't auto-add here - let the game show the entry screen
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Clear all high scores from localStorage for a specific difficulty
   * @param difficulty The difficulty level (easy, medium, hard)
   */
  static clearHighScores(difficulty: string): void {
    try {
      const newKey = this.getNewStorageKey(difficulty);
      const oldKey = this.getOldStorageKey(difficulty);
      localStorage.removeItem(newKey);
      localStorage.removeItem(oldKey);
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to clear high scores from localStorage: ${error}`);
    }
  }

  /**
   * Clear the high score from localStorage for a specific difficulty
   * @deprecated Use clearHighScores instead
   * @param difficulty The difficulty level (easy, medium, hard)
   */
  static clearHighScore(difficulty: string): void {
    this.clearHighScores(difficulty);
  }

  /**
   * Clear all high scores from localStorage (all difficulties)
   */
  static clearAllHighScores(): void {
    const difficulties = ['easy', 'medium', 'hard'];
    difficulties.forEach(difficulty => {
      this.clearHighScores(difficulty);
    });
  }
}
