import { ICoordinate } from './ICoordinate';
import { ITunnel } from './ITunnel';

/**
 * Map data structure containing all generated map information
 */
export interface IMapData {
  /** 2D array of tile types */
  map: number[][];
  /** List of tunnel entrance/exit pairs */
  tunnels: ITunnel[];
  /** Center position of the enemy pen */
  penCenter: ICoordinate;
  /** Position of the pen door */
  penDoor: ICoordinate;
  /** Boundaries of the enemy pen */
  penBounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Player starting position */
  playerStart: ICoordinate;
  /** Positions of powerups */
  powerPellets: ICoordinate[];
  /** Bonus path through the map (tunnel -> pen -> tunnel) */
  bonusPath: ICoordinate[];
  /** Hash of the map for uniqueness comparison */
  hash: string;
}

/**
 * Tile types:
 * 0 = path (walkable)
 * 1 = wall (not walkable)
 * 2 = enemy pen interior (not walkable by player)
 * 3 = pen door (walkable, bright orange)
 * 4 = tunnel (walkable, green, teleports player)
 * 5 = powerup location
 */
