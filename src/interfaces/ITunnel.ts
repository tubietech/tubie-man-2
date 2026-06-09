import { ICoordinate } from './ICoordinate';

/**
 * Tunnel data structure containing entrance and exit positions
 */
export interface ITunnel {
  /** Tunnel entrance location */
  location: ICoordinate;
  /** Tunnel exit target */
  target: ICoordinate;
}
