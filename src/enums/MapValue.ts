/**
 * Numeric values for map tiles in the 2D map array.
 * These values represent different types of tiles in the final map.
 */
export enum MapValue {
  PATH = 0,
  WALL = 1,
  PEN_INTERIOR = 2,
  PEN_DOOR = 3,
  TUNNEL = 4,
  POWERUP = 5
}
