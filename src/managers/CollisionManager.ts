import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Bonus } from '../entities/Bonus';
import { ICollisionContext } from '../interfaces/ICollisionContext';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Callbacks for collision events that need to be handled by the scene
 */
export interface ICollisionCallbacks {
  onPlayerDeath: () => void;
  onEnemyInjured: (enemy: Enemy, score: number) => void;
  onBonusCollected: (bonus: Bonus, score: number) => void;
}

/**
 * Manages collision detection between game entities.
 * Extracts collision logic from GameScene.
 */
export class CollisionManager {
  private callbacks: ICollisionCallbacks;
  private gameLogger: Logger;
  private bonusLogger: Logger;

  constructor(callbacks: ICollisionCallbacks) {
    this.callbacks = callbacks;
    this.gameLogger = new Logger(LogGroup.GAME);
    this.bonusLogger = new Logger(LogGroup.BONUS);
  }

  /**
   * Check collisions between player and enemies
   */
  checkEnemyCollision(
    player: Player,
    enemies: Enemy[],
    context: ICollisionContext
  ): void {
    // Skip collision detection if player is dying or invulnerable
    if (player.isDying || player.isInvulnerable)
      return;

    const collisionResult = player.checkEnemyCollisions(enemies);

    if (collisionResult.hasCollision) {
      if (collisionResult.hitByFire && collisionResult.enemy) {
        // Check if enemy is already injured - don't score again
        if (collisionResult.enemy.isInjured)
          return;

        // Check if enemy is fire-resistant (Stingy in Sterile Mode)
        const enemy = collisionResult.enemy as any;
        if (enemy.isFireResistant) {
          this.gameLogger.log('Enemy is fire-resistant! Fire has no effect.');
          return;
        }

        // Enemy was hit by fire - injure them
        // Capture enemy position before injuring (sprite may move)
        const enemyX = collisionResult.enemy.sprite.x;
        const enemyY = collisionResult.enemy.sprite.y;

        // Record injury and get combo score (handles combo reset internally)
        const injuryScore = context.gameState.recordInjury(context.time);
        context.addScore(injuryScore);

        // Show floating score at enemy location
        context.showInjuryScore(enemyX, enemyY, injuryScore);

        // Play enemy hit sound effect
        context.playSound('enemyHit');

        // Injure the enemy (changes to gray, pathfinds to pen)
        collisionResult.enemy.injure();

        // Notify callback
        this.callbacks.onEnemyInjured(collisionResult.enemy, injuryScore);
      } else {
        // Player collided with enemy - only lose life if enemy is not injured
        if (!collisionResult.enemy?.isInjured) {
          context.loseLife();
          this.callbacks.onPlayerDeath();
        }
      }
    }
  }

  /**
   * Check collision between player and bonus
   */
  checkBonusCollection(
    player: Player,
    bonus: Bonus | null,
    context: ICollisionContext
  ): boolean {
    if (!bonus || !bonus.isActive())
      return false;

    // Collision occurs when the edge of the bonus sprite reaches the center of the player's tile
    // Using threshold of 1.0 for consistent gameplay feel with other collision types
    if (player.checkCollision(bonus, 1.0)) {
      // Capture position and score before collecting (which destroys the sprite)
      const bonusX = bonus.sprite.x;
      const bonusY = bonus.sprite.y;
      const bonusScore = bonus.score;

      // Collect bonus
      bonus.collect();
      context.addScore(bonusScore);

      // Play bonus collect sound effect
      context.playSound('bonusCollect');

      this.bonusLogger.log(`Collected! Score +${bonusScore}, New total: ${context.gameState.getScore()}`);

      // Show floating score sprite at the bonus location
      context.showFloatingScore(bonusX, bonusY, bonusScore);

      // Notify callback
      this.callbacks.onBonusCollected(bonus, bonusScore);

      return true;
    }

    return false;
  }
}
