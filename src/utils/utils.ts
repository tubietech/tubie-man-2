/**
 * Utility functions for common operations
 */

import { ICoordinate } from '../interfaces/ICoordinate';
import { gameConfig } from '../config/gameConfig';
import { Random } from './Random';

// Re-export Random class for direct access
export { Random } from './Random';

/**
 * Check if a coordinate position is a wall tile
 * @param coord The coordinate to check
 * @param map The 2D map array
 * @returns True if the position is a wall, false otherwise
 */
export function isWall(coord: ICoordinate, map: number[][]): boolean {
  if (coord.y < 0 || coord.y >= map.length || coord.x < 0 || coord.x >= map[0].length) {
    return false;
  }
  return map[coord.y][coord.x] === 1;
}

/**
 * Get a random integer between min and max (inclusive)
 * Uses seeded random for deterministic replay
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer between min and max
 */
export function getRandomInt(min: number, max: number): number {
  return Random.getInt(min, max);
}

/**
 * Get a random floating-point number between min and max
 * Uses seeded random for deterministic replay
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random float between min and max
 */
export function getRandomFloat(min: number, max: number): number {
  return Random.getFloat(min, max);
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param list Array to shuffle
 */
export function shuffleArray<T>(list: T[]): void {
  Random.shuffleArray(list);
}

/**
 * Get a random element from an array
 * @param list Array to select from
 * @returns Random element from the array, or undefined if array is empty
 */
export function getRandomArrayElement<T>(list: T[]): T | undefined {
  return Random.getArrayElement(list);
}

/**
 * Simple hash function for strings
 * @param str String to hash
 * @returns Hash value as hex string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a hash for map data to identify unique maps
 * @param mapData The map data to hash
 * @returns Hash string
 */
export function generateMapHash(mapData: { map: number[][], tunnels: any[], powerPellets: any[] }): string {
  // Create a string representation of the critical map data
  const mapString = mapData.map.map(row => row.join('')).join('|');
  const tunnelsString = mapData.tunnels.map(t => `${t.location.x},${t.location.y}->${t.target.x},${t.target.y}`).join('|');
  const powerupsString = mapData.powerPellets.map(p => `${p.x},${p.y}`).sort().join('|');

  // Combine all strings and hash
  const combined = `${mapString}:${tunnelsString}:${powerupsString}`;
  return simpleHash(combined);
}

/**
 * Check if player is close enough to eat a pellet
 * @param pelletCenter The center coordinates of the pellet
 * @param playerPos The current position of the player
 * @param tileSize The size of a tile in pixels
 * @returns True if player can eat the pellet, false otherwise
 */
export function canEatPellet(pelletCenter: ICoordinate, playerPos: ICoordinate, tileSize: number): boolean {
  const distX = Math.abs(playerPos.x - pelletCenter.x);
  const distY = Math.abs(playerPos.y - pelletCenter.y);
  const distance = Math.sqrt(distX * distX + distY * distY);

  // Only eat pellet when player is within configured distance from center
  return distance < tileSize * gameConfig.map.pellet.eatDistance;
}

/**
 * Calculate scaled speed based on difficulty and tile size
 * @param baseSpeedConfig The base speed configuration object (e.g., gameConfig.player.speed)
 * @param difficulty The current difficulty level
 * @param tileSize The current tile size in pixels
 * @returns Scaled speed value
 */
export function calculateScaledSpeed(baseSpeedConfig: { easy: number; medium: number; hard: number }, difficulty: string, tileSize: number): number {
  const baseSpeed = baseSpeedConfig[difficulty as keyof typeof baseSpeedConfig];
  return baseSpeed * (tileSize / gameConfig.map.tileSize);
}

/**
 * Calculate random pellet counts for bonus appearances
 * @returns Array of two pellet counts when bonuses should appear
 */
export function calculateBonusAppearances(): number[] {
  const firstMin = gameConfig.map.bonus.firstAppearance.min;
  const firstMax = gameConfig.map.bonus.firstAppearance.max;
  const secondMin = gameConfig.map.bonus.secondAppearance.min;
  const secondMax = gameConfig.map.bonus.secondAppearance.max;

  return [
    getRandomInt(firstMin, firstMax),
    getRandomInt(secondMin, secondMax)
  ];
}
