import Phaser from 'phaser';
import { Direction } from '../enums/Direction';
import { ICoordinate } from './ICoordinate';

/**
 * Interface for projectile entities
 */
export interface IProjectile {
  /** The sprite representing the projectile */
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;

  /** Current grid position */
  gridPosition: ICoordinate;

  /** Direction the projectile is traveling */
  direction: Direction;

  /** Whether the projectile is active */
  active: boolean;

  /** Update the projectile position and state */
  update(delta: number): void;

  /** Destroy the projectile */
  destroy(): void;

  /** Get the current grid position */
  getGridPosition(): ICoordinate;
}
