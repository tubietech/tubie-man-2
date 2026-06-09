import { gameConfig } from '../config/gameConfig';
import { getRandomInt } from './utils';

/**
 * Handles bonus sprite and score selection based on level
 */
export class BonusSelector {
  private static previousBonuses: number[] = [];

  /**
   * Select bonus sprite and score for a given level
   * Levels 1-11: Sequential sprites
   * Level 12+: Random sprite (not same as previous 2)
   */
  static selectBonus(level: number): { sprite: string; score: number } {
    const sprites = gameConfig.map.bonus.sprites;
    const scores = gameConfig.map.bonus.scores;

    let spriteIndex: number;
    let score: number;

    if (level <= 11) {
      // Levels 1-11: Use corresponding sprite and score
      spriteIndex = level - 1; // Level 1 = index 0
      score = scores[spriteIndex];
    } else {
      // Level 12+: Random sprite, avoid previous 2
      spriteIndex = this.selectRandomBonusIndex();
      score = gameConfig.map.bonus.defaultScore;
    }

    const sprite = sprites[spriteIndex];

    // Track this bonus for future avoidance
    this.previousBonuses.push(spriteIndex);
    if (this.previousBonuses.length > 2) {
      this.previousBonuses.shift();
    }

    return { sprite, score };
  }

  /**
   * Select a random bonus index, avoiding previous 2
   */
  private static selectRandomBonusIndex(): number {
    const sprites = gameConfig.map.bonus.sprites;
    const availableIndices: number[] = [];

    for (let i = 0; i < sprites.length; i++) {
      if (!this.previousBonuses.includes(i)) {
        availableIndices.push(i);
      }
    }

    // If somehow all are excluded, allow any
    if (availableIndices.length === 0) {
      return getRandomInt(0, sprites.length - 1);
    }

    const randomIndex = getRandomInt(0, availableIndices.length - 1);
    return availableIndices[randomIndex];
  }

  /**
   * Reset tracking (e.g., when starting new game)
   */
  static reset(): void {
    this.previousBonuses = [];
  }
}
