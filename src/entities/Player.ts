import Phaser from 'phaser';
import { Entity } from './Entity';
import { Enemy } from './enemies/Enemy';
import { Direction } from '../enums/Direction';
import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { IMovementInput } from '../interfaces/IMovementInput';
import { ICollisionResult } from '../interfaces/ICollisionResult';
import { IPowerActivationStrategy } from '../interfaces/IPowerActivationStrategy';
import { PowerActivationV2 } from './powerup/PowerActivationV2';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';
import { Difficulty } from '../enums/Difficulty';
import { SettingsManager } from '../utils/SettingsManager';
import { TubeType } from '../enums/TubeType';
export class Player extends Entity {
  hasFirePower: boolean = false;
  fireActive: boolean = false;
  inputQueue: Direction[] = [];
  isMoving: boolean = false;
  lastDirection: Direction = Direction.RIGHT;
  isDying: boolean = false;
  isInvulnerable: boolean = false;
  invulnerabilityTimer: number = 0;
  originalScale: number = 1;

  private powerActivationStrategy: IPowerActivationStrategy;
  private difficulty: string;
  private tubeSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: Difficulty  = Difficulty.MEDIUM) {
    super(scene, x, y, speed, mapData, tileSize, mapOffsetX, mapOffsetY);

    this.difficulty = difficulty;

    this.powerActivationStrategy = new PowerActivationV2(scene, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty);

    // Create animated sprite
    const pixelPos = this.getTargetPixelPosition({ x, y });
    this.animatedSprite = scene.add.sprite(
      pixelPos.x,
      pixelPos.y,
      'atlas',
      'player_frame_1.png'
    );

    // Scale sprite to fit tile size, then scale up by config multiplier
    const spriteScale = tileSize / Math.max(this.animatedSprite.width, this.animatedSprite.height);
    this.originalScale = spriteScale * gameConfig.player.spriteScale;
    this.animatedSprite.setScale(this.originalScale);

    // Replace the default circle sprite with the animated sprite
    this.replaceWithCustomSprite(this.animatedSprite);

    // Create tube overlay sprite (rendered on top of the body)
    this.updateTubeSprite();

    // Start with idle frame for right direction
    this.lastDirection = Direction.RIGHT;
  }
  
  /**
   * Process a movement input and add to queue
   */
  processInput(input: IMovementInput): void {
    // Ignore input during death animation
    if (this.isDying) return;

    if (input.continuous) {
      // Continuous input (joystick): replace the entire queue so the latest
      // direction is always tried, even if a previous direction failed
      this.inputQueue = [input.direction];
    } else {
      this.inputQueue.push(input.direction);

      // Limit queue size to prevent overflow
      if (this.inputQueue.length > 2)
        this.inputQueue = this.inputQueue.slice(-2);
    }
  }

  /**
   * Process keyboard input directly
   */
  processKeyboardInput(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: any): void {
    if (cursors.up.isDown || wasd.up.isDown) {
      this.processInput({ direction: Direction.UP });
    }
    if (cursors.down.isDown || wasd.down.isDown) {
      this.processInput({ direction: Direction.DOWN });
    }
    if (cursors.left.isDown || wasd.left.isDown) {
      this.processInput({ direction: Direction.LEFT });
    }
    if (cursors.right.isDown || wasd.right.isDown) {
      this.processInput({ direction: Direction.RIGHT });
    }
  }

  /**
   * Process gamepad input
   */
  processGamepadInput(pad: Phaser.Input.Gamepad.Gamepad): void {
    if (pad.leftStick.x < -0.5) this.processInput({ direction: Direction.LEFT });
    if (pad.leftStick.x > 0.5) this.processInput({ direction: Direction.RIGHT });
    if (pad.leftStick.y < -0.5) this.processInput({ direction: Direction.UP });
    if (pad.leftStick.y > 0.5) this.processInput({ direction: Direction.DOWN });
  }

  /**
   * Process pointer/touch input
   */
  processPointerInput(pointerPos: ICoordinate): void {
    const playerPos = this.getPixelPosition();
    const dx = pointerPos.x - playerPos.x;
    const dy = pointerPos.y - playerPos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.processInput({ direction: dx > 0 ? Direction.RIGHT : Direction.LEFT });
    } else {
      this.processInput({ direction: dy > 0 ? Direction.DOWN : Direction.UP });
    }
  }

  processSwipeInput(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.processInput({ direction: dx > 0 ? Direction.RIGHT : Direction.LEFT });
    } else {
      this.processInput({ direction: dy > 0 ? Direction.DOWN : Direction.UP });
    }
  }

  update(_time: number, delta: number): void {
    // Skip all updates during death animation
    if (this.isDying) return;

    // Update invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= delta;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
      }
    }

    const moveSpeed = this.speed * delta / 1000;

    // Update power activation strategy
    this.powerActivationStrategy.update(delta);

    // Sync fireActive state from strategy
    this.fireActive = this.powerActivationStrategy.isActive();
    this.hasFirePower = this.powerActivationStrategy.hasPower();

    if (this.inputQueue.length > 0) {
      const nextDir = this.inputQueue[0];
      if (this.tryChangeDirection(nextDir)) {
        this.inputQueue.shift();
      }
    }

    this.moveInDirection(moveSpeed);
  }
  
  tryChangeDirection(dir: Direction): boolean {
    const nextPos = this.getNextPosition(dir);
    if (this.canMovePlayer(nextPos.x, nextPos.y)) {
      this.direction = dir;
      return true;
    }
    return false;
  }
  
  canMovePlayer(x: number, y: number): boolean {
    if (!this.canMove(x, y)) return false;

    // Player cannot enter pen
    const penBounds = this.mapData.penBounds;
    if (x >= penBounds.minX && x <= penBounds.maxX &&
        y >= penBounds.minY && y <= penBounds.maxY) {
      return false;
    }

    // Player cannot enter pen door (tile value 3)
    if (this.mapData.map[y] && this.mapData.map[y][x] === 3) {
      return false;
    }

    return true;
  }
  
  moveInDirection(speed: number): void {
    const targetX = this.mapOffsetX + this.gridX * this.tileSize + this.tileSize / 2;
    const targetY = this.mapOffsetY + this.gridY * this.tileSize + this.tileSize / 2;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const next = this.getNextPosition(this.direction);
      if (this.canMovePlayer(next.x, next.y)) {
        this.gridX = next.x;
        this.gridY = next.y;
      }
    }

    const newTargetX = this.mapOffsetX + this.gridX * this.tileSize + this.tileSize / 2;
    const newTargetY = this.mapOffsetY + this.gridY * this.tileSize + this.tileSize / 2;

    const moveX = newTargetX - this.sprite.x;
    const moveY = newTargetY - this.sprite.y;
    const dist = Math.sqrt(moveX * moveX + moveY * moveY);

    if (dist > 0) {
      const actualSpeed = Math.min(speed, dist);
      this.sprite.x += (moveX / dist) * actualSpeed;
      this.sprite.y += (moveY / dist) * actualSpeed;
      this.isMoving = true;

      // Play animation based on direction
      this.playDirectionAnimation(this.direction);
      this.lastDirection = this.direction;
    } else {
      // Not moving - freeze on last frame
      this.isMoving = false;
      if (this.animatedSprite && this.animatedSprite.anims && this.animatedSprite.anims.isPlaying) {
        this.animatedSprite.anims.pause();
      }
    }
  }

  updateTubeSprite(): void {
    const tubeType = SettingsManager.getInstance().getTubeType();

    if (this.tubeSprite) {
      this.tubeSprite.destroy();
      this.tubeSprite = null;
    }

    if (tubeType === TubeType.NONE || !this.animatedSprite) return;

    const pos = this.getPixelPosition();
    this.tubeSprite = this.scene.add.sprite(pos.x, pos.y, 'atlas', `${tubeType}.png`);
    this.tubeSprite.setScale(this.originalScale);
    // Sit just above the body sprite in depth
    this.tubeSprite.setDepth((this.animatedSprite.depth || 0) + 1);
  }

  private playDirectionAnimation(direction: Direction): void {
    if (!this.animatedSprite || !this.animatedSprite.anims) {
      return;
    }

    const angles: Record<Direction, number> = {
      [Direction.RIGHT]: 0,
      [Direction.DOWN]: 90,
      [Direction.LEFT]: 0,
      [Direction.UP]: 270,
    };
    this.animatedSprite.setAngle(angles[direction]);
    this.animatedSprite.setFlipX(direction === Direction.LEFT);

    if (this.tubeSprite) {
      this.tubeSprite.setPosition(this.animatedSprite.x, this.animatedSprite.y);
      this.tubeSprite.setAngle(angles[direction]);
      this.tubeSprite.setFlipX(direction === Direction.LEFT);
    }

    if (this.animatedSprite.anims.currentAnim?.key !== 'player_anim' || !this.animatedSprite.anims.isPlaying) {
      this.animatedSprite.play('player_anim');
    }
  }
  
  activateFire(): void {
    const playerLogger = new Logger(LogGroup.PLAYER);

    playerLogger.log(`ActivateFire called - isDying: ${this.isDying}`);

    // Cannot activate fire during death animation
    if (this.isDying) {
      playerLogger.log(`Fire activation blocked - player is dying`);
      return;
    }

    // Delegate to power activation strategy
    const playerPos: ICoordinate = { x: this.gridX, y: this.gridY };
    const success = this.powerActivationStrategy.activate(playerPos, this.direction);

    // Sync state from strategy
    this.fireActive = this.powerActivationStrategy.isActive();
    this.hasFirePower = this.powerActivationStrategy.hasPower();

    if (success) {
      playerLogger.log(`Fire activated successfully`);
    }
  }

  deactivateFire(): void {
    this.powerActivationStrategy.deactivate();
    this.powerActivationStrategy.destroyAllProjectiles();
    this.fireActive = false;
    this.hasFirePower = false;
  }

  /**
   * Give the player fire power
   * This syncs with the power activation strategy
   */
  giveFirePower(): void {
    this.hasFirePower = true;
    this.powerActivationStrategy.setPower(true);
  }

  getFirePositions(): ICoordinate[] {
    return this.powerActivationStrategy.getFirePositions();
  }

  getRemainingPowerDuration(): number {
    return this.powerActivationStrategy.getRemainingDuration();
  }

  getFireCooldown(): number {
    return this.powerActivationStrategy.getFireCooldown();
  }

  getDifficulty(): string {
    return this.difficulty;
  }

  /**
   * Check for collisions with enemies
   * Returns collision result with details about what was hit
   */
  checkEnemyCollisions(enemies: Enemy[]): ICollisionResult {
    const projectiles = this.powerActivationStrategy.getProjectiles();

    for (const enemy of enemies) {
      // Check if enemy is hit by projectile (pixel-based Euclidean distance)
      const hitByProjectile = projectiles.some(projectile =>
        projectile.checkCollision(enemy, gameConfig.collision.projectileEnemyRadius)
      );

      if (hitByProjectile) {
        return {
          hasCollision: true,
          enemy: enemy,
          hitByFire: true
        };
      }

      // Check if player collides with enemy (pixel-based Euclidean distance)
      if (this.checkCollision(enemy, gameConfig.collision.playerEnemyRadius)) {
        return {
          hasCollision: true,
          enemy: enemy,
          hitByFire: false
        };
      }
    }

    return { hasCollision: false };
  }

  /**
   * Activate invulnerability for the configured duration
   */
  activateInvulnerability(): void {
    this.isInvulnerable = true;
    this.invulnerabilityTimer = gameConfig.player.invulnerabilityDuration;
  }

  /**
   * Reset player to starting position and state
   */
  reset(startX: number, startY: number): void {
    this.moveTo(startX, startY);
    this.direction = Direction.RIGHT;
    this.lastDirection = Direction.RIGHT;
    this.inputQueue = [];
    this.deactivateFire();
    this.hasFirePower = false;

    // Restore original sprite scale and play initial animation
    if (this.animatedSprite) {
      this.animatedSprite.setScale(this.originalScale);
    }
    if (this.tubeSprite) {
      this.tubeSprite.setScale(this.originalScale);
    }
    this.playDirectionAnimation(Direction.RIGHT);
  }

  /**
   * Play death animation
   * Changes to frame 2 and spins the sprite
   * Returns a Promise that resolves when animation is complete
   */
  playDeathAnimation(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Set dying state to disable input and movement
      this.isDying = true;

      // Clear input queue
      this.inputQueue = [];

      // Deactivate fire and destroy all projectiles immediately
      this.deactivateFire();

      // Stop any current animations
      if (this.animatedSprite && this.animatedSprite.anims && this.animatedSprite.anims.isPlaying) {
        this.animatedSprite.anims.stop();
      }

      // Set sprite to frame 2 of the current direction animation
      const frame = this.getDeathFrame();
      if (frame && this.animatedSprite) {
        this.animatedSprite.setFrame(frame);
      }

      // Calculate total spin duration
      const { spinCount, spinDuration } = gameConfig.player.deathAnimation;
      const totalDuration = spinCount * spinDuration;

      const tweenTargets = [this.animatedSprite, this.tubeSprite].filter(Boolean);

      // Create spin animation using Phaser tweens
      this.scene.tweens.add({
        targets: tweenTargets,
        angle: 360 * spinCount,
        duration: totalDuration,
        ease: 'Linear',
        onComplete: () => {
          if (this.animatedSprite) {
            this.animatedSprite.setAngle(0);
            this.animatedSprite.setFlipX(false);
          }
          if (this.tubeSprite) {
            this.tubeSprite.setAngle(0);
            this.tubeSprite.setFlipX(false);
          }
          this.isDying = false;
          this.activateInvulnerability();
          resolve();
        }
      });

      // Create shrink animation that runs simultaneously with spin
      this.scene.tweens.add({
        targets: tweenTargets,
        scale: 0,
        duration: totalDuration,
        ease: 'Linear'
      });
    });
  }

  /**
   * Get the second frame for the death animation based on last direction
   */
  private getDeathFrame(): string {
    return 'player_frame_2.png';
  }

  /**
   * Clean up player resources
   */
  cleanup(): void {
    this.deactivateFire();
    if (this.tubeSprite) {
      this.tubeSprite.destroy();
      this.tubeSprite = null;
    }
    super.cleanup();
  }
}