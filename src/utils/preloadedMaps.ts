import { IMapData } from '../interfaces/IMapData';
import { getRandomInt } from './utils';

/**
 * Preloaded maps loader
 * Attempts to load pre-generated maps from the resources directory
 */

let preloadedMaps: IMapData[] | null = null;
let loadAttempted = false;

/**
 * Load all preloaded maps from JSON files
 * @returns Array of preloaded maps, or empty array if none could be loaded
 */
export async function loadPreloadedMaps(): Promise<IMapData[]> {
  // Return cached maps if already loaded
  if (preloadedMaps !== null) {
    return preloadedMaps;
  }

  // Don't try loading again if we already failed
  if (loadAttempted) {
    return [];
  }

  loadAttempted = true;
  const maps: IMapData[] = [];

  console.log('Loading preloaded maps...');

  // Try to load each map file (map0.json through map9.json)
  for (let i = 0; i < 10; i++) {
    try {
      // Use dynamic import with Vite's special syntax for static assets
      const mapModule = await import(`../resources/maps/map${i}.json`);
      const mapData = mapModule.default as IMapData;

      // Validate that the map has required properties
      if (
        mapData &&
        mapData.map &&
        mapData.hash &&
        mapData.penCenter &&
        mapData.penDoor &&
        mapData.playerStart
      ) {
        maps.push(mapData);
        console.log(`✓ Loaded preloaded map ${i} (hash: ${mapData.hash})`);
      } else {
        console.warn(`⚠ Map ${i} is invalid or incomplete`);
      }
    } catch (error) {
      // Map file doesn't exist or failed to load - this is expected if maps haven't been generated yet
      console.log(`Map ${i} not found (this is normal if maps haven't been pre-generated yet)`);
    }
  }

  if (maps.length > 0) {
    console.log(`✓ Successfully loaded ${maps.length} preloaded maps`);
  } else {
    console.warn('⚠ No preloaded maps available. Consider generating them using MapPreGenerator component.');
  }

  preloadedMaps = maps;
  return maps;
}

/**
 * Get a random preloaded map
 * @returns Random preloaded map, or null if none available
 */
export function getRandomPreloadedMap(): IMapData | null {
  if (!preloadedMaps || preloadedMaps.length === 0) {
    return null;
  }

  const randomIndex = getRandomInt(0, preloadedMaps.length - 1);
  return preloadedMaps[randomIndex];
}

/**
 * Get the number of available preloaded maps
 * @returns Number of loaded maps
 */
export function getPreloadedMapCount(): number {
  return preloadedMaps ? preloadedMaps.length : 0;
}

/**
 * Force reload of preloaded maps
 * Useful for development when maps have been updated
 */
export async function reloadPreloadedMaps(): Promise<IMapData[]> {
  preloadedMaps = null;
  loadAttempted = false;
  return loadPreloadedMaps();
}
