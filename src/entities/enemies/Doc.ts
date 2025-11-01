import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';
import { gameConfig } from '../../config/gameConfig';

/**
 * Doc - The laid-back supervisor who pretends to be above the chase.
 * Wanders the maze aimlessly until Tubie-Man gets too close,
 * then joins in half-heartedly.
 * Quirk: Occasionally pauses for a random amount of time.
 */
export class Doc extends Enemy {
  private wanderTarget: { x: number; y: number } | null = null;
  private readonly closeDistance: number = 8; // Distance threshold to start chasing
  private isPaused: boolean = false;
  private pauseTimer: number = 0;
  private pauseDuration: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    super(scene, x, y, 'doc', speed, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty);
  }

  protected triggerQuirk(): void {
    // Trigger a pause
    this.isPaused = true;
    this.pauseTimer = 0;

    // Random pause duration from config
    const { min, max } = gameConfig.enemy.quirks.doc.pauseTime;
    this.pauseDuration = min + Math.random() * (max - min);
  }

  update(time: number, delta: number): void {
    // Handle pause state
    if (this.isPaused) {
      this.pauseTimer += delta;
      if (this.pauseTimer >= this.pauseDuration) {
        this.isPaused = false;
      }
      return; // Don't move while paused
    }

    super.update(time, delta);
  }

  updateTarget(): void {
    const player = (this.scene as GameScene).player;
    const dist = Math.abs(this.gridX - player.gridX) + Math.abs(this.gridY - player.gridY);

    if (dist <= this.closeDistance) {
      // Player is close - chase half-heartedly (directly toward player)
      this.targetX = player.gridX;
      this.targetY = player.gridY;
      this.wanderTarget = null; // Clear wander target
    } else {
      // Player is far - wander aimlessly
      // If we don't have a wander target or we're close to it, pick a new one
      if (!this.wanderTarget ||
          (Math.abs(this.gridX - this.wanderTarget.x) < 2 &&
           Math.abs(this.gridY - this.wanderTarget.y) < 2)) {
        // Pick a random point to wander toward
        this.wanderTarget = {
          x: Math.floor(Math.random() * this.mapData.map[0].length),
          y: Math.floor(Math.random() * this.mapData.map.length)
        };
      }

      this.targetX = this.wanderTarget.x;
      this.targetY = this.wanderTarget.y;
    }
  }
}
