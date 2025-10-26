/**
 * Utility functions for common operations
 */

/**
 * Get a random integer between min and max (inclusive)
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer between min and max
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param list Array to shuffle
 */
export function shuffleArray<T>(list: T[]): void {
  for (let i = 0; i < list.length; i++) {
    const j = getRandomInt(0, list.length - 1);
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

/**
 * Get a random element from an array
 * @param list Array to select from
 * @returns Random element from the array, or undefined if array is empty
 */
export function getRandomArrayElement<T>(list: T[]): T | undefined {
  if (list.length > 0) {
    return list[getRandomInt(0, list.length - 1)];
  }
  return undefined;
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
