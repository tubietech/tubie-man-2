import { Direction } from '../enums/Direction';

/**
 * Cell structure used in map generation grid
 * Represents a single cell in the 5x9 procedural generation grid
 */
export interface ICell {
  /** X position in grid */
  x: number;
  /** Y position in grid */
  y: number;
  /** Whether this cell has been filled with a wall piece */
  filled: boolean;
  /** Connections to adjacent cells [UP, RIGHT, DOWN, LEFT] */
  connect: [boolean, boolean, boolean, boolean];
  /** References to neighboring cells by direction */
  next: (ICell | undefined)[];
  /** Order number when this cell was filled */
  no: number;
  /** Group ID for this wall piece */
  group: number;
  /** Final x position after upscaling */
  final_x?: number;
  /** Final y position after upscaling */
  final_y?: number;
  /** Final width after upscaling */
  final_w?: number;
  /** Final height after upscaling */
  final_h?: number;
  /** Whether this cell can have its height raised */
  isRaiseHeightCandidate?: boolean;
  /** Whether this cell can have its width shrunk */
  isShrinkWidthCandidate?: boolean;
  /** Whether this cell's height was raised */
  raiseHeight?: boolean;
  /** Whether this cell's width was shrunk */
  shrinkWidth?: boolean;
  /** Whether this cell marks a tunnel location */
  topTunnel?: boolean;
  /** Direction for single dead end tunnels */
  singleDeadEndDir?: Direction;
}
