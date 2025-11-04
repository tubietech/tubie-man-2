import { Direction } from '../enums/Direction';
import { ICoordinate } from './ICoordinate';
import { Projectile } from '../entities/Projectile';

/**
 * Interface for powerup activation strategies
 * Defines the contract for how the player's fire powerup spawns and manages projectiles
 */
export interface IPowerActivationStrategy {
  /**
   * Activate the fire powerup
   * @param playerPos Current grid position of the player
   * @param direction Direction the player is facing
   * @returns True if fire was successfully activated, false otherwise
   */
  activate(playerPos: ICoordinate, direction: Direction): boolean;

  /**
   * Update the fire powerup state
   * @param delta Time elapsed since last frame (ms)
   */
  update(delta: number): void;

  /**
   * Deactivate the fire powerup and clean up all projectiles
   */
  deactivate(): void;

  /**
   * Check if fire is currently active
   */
  isActive(): boolean;

  /**
   * Check if player has fire power available
   */
  hasPower(): boolean;

  /**
   * Set whether player has fire power available
   */
  setPower(hasPower: boolean): void;

  /**
   * Get positions of all active projectiles
   */
  getFirePositions(): ICoordinate[];

  /**
   * Get all active projectile instances
   */
  getProjectiles(): Projectile[];
}
