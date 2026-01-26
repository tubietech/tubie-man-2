/**
 * Represents a single high score entry
 */
export interface IHighScoreEntry {
  score: number;
  name: string;        // 3 characters
  datetime: string;    // ISO 8601 format
}

/**
 * Data structure for storing high scores in localStorage
 */
export interface IHighScoreData {
  entries: IHighScoreEntry[];
}
