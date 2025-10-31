import Phaser from 'phaser';
import { ICoordinate } from '../interfaces/ICoordinate';
import { IBonusData } from '../interfaces/IBonusData';
import { gameConfig } from '../config/gameConfig';

/**
 * Bonus entity that follows a predetermined path through the map
 */
export class Bonus {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
  collected: boolean;
  score: number;

  private scene: Phaser.Scene;
  private path: ICoordinate[];
  private currentPathIndex: number;
  private speed: number;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private targetPixelPosition: ICoordinate | null;

  constructor(
    scene: Phaser.Scene,
    bonusData: IBonusData,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    speed: number
  ) {
    this.scene = scene;
    this.path = bonusData.path;
    this.score = bonusData.score;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.speed = speed;
    this.active = true;
    this.collected = false;
    this.currentPathIndex = 0;
    this.targetPixelPosition = null;

    // Create sprite at first path position
    const startPos = this.path[0];
    const pixelX = mapOffsetX + startPos.x * tileSize + tileSize / 2;
    const pixelY = mapOffsetY + startPos.y * tileSize + tileSize / 2;

    this.sprite = scene.add.sprite(pixelX, pixelY, 'atlas', bonusData.sprite);

    // Scale sprite based on config
    const targetSize = tileSize * gameConfig.map.bonus.scale;
    const spriteScale = targetSize / this.sprite.width;
    this.sprite.setScale(spriteScale);

    console.log(`[BONUS] Created bonus at (${startPos.x}, ${startPos.y}) with sprite ${bonusData.sprite}, score: ${bonusData.score}`);
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
        console.log('[BONUS] Reached end of path, deactivating');
        this.deactivate();
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
      // Reached target
      this.sprite.x = this.targetPixelPosition.x;
      this.sprite.y = this.targetPixelPosition.y;
      this.targetPixelPosition = null;
    } else {
      // Move towards target
      this.sprite.x += (dx / distance) * moveDistance;
      this.sprite.y += (dy / distance) * moveDistance;
    }
  }

  /**
   * Get current grid position
   */
  getGridPosition(): ICoordinate {
    const gridX = Math.round((this.sprite.x - this.mapOffsetX) / this.tileSize);
    const gridY = Math.round((this.sprite.y - this.mapOffsetY) / this.tileSize);
    return { x: gridX, y: gridY };
  }

  /**
   * Collect the bonus
   */
  collect(): void {
    if (this.collected) {
      return;
    }

    console.log(`[BONUS] Collected! Score: ${this.score}`);
    this.collected = true;
    this.deactivate();
  }

  /**
   * Deactivate and destroy the bonus
   */
  deactivate(): void {
    this.active = false;
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
    }
  }

  /**
   * Check if bonus is still active and not collected
   */
  isActive(): boolean {
    return this.active && !this.collected;
  }
}
