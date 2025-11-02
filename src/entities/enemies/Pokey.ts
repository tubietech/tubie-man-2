import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';
import { gameConfig } from '../../config/gameConfig';

/**
 * Pokey - The eager rookie who always lunges first and thinks later.
 * Direct chaser. Constantly tries to close distance with Tubie-Man,
 * following the most obvious path through the maze.
 * Quirk: Gets stuck in a loop pattern periodically.
 */
export class Pokey extends Enemy {
  private isLooping: boolean = false;
  private loopTimer: number = 0;
  private loopCenter: { x: number; y: number } | null = null;
  private loopPhase: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    super(scene, x, y, 'pokey', 2, speed, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty); // Enemy number 2
  }

  protected triggerQuirk(): void {
    // Start looping behavior
    this.isLooping = true;
    this.loopTimer = 0;
    this.loopCenter = { x: this.gridX, y: this.gridY };
    this.loopPhase = 0;
  }

  update(time: number, delta: number): void {
    // Update loop timer if looping
    if (this.isLooping) {
      this.loopTimer += delta;
      const loopDuration = gameConfig.enemy.quirks.pokey.loopDuration;

      if (this.loopTimer >= loopDuration) {
        this.isLooping = false;
        this.loopCenter = null;
      }
    }

    super.update(time, delta);
  }

  updateTarget(): void {
    if (this.isLooping && this.loopCenter) {
      // Move in a circular pattern around the loop center
      const radius = gameConfig.enemy.quirks.pokey.loopRadius;
      this.loopPhase += 0.1; // Increment phase for circular motion

      // Create a square loop pattern
      const angle = this.loopPhase % 4;
      if (angle < 1) {
        // Right
        this.targetX = this.loopCenter.x + radius;
        this.targetY = this.loopCenter.y;
      } else if (angle < 2) {
        // Down
        this.targetX = this.loopCenter.x;
        this.targetY = this.loopCenter.y + radius;
      } else if (angle < 3) {
        // Left
        this.targetX = this.loopCenter.x - radius;
        this.targetY = this.loopCenter.y;
      } else {
        // Up
        this.targetX = this.loopCenter.x;
        this.targetY = this.loopCenter.y - radius;
      }
    } else {
      // Normal behavior - direct chase
      const player = (this.scene as GameScene).player;
      this.targetX = player.gridX;
      this.targetY = player.gridY;
    }
  }
}
