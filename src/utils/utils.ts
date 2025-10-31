/**
 * Utility functions for common operations
 */

import { ICoordinate } from '../interfaces/ICoordinate';

// Phaser type import (type-only, doesn't cause runtime import)
import type Phaser from 'phaser';

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
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function degToRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Draw a rounded corner arc on a graphics object
 * @param graphics The Phaser graphics object to draw on
 * @param centerX The x coordinate of the arc center
 * @param centerY The y coordinate of the arc center
 * @param radius The radius of the arc
 * @param startAngle The starting angle in degrees
 * @param endAngle The ending angle in degrees
 */
export function drawCorner(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): void {
  graphics.beginPath();
  graphics.arc(centerX, centerY, radius, degToRad(startAngle), degToRad(endAngle), false);
  graphics.strokePath();
}

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
