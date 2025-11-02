import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';
import { Direction } from '../../enums/Direction';
import { gameConfig } from '../../config/gameConfig';
import { getRandomInt } from '../../utils/utils';

/**
 * Pricky - The twitchy one with nervous energy and unpredictable moves.
 * Moves semi-randomly, changing direction frequently.
 * Sometimes seems to flee, sometimes attacks head-on.
 * Quirk: When player uses fire, panics and runs straight (even into walls).
 */
export class Pricky extends Enemy {
  private isPanicking: boolean = false;
  private panicTimer: number = 0;
  private isPaused: boolean = false;
  private pauseTimer: number = 0;
  private panicDirection: Direction | null = null;
  private lastPlayerFireState: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    super(scene, x, y, 'pricky', 3, speed, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty); // Enemy number 3
  }

  protected triggerQuirk(): void {
    // Check if player is using fire
    const player = (this.scene as GameScene).player;

    if (player.fireActive && !this.lastPlayerFireState) {
      // Player just activated fire - trigger panic!
      this.startPanic();
    }

    this.lastPlayerFireState = player.fireActive;
  }

  private startPanic(): void {
    this.isPanicking = true;
    this.panicTimer = 0;
    this.isPaused = false;
    // Run in opposite direction from player
    const player = (this.scene as GameScene).player;
    const dx = this.gridX - player.gridX;
    const dy = this.gridY - player.gridY;

    // Choose panic direction based on largest difference
    if (Math.abs(dx) > Math.abs(dy)) {
      this.panicDirection = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      this.panicDirection = dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  update(time: number, delta: number): void {
    const player = (this.scene as GameScene).player;

    // Always check for fire activation
    if (player.fireActive && !this.lastPlayerFireState && !this.isPanicking) {
      this.startPanic();
    }
    this.lastPlayerFireState = player.fireActive;

    // Handle pause state
    if (this.isPaused) {
      this.pauseTimer += delta;
      if (this.pauseTimer >= gameConfig.enemy.quirks.pricky.wallPauseDuration) {
        this.isPaused = false;
        this.isPanicking = false;
        this.panicDirection = null;
      }
      return; // Don't move while paused
    }

    // Update panic timer
    if (this.isPanicking) {
      this.panicTimer += delta;
      if (this.panicTimer >= gameConfig.enemy.quirks.pricky.panicDuration) {
        this.isPanicking = false;
        this.panicDirection = null;
      }
    }

    super.update(time, delta);
  }

  updateTarget(): void {
    if (this.isPanicking && this.panicDirection !== null) {
      // Run straight in panic direction
      const distance = 10;
      switch (this.panicDirection) {
        case Direction.UP:
          this.targetX = this.gridX;
          this.targetY = this.gridY - distance;
          break;
        case Direction.DOWN:
          this.targetX = this.gridX;
          this.targetY = this.gridY + distance;
          break;
        case Direction.LEFT:
          this.targetX = this.gridX - distance;
          this.targetY = this.gridY;
          break;
        case Direction.RIGHT:
          this.targetX = this.gridX + distance;
          this.targetY = this.gridY;
          break;
      }

      // Check if we hit a wall in panic direction
      const next = this.getNextPosition(this.panicDirection);
      if (!this.canMove(next.x, next.y)) {
        // Hit a wall! Pause
        this.isPaused = true;
        this.pauseTimer = 0;
      }
    } else {
      // Normal twitchy behavior
      const player = (this.scene as GameScene).player;

      // Semi-random behavior: sometimes chase, sometimes flee, sometimes wander
      // Get behavior chances from config
      const fleeChance = gameConfig.enemy.quirks.pricky.fleeChance;
      const wanderChance = gameConfig.enemy.quirks.pricky.wanderChance;
      const randomBehavior = Math.random();

      if (randomBehavior < fleeChance) {
        // Flee behavior - move away from player
        const dx = this.gridX - player.gridX;
        const dy = this.gridY - player.gridY;
        this.targetX = this.gridX + Math.sign(dx) * 5;
        this.targetY = this.gridY + Math.sign(dy) * 5;
      } else if (randomBehavior < fleeChance + wanderChance) {
        // Wander behavior - pick a random nearby point
        const randomOffset = 8;
        this.targetX = this.gridX + getRandomInt(-randomOffset, randomOffset);
        this.targetY = this.gridY + getRandomInt(-randomOffset, randomOffset);
      } else {
        // Chase behavior - move toward player
        this.targetX = player.gridX;
        this.targetY = player.gridY;
      }

      // Clamp targets to map bounds
      this.targetX = Math.max(0, Math.min(this.mapData.map[0].length - 1, this.targetX));
      this.targetY = Math.max(0, Math.min(this.mapData.map.length - 1, this.targetY));
    }
  }
}
