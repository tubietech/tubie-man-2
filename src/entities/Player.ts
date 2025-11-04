import Phaser from 'phaser';
import { Entity } from './Entity';
import { Enemy } from './enemies/Enemy';
import { Projectile } from './Projectile';
import { Direction } from '../enums/Direction';
import { MapValue } from '../enums/MapValue';
import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { IMovementInput } from '../interfaces/IMovementInput';
import { ICollisionResult } from '../interfaces/ICollisionResult';

export class Player extends Entity {
  hasFirePower: boolean = false;
  fireActive: boolean = false;
  fireDuration: number = 0;
  projectiles: Projectile[] = [];
  inputQueue: Direction[] = [];
  animatedSprite!: Phaser.GameObjects.Sprite;
  isMoving: boolean = false;
  lastDirection: Direction = Direction.RIGHT;
  isDying: boolean = false;
  isInvulnerable: boolean = false;
  invulnerabilityTimer: number = 0;
  originalScale: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number) {
    super(scene, x, y, color, speed, mapData, tileSize, mapOffsetX, mapOffsetY);

    // Destroy the circle sprite created by parent
    this.sprite.destroy();

    // Create animated sprite
    this.animatedSprite = scene.add.sprite(
      mapOffsetX + x * tileSize + tileSize / 2,
      mapOffsetY + y * tileSize + tileSize / 2,
      'atlas',
      'player_right_frame_1.png'
    );

    // Scale sprite to fit tile size, then scale up by 50%
    const spriteScale = tileSize / Math.max(this.animatedSprite.width, this.animatedSprite.height);
    this.originalScale = spriteScale * gameConfig.player.spriteScale;
    this.animatedSprite.setScale(this.originalScale);

    // Update sprite reference to point to animated sprite
    this.sprite = this.animatedSprite;

    // Start with idle frame for right direction
    this.lastDirection = Direction.RIGHT;
  }
  
  /**
   * Process a movement input and add to queue
   */
  processInput(input: IMovementInput): void {
    // Ignore input during death animation
    if (this.isDying) return;

    this.inputQueue.push(input.direction);

    // Limit queue size to prevent overflow
    if (this.inputQueue.length > 2) {
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

    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);

      // Clean up inactive projectiles
      if (!projectile.active) {
        console.log(`[PLAYER] Projectile ${i} became inactive, cleaning up`);
        this.projectiles.splice(i, 1);
      }
    }

    // Update fire duration timer
    if (this.fireActive) {
      this.fireDuration -= delta;
      if (this.fireDuration <= 0) {
        console.log(`[PLAYER] Fire duration expired, deactivating`);
        this.deactivateFire();
      }
    }

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

  private playDirectionAnimation(direction: Direction): void {
    // Safety check: ensure sprite and anims exist
    if (!this.animatedSprite || !this.animatedSprite.anims) {
      return;
    }

    let animKey = '';

    switch (direction) {
      case Direction.UP:
        animKey = 'player_up';
        break;
      case Direction.DOWN:
        animKey = 'player_down';
        break;
      case Direction.LEFT:
        animKey = 'player_left';
        break;
      case Direction.RIGHT:
        animKey = 'player_right';
        break;
    }

    // Only play if not already playing this animation
    if (this.animatedSprite.anims.currentAnim?.key !== animKey) {
      this.animatedSprite.play(animKey);
    } else if (!this.animatedSprite.anims.isPlaying) {
      this.animatedSprite.anims.resume();
    }
  }
  
  activateFire(): void {
    console.log(`[PLAYER] activateFire called - hasFirePower: ${this.hasFirePower}, fireActive: ${this.fireActive}, isDying: ${this.isDying}`);

    // Cannot activate fire during death animation
    if (this.isDying) {
      console.log(`[PLAYER] Fire activation blocked - player is dying`);
      return;
    }

    if (!this.hasFirePower || this.fireActive) {
      console.log(`[PLAYER] Fire activation blocked - hasFirePower: ${this.hasFirePower}, fireActive: ${this.fireActive}`);
      return;
    }

    // Check if there's a wall directly in front of the player
    let checkX = this.gridX;
    let checkY = this.gridY;

    switch (this.direction) {
      case Direction.UP: checkY--; break;
      case Direction.DOWN: checkY++; break;
      case Direction.LEFT: checkX--; break;
      case Direction.RIGHT: checkX++; break;
    }

    // Check if the tile in front is a wall
    if (this.isWall(checkX, checkY)) {
      console.log(`[PLAYER] Cannot fire - wall directly in front at (${checkX}, ${checkY})`);
      return;
    }

    this.fireActive = true;
    this.fireDuration = gameConfig.player.fireBreathDuration;
    this.hasFirePower = false;

    // Create multiple projectiles in a row based on config
    const projectileCount = gameConfig.player.projectile.count;
    console.log(`[PLAYER] Creating ${projectileCount} projectile(s) from player position (${this.gridX}, ${this.gridY}), facing ${Direction[this.direction]}`);

    for (let i = 1; i <= projectileCount; i++) {
      // Calculate starting position for this projectile (one tile ahead + i-1 additional tiles)
      let startX = this.gridX;
      let startY = this.gridY;

      // Offset by i tiles in the firing direction
      switch (this.direction) {
        case Direction.UP: startY -= i; break;
        case Direction.DOWN: startY += i; break;
        case Direction.LEFT: startX -= i; break;
        case Direction.RIGHT: startX += i; break;
      }

      const startPos: ICoordinate = { x: startX, y: startY };

      const projectile = new Projectile(
        this.scene,
        startPos,
        this.direction,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        gameConfig.player.projectile.speed
      );

      // Only add projectile if it was successfully created (not blocked by wall)
      if (projectile.active) {
        this.projectiles.push(projectile);
      }
    }

    console.log(`[PLAYER] ${this.projectiles.length} projectile(s) created successfully`);
  }

  private isWall(x: number, y: number): boolean {
    // Check if out of bounds
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return true;
    }

    const tile = this.mapData.map[y][x];
    return tile === MapValue.WALL || tile === MapValue.PEN_DOOR;
  }

  deactivateFire(): void {
    this.fireActive = false;

    // Clean up all projectiles
    if (this.projectiles && this.projectiles.length > 0) {
      for (const projectile of this.projectiles) {
        if (projectile && projectile.active) {
          projectile.destroy();
        }
      }
      this.projectiles = [];
    }
  }

  getFirePositions(): ICoordinate[] {
    // Return positions of all active projectiles
    return this.projectiles
      .filter(p => p.active)
      .map(p => p.getGridPosition());
  }

  /**
   * Check for collisions with enemies
   * Returns collision result with details about what was hit
   */
  checkEnemyCollisions(enemies: Enemy[]): ICollisionResult {
    const firePositions = this.getFirePositions();
    const playerPos = this.getGridPosition();

    for (const enemy of enemies) {
      const enemyPos = enemy.getGridPosition();

      // Check if enemy is hit by fire
      const hitByFire = firePositions.some(pos =>
        pos.x === enemyPos.x && pos.y === enemyPos.y
      );

      if (hitByFire) {
        return {
          hasCollision: true,
          enemy: enemy,
          hitByFire: true
        };
      }

      // Check if player collides with enemy
      const dist = this.getGridDistance(playerPos, enemyPos);
      if (dist < 1) {
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
    this.deactivateFire();
    this.hasFirePower = false;

    // Restore original sprite scale
    if (this.animatedSprite) {
      this.animatedSprite.setScale(this.originalScale);
    }
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
      if (frame) {
        this.animatedSprite.setFrame(frame);
      }

      // Calculate total spin duration
      const { spinCount, spinDuration } = gameConfig.player.deathAnimation;
      const totalDuration = spinCount * spinDuration;

      // Create spin animation using Phaser tweens
      this.scene.tweens.add({
        targets: this.animatedSprite,
        angle: 360 * spinCount, // Total degrees to rotate
        duration: totalDuration,
        ease: 'Linear',
        onComplete: () => {
          // Reset angle to 0 after animation
          this.animatedSprite.setAngle(0);
          // Re-enable input and movement
          this.isDying = false;
          // Activate invulnerability after respawn
          this.activateInvulnerability();
          resolve();
        }
      });

      // Create shrink animation that runs simultaneously with spin
      this.scene.tweens.add({
        targets: this.animatedSprite,
        scale: 0, // Shrink to nothing
        duration: totalDuration,
        ease: 'Linear'
      });
    });
  }

  /**
   * Get the second frame for the death animation based on last direction
   */
  private getDeathFrame(): string {
    switch (this.lastDirection) {
      case Direction.UP:
        return 'player_up_frame_2.png';
      case Direction.DOWN:
        return 'player_down_frame_2.png';
      case Direction.LEFT:
        return 'player_left_frame_2.png';
      case Direction.RIGHT:
        return 'player_right_frame_2.png';
      default:
        return 'player_right_frame_2.png';
    }
  }
}