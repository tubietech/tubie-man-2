import { ICoordinate } from './ICoordinate';

/**
 * Data for bonus item appearance in a level
 */
export interface IBonusData {
  /** Sprite frame name for this bonus */
  sprite: string;
  /** Point value for this bonus */
  score: number;
  /** Entry tunnel index */
  entryTunnel: number;
  /** Path the bonus follows (grid coordinates) */
  path: ICoordinate[];
}
