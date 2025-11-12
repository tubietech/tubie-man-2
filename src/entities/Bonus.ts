import Phaser from 'phaser';
import { Entity } from './Entity';
import { ICoordinate } from '../interfaces/ICoordinate';
import { IBonusData } from '../interfaces/IBonusData';
import { IMapData } from '../interfaces/IMapData';
import { gameConfig } from '../config/gameConfig';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Bonus entity that follows a predetermined path through the map
 */
export class Bonus extends Entity {
  active: boolean;
  collected: boolean;
  score: number;

  private path: ICoordinate[];
  private currentPathIndex: number;
  private targetPixelPosition: ICoordinate | null;
  private logger: Logger;

  constructor(
    scene: Phaser.Scene,
    bonusData: IBonusData,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    mapData: IMapData,
    speed: number
  ) {
    // Initialize Entity with dummy color (will be replaced by sprite)
    const startPos = bonusData.path[0];
    super(scene, startPos.x, startPos.y, 0x000000, speed, mapData, tileSize, mapOffsetX, mapOffsetY);

    this.path = bonusData.path;
    this.score = bonusData.score;
    this.active = true;
    this.collected = false;
    this.currentPathIndex = 0;
    this.targetPixelPosition = null;

    // Destroy the circle sprite created by Entity
    this.sprite.destroy();

    // Create custom sprite at first path position
    const pixelX = mapOffsetX + startPos.x * tileSize + tileSize / 2;
    const pixelY = mapOffsetY + startPos.y * tileSize + tileSize / 2;
    this.sprite = scene.add.sprite(pixelX, pixelY, 'atlas', bonusData.sprite);

    // Scale sprite based on config
    const targetSize = tileSize * gameConfig.map.bonus.scale;
    const spriteScale = targetSize / this.sprite.width;
    this.sprite.setScale(spriteScale);
    this.logger = new Logger(LogGroup.BONUS);

    this.logger.log(`Created bonus at (${startPos.x}, ${startPos.y}) with sprite ${bonusData.sprite}, score: ${bonusData.score}`);
  }

  update(delta: number): void {
    if (!this.active || this.collected) {
      return;
    }

    // If no target, get next position from path
    if (!this.targetPixelPosition) {
      this.currentPathIndex++;

      // Check if we've reached the end of the path
      if (this.currentPathIndex >= this.path.length) {
        this.logger.log('Reached end of path, cleaning up');
        this.cleanup();
        return;
      }

      const nextGridPos = this.path[this.currentPathIndex];
      this.targetPixelPosition = {
        x: this.mapOffsetX + nextGridPos.x * this.tileSize + this.tileSize / 2,
        y: this.mapOffsetY + nextGridPos.y * this.tileSize + this.tileSize / 2
      };
    }

    // Move towards target
    const moveDistance = this.speed * (delta / 1000);
    const dx = this.targetPixelPosition.x - this.sprite.x;
    const dy = this.targetPixelPosition.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= moveDistance) {
      // Reached target - update grid position
      this.sprite.x = this.targetPixelPosition.x;
      this.sprite.y = this.targetPixelPosition.y;

      // Update grid position to match current path position
      const currentGridPos = this.path[this.currentPathIndex];
      this.gridX = currentGridPos.x;
      this.gridY = currentGridPos.y;

      this.targetPixelPosition = null;
    } else {
      // Move towards target
      this.sprite.x += (dx / distance) * moveDistance;
      this.sprite.y += (dy / distance) * moveDistance;
    }
  }

  /**
   * Collect the bonus
   */
  collect(): void {
    if (this.collected) {
      return;
    }

    this.logger.log(`Collected! Score: ${this.score}`);
    this.collected = true;
    this.cleanup();
  }

  /**
   * Check if bonus is still active and not collected
   */
  isActive(): boolean {
    return this.active && !this.collected;
  }

  /**
   * Clean up bonus resources
   */
  cleanup(): void {
    this.active = false;
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
    }
  }
}
