import { Direction } from '../enums/Direction';

/**
 * Interface for movement input data
 */
export interface IMovementInput {
  /** Direction to move */
  direction: Direction;
  /** Timestamp when input was received */
  timestamp?: number;
  /** If true, this is continuous input (e.g., joystick held) — replaces the queue instead of appending */
  continuous?: boolean;
}
