import { Enemy } from '../entities/enemies/Enemy';

/**
 * Interface for collision detection results
 */
export interface ICollisionResult {
  /** Whether a collision occurred */
  hasCollision: boolean;
  /** The enemy that was collided with, if any */
  enemy?: Enemy;
  /** Whether the enemy was hit by fire */
  hitByFire?: boolean;
}
