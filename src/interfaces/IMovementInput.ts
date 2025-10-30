import { Direction } from '../enums/Direction';

/**
 * Interface for movement input data
 */
export interface IMovementInput {
  /** Direction to move */
  direction: Direction;
  /** Timestamp when input was received */
  timestamp?: number;
}
