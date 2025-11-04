import Phaser from 'phaser';
import { IProjectile } from '../interfaces/IProjectile';
import { ICoordinate } from '../interfaces/ICoordinate';
import { IMapData } from '../interfaces/IMapData';
import { Direction } from '../enums/Direction';
import { MapValue } from '../enums/MapValue';
import { gameConfig } from '../config/gameConfig';

export class Projectile implements IProjectile {
  sprite!: Phaser.GameObjects.Sprite;
  gridPosition: ICoordinate;
  direction: Direction;
  active: boolean;

  private mapData: IMapData;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private speed: number;
  private distanceTraveled: number;
  private maxDistance: number;

  constructor(
    scene: Phaser.Scene,
    startPos: ICoordinate,
    direction: Direction,
    mapData: IMapData,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    speed: number
  ) {
    this.direction = direction;
    this.mapData = mapData;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.speed = speed;
    this.active = true;
    this.distanceTraveled = 0;
    this.maxDistance = gameConfig.player.powerup.projectile.maxDistance * tileSize;

    // Use the starting position directly (Player already calculated one tile ahead)
    const startX = startPos.x;
    const startY = startPos.y;

    this.gridPosition = { x: startX, y: startY };

    // Check if starting position is a wall - if so, destroy immediately
    if (this.hasHitWall()) {
      console.log(`[PROJECTILE] Cannot spawn at grid (${startX}, ${startY}) - wall collision`);
      this.active = false;
      return;
    }

    // Create the sprite at the starting position (one tile ahead)
    const pixelX = mapOffsetX + startX * tileSize + tileSize / 2;
    const pixelY = mapOffsetY + startY * tileSize + tileSize / 2;

    console.log(`[PROJECTILE] Creating projectile at grid (${startX}, ${startY}), pixel (${pixelX}, ${pixelY})`);
    console.log(`[PROJECTILE] Direction: ${Direction[direction]}, Speed: ${speed}, MaxDistance: ${this.maxDistance}`);

    // Create the animated sprite
    this.sprite = scene.add.sprite(pixelX, pixelY, 'atlas', 'player_projectile_frame_1.png');

    // Scale the sprite to be 1.5x the size of a tile (doubled from 0.75)
    const targetSize = tileSize * 1.5;
    const spriteScale = targetSize / this.sprite.width;
    this.sprite.setScale(spriteScale);

    // Rotate sprite based on direction (default sprite faces right)
    switch (direction) {
      case Direction.LEFT:
        // Flip horizontally 180 degrees
        this.sprite.setFlipX(true);
        break;
      case Direction.UP:
        // Rotate counter-clockwise 90 degrees
        this.sprite.setAngle(-90);
        break;
      case Direction.DOWN:
        // Rotate clockwise 90 degrees
        this.sprite.setAngle(90);
        break;
      case Direction.RIGHT:
        // No rotation needed, sprite already faces right
        break;
    }

    // Play the projectile animation
    this.sprite.play('projectile_anim');

    console.log(`[PROJECTILE] Sprite created with scale: ${spriteScale}, direction: ${Direction[direction]}`);
    console.log(`[PROJECTILE] Sprite position: (${this.sprite.x}, ${this.sprite.y})`);
    console.log(`[PROJECTILE] Sprite visible: ${this.sprite.visible}, active: ${this.sprite.active}`);
  }

  update(delta: number): void {
    if (!this.active) return;

    // Calculate movement for this frame
    const moveDistance = this.speed * (delta / 1000);

    // Get direction vector
    const dirVector = this.getDirectionVector();

    // Move the sprite
    const oldX = this.sprite.x;
    const oldY = this.sprite.y;
    this.sprite.x += dirVector.x * moveDistance;
    this.sprite.y += dirVector.y * moveDistance;

    console.log(`[PROJECTILE] Moving from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}), distance: ${moveDistance.toFixed(2)}`);

    // Update distance traveled
    this.distanceTraveled += moveDistance;

    // Update grid position based on pixel position
    const newGridX = Math.floor((this.sprite.x - this.mapOffsetX) / this.tileSize);
    const newGridY = Math.floor((this.sprite.y - this.mapOffsetY) / this.tileSize);

    // Check if grid position changed
    if (newGridX !== this.gridPosition.x || newGridY !== this.gridPosition.y) {
      console.log(`[PROJECTILE] Grid changed from (${this.gridPosition.x}, ${this.gridPosition.y}) to (${newGridX}, ${newGridY})`);
      this.gridPosition = { x: newGridX, y: newGridY };

      // Check for tunnel teleportation
      this.checkTunnelTeleport();

      // Check for wall collision
      if (this.hasHitWall()) {
        console.log(`[PROJECTILE] Hit wall at grid (${newGridX}, ${newGridY}), destroying`);
        this.destroy();
        return;
      }
    }

    // Check if max distance reached
    if (this.distanceTraveled >= this.maxDistance) {
      console.log(`[PROJECTILE] Max distance reached (${this.distanceTraveled.toFixed(2)} >= ${this.maxDistance}), destroying`);
      this.destroy();
    }
  }

  private getDirectionVector(): ICoordinate {
    switch (this.direction) {
      case Direction.UP:
        return { x: 0, y: -1 };
      case Direction.DOWN:
        return { x: 0, y: 1 };
      case Direction.LEFT:
        return { x: -1, y: 0 };
      case Direction.RIGHT:
        return { x: 1, y: 0 };
    }
  }

  private checkTunnelTeleport(): void {
    // Check if projectile is on a tunnel entrance
    for (const tunnel of this.mapData.tunnels) {
      if (this.gridPosition.x === tunnel.location.x && this.gridPosition.y === tunnel.location.y) {
        // Teleport to tunnel exit
        console.log(`[PROJECTILE] Entering tunnel at (${tunnel.location.x}, ${tunnel.location.y}), teleporting to (${tunnel.target.x}, ${tunnel.target.y})`);

        this.gridPosition = { x: tunnel.target.x, y: tunnel.target.y };

        // Update sprite position to match new grid position
        this.sprite.x = this.mapOffsetX + tunnel.target.x * this.tileSize + this.tileSize / 2;
        this.sprite.y = this.mapOffsetY + tunnel.target.y * this.tileSize + this.tileSize / 2;

        console.log(`[PROJECTILE] Teleported to (${this.sprite.x}, ${this.sprite.y})`);
        break; // Only teleport once per frame
      }
    }
  }

  private hasHitWall(): boolean {
    const { x, y } = this.gridPosition;

    // Check if out of bounds
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return true;
    }

    const tile = this.mapData.map[y][x];

    // Projectile hits walls and pen doors, but can pass through tunnels
    return tile === MapValue.WALL || tile === MapValue.PEN_DOOR;
  }

  destroy(): void {
    if (!this.active) {
      return; // Already destroyed
    }

    console.log(`[PROJECTILE] Destroying projectile at grid (${this.gridPosition.x}, ${this.gridPosition.y})`);
    this.active = false;

    if (this.sprite && this.sprite.scene) {
      try {
        this.sprite.destroy();
      } catch (error) {
        console.warn('[PROJECTILE] Error destroying sprite:', error);
      }
    }
  }

  getGridPosition(): ICoordinate {
    return { x: this.gridPosition.x, y: this.gridPosition.y };
  }
}
