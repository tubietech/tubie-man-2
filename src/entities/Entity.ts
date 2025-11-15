import Phaser from 'phaser';
import { IEntity } from '../interfaces/IEntity';
import { ICoordinate } from '../interfaces/ICoordinate';
import { Direction } from '../enums/Direction';
import { IMapData } from '../interfaces/IMapData';
import { MapValue } from '../enums/MapValue';

export class Entity implements IEntity {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  direction: Direction;
  speed: number;
  scene: Phaser.Scene;
  mapData: IMapData;
  tileSize: number;
  mapOffsetX: number;
  mapOffsetY: number;

  // Optional animated sprite (used by Player, Enemy)
  protected animatedSprite?: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number) {
    this.scene = scene;
    this.gridX = x;
    this.gridY = y;
    this.direction = Direction.RIGHT;
    this.speed = speed;
    this.mapData = mapData;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;

    this.sprite = scene.add.circle(
      mapOffsetX + x * tileSize + tileSize / 2,
      mapOffsetY + y * tileSize + tileSize / 2,
      tileSize / 2 - 2,
      color
    );
  }
  
  update(_time: number, _delta: number): void {
    // Override in subclasses
  }
  
  moveTo(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
    this.sprite.setPosition(
      this.mapOffsetX + x * this.tileSize + this.tileSize / 2,
      this.mapOffsetY + y * this.tileSize + this.tileSize / 2
    );
  }
  
  canMove(x: number, y: number): boolean {
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return false;
    }
    const tile = this.mapData.map[y][x];
    // Can move on paths, pen interior, door, tunnels, powerups, and empty tiles
    return tile === MapValue.PATH ||
           tile === MapValue.PEN_INTERIOR ||
           tile === MapValue.PEN_DOOR ||
           tile === MapValue.TUNNEL ||
           tile === MapValue.POWERUP ||
           tile === MapValue.EMPTY;
  }
  
  getNextPosition(dir: Direction): ICoordinate {
    let nextX = this.gridX;
    let nextY = this.gridY;

    switch (dir) {
      case Direction.UP: nextY--; break;
      case Direction.DOWN: nextY++; break;
      case Direction.LEFT: nextX--; break;
      case Direction.RIGHT: nextX++; break;
    }

    return { x: nextX, y: nextY };
  }

  /**
   * Get the current grid position as a coordinate
   */
  getGridPosition(): ICoordinate {
    return { x: this.gridX, y: this.gridY };
  }

  /**
   * Get the current pixel position as a coordinate
   */
  getPixelPosition(): ICoordinate {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Calculate the target pixel position for a given grid coordinate
   */
  getTargetPixelPosition(gridCoord: ICoordinate): ICoordinate {
    return {
      x: this.mapOffsetX + gridCoord.x * this.tileSize + this.tileSize / 2,
      y: this.mapOffsetY + gridCoord.y * this.tileSize + this.tileSize / 2
    };
  }

  /**
   * Calculate distance between two grid positions (Manhattan distance)
   */
  getGridDistance(pos1: ICoordinate, pos2: ICoordinate): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Check if this entity collides with another entity
   * Collision occurs when the distance between entities is less than the threshold
   * @param other The other entity to check collision with
   * @param threshold The distance threshold for collision (in tiles)
   * @returns true if collision detected, false otherwise
   */
  checkCollision(other: Entity, threshold: number): boolean {
    const thisPos = this.getGridPosition();
    const otherPos = other.getGridPosition();
    const distance = this.getGridDistance(thisPos, otherPos);
    return distance < threshold;
  }

  getOppositeDirection(): Direction {
    switch (this.direction) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      case Direction.LEFT: return Direction.RIGHT;
      case Direction.RIGHT: return Direction.LEFT;
    }
  }

  /**
   * Get the string representation of a direction (for animation keys, etc.)
   * @param dir The direction to convert
   * @returns String representation ('up', 'down', 'left', 'right')
   */
  protected getDirectionString(dir: Direction): string {
    const dirMap: Record<Direction, string> = {
      [Direction.UP]: 'up',
      [Direction.DOWN]: 'down',
      [Direction.LEFT]: 'left',
      [Direction.RIGHT]: 'right'
    };
    return dirMap[dir];
  }

  /**
   * Synchronize animated sprite position with the main sprite
   * Useful for entities that maintain both a collision sprite and visual sprite
   */
  protected syncAnimatedSpritePosition(): void {
    if (this.animatedSprite) {
      this.animatedSprite.x = this.sprite.x;
      this.animatedSprite.y = this.sprite.y;
    }
  }

  /**
   * Destroy the animated sprite if it exists
   * Helper for cleanup methods
   */
  protected destroyAnimatedSprite(): void {
    if (this.animatedSprite && this.animatedSprite.scene) {
      this.animatedSprite.destroy();
    }
  }

  /**
   * Replace the default circle sprite with a custom sprite
   * Helper for entity constructors that want custom sprites
   * @param newSprite The new sprite to use
   */
  protected replaceWithCustomSprite(newSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc): void {
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
    }
    this.sprite = newSprite;
  }

  /**
   * Clean up entity resources (sprites, animations, etc.)
   * Override in subclasses to add specific cleanup logic
   */
  cleanup(): void {
    this.destroyAnimatedSprite();
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
    }
  }
}