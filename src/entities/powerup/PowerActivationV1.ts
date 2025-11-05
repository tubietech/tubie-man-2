import Phaser from 'phaser';
import { IPowerActivationStrategy } from '../../interfaces/IPowerActivationStrategy';
import { Direction } from '../../enums/Direction';
import { MapValue } from '../../enums/MapValue';
import { ICoordinate } from '../../interfaces/ICoordinate';
import { IMapData } from '../../interfaces/IMapData';
import { Projectile } from '../Projectile';
import { gameConfig } from '../../config/gameConfig';

/**
 * V1 Power Activation Strategy
 * Original implementation that fires 3 projectiles in a burst
 */
export class PowerActivationV1 implements IPowerActivationStrategy {
  private scene: Phaser.Scene;
  private mapData: IMapData;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;

  private hasFirePower: boolean = false;
  private fireActive: boolean = false;
  private fireDuration: number = 0;
  private projectiles: Projectile[] = [];

  constructor(
    scene: Phaser.Scene,
    mapData: IMapData,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    _difficulty: string = 'medium'
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
  }

  activate(playerPos: ICoordinate, direction: Direction): boolean {
    console.log(`[FIRE V1] activate called - hasFirePower: ${this.hasFirePower}, fireActive: ${this.fireActive}`);

    if (!this.hasFirePower || this.fireActive) {
      console.log(`[FIRE V1] Activation blocked - hasFirePower: ${this.hasFirePower}, fireActive: ${this.fireActive}`);
      return false;
    }

    // Check if there's a wall directly in front of the player
    let checkX = playerPos.x;
    let checkY = playerPos.y;

    switch (direction) {
      case Direction.UP: checkY--; break;
      case Direction.DOWN: checkY++; break;
      case Direction.LEFT: checkX--; break;
      case Direction.RIGHT: checkX++; break;
    }

    // Check if the tile in front is a wall
    if (this.isWall(checkX, checkY)) {
      console.log(`[FIRE V1] Cannot fire - wall directly in front at (${checkX}, ${checkY})`);
      return false;
    }

    this.fireActive = true;
    this.fireDuration = gameConfig.player.powerup.v1.duration;
    this.hasFirePower = false;

    // Create multiple projectiles in a row based on config
    const projectileCount = gameConfig.player.powerup.v1.projectileCount;
    console.log(`[FIRE V1] Creating ${projectileCount} projectile(s) from player position (${playerPos.x}, ${playerPos.y}), facing ${Direction[direction]}`);

    for (let i = 1; i <= projectileCount; i++) {
      // Calculate starting position for this projectile (one tile ahead + i-1 additional tiles)
      let startX = playerPos.x;
      let startY = playerPos.y;

      // Offset by i tiles in the firing direction
      switch (direction) {
        case Direction.UP: startY -= i; break;
        case Direction.DOWN: startY += i; break;
        case Direction.LEFT: startX -= i; break;
        case Direction.RIGHT: startX += i; break;
      }

      const startPos: ICoordinate = { x: startX, y: startY };

      const projectile = new Projectile(
        this.scene,
        startPos,
        direction,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        gameConfig.player.powerup.projectile.speed
      );

      // Only add projectile if it was successfully created (not blocked by wall)
      if (projectile.active) {
        this.projectiles.push(projectile);
      }
    }

    console.log(`[FIRE V1] ${this.projectiles.length} projectile(s) created successfully`);
    return true;
  }

  update(delta: number): void {
    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);

      // Clean up inactive projectiles
      if (!projectile.active) {
        console.log(`[FIRE V1] Projectile ${i} became inactive, cleaning up`);
        this.projectiles.splice(i, 1);
      }
    }

    // Update fire duration timer
    if (this.fireActive) {
      this.fireDuration -= delta;
      if (this.fireDuration <= 0) {
        console.log(`[FIRE V1] Fire duration expired, deactivating`);
        this.deactivate();
      }
    }
  }

  deactivate(): void {
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

  isActive(): boolean {
    return this.fireActive;
  }

  hasPower(): boolean {
    return this.hasFirePower;
  }

  setPower(hasPower: boolean): void {
    this.hasFirePower = hasPower;
  }

  getFirePositions(): ICoordinate[] {
    return this.projectiles
      .filter(p => p.active)
      .map(p => p.getGridPosition());
  }

  getProjectiles(): Projectile[] {
    return this.projectiles.filter(p => p.active);
  }

  getRemainingDuration(): number {
    return this.fireActive ? this.fireDuration : 0;
  }

  getFireCooldown(): number {
    // V1 fires all projectiles at once, so no cooldown between fires
    return 0;
  }

  private isWall(x: number, y: number): boolean {
    // Check if out of bounds
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return true;
    }

    const tile = this.mapData.map[y][x];
    return tile === MapValue.WALL || tile === MapValue.PEN_DOOR;
  }
}
