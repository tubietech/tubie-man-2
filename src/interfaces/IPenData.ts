import { ICoordinate } from './ICoordinate';

/**
 * Enemy pen data structure containing pen location information
 */
export interface IPenData {
  /** Center position of the enemy pen */
  penCenter: ICoordinate;
  /** Position of the pen door */
  penDoor: ICoordinate;
  /** Boundaries of the enemy pen */
  penBounds: { minX: number; maxX: number; minY: number; maxY: number };
}
