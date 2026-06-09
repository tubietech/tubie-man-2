/**
 * Character representations for map tiles in the intermediate tile string.
 * These characters are used to visualize the map in a terminal/console.
 */
export enum MapTile {
  WALL = '_',
  PATH = '.',
  WALL_VERTICAL = '|',
  EMPTY = ' ',
  POWERUP = 'o',
  PEN_DOOR = '-',
  TUNNEL = 'T'
}
