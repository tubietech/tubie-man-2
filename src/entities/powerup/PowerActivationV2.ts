import Phaser from 'phaser';
import { IPowerActivationStrategy } from '../../interfaces/IPowerActivationStrategy';
import { Direction } from '../../enums/Direction';
import { MapValue } from '../../enums/MapValue';
import { ICoordinate } from '../../interfaces/ICoordinate';
import { IMapData } from '../../interfaces/IMapData';
import { Projectile } from '../Projectile';
import { gameConfig } from '../../config/gameConfig';

/**
 * V2 Power Activation Strategy
 * New implementation that fires 1 projectile per button press
 * with a duration window and fire rate limiting
 */
export class PowerActivationV2 implements IPowerActivationStrategy {
  private scene: Phaser.Scene;
  private mapData: IMapData;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private difficulty: string;

  private hasFirePower: boolean = false;
  private fireActive: boolean = false;
  private fireDuration: number = 0;
  private projectiles: Projectile[] = [];

  // V2 specific properties
  private lastFireTime: number = 0;
  private canFireAgain: boolean = true;

  constructor(
    scene: Phaser.Scene,
    mapData: IMapData,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    difficulty: string = 'medium'
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.difficulty = difficulty;
  }

  activate(playerPos: ICoordinate, direction: Direction): boolean {
    console.log(`[FIRE V2] activate called - hasFirePower: ${this.hasFirePower}, fireActive: ${this.fireActive}, canFireAgain: ${this.canFireAgain}`);

    // If fire is not active yet, check if we have fire power to activate it
    if (!this.fireActive) {
      // Need fire power to start the activation window
      if (!this.hasFirePower) {
        console.log(`[FIRE V2] Activation blocked - no fire power available`);
        return false;
      }

      console.log(`[FIRE V2] Activating fire powerup for ${gameConfig.player.powerup.v2.duration}ms`);
      this.fireActive = true;
      this.fireDuration = gameConfig.player.powerup.v2.duration;
      this.hasFirePower = false;
      this.canFireAgain = true;
      this.lastFireTime = 0;

      // Fire the first projectile
      return this.fireProjectile(playerPos, direction);
    }

    // Fire is already active - allow firing during the duration window
    // Check if we're in cooldown
    if (!this.canFireAgain) {
      const timeSinceLastFire = Date.now() - this.lastFireTime;
      const fireRateDelay = gameConfig.player.powerup.v2.fireRateDelay[this.difficulty as keyof typeof gameConfig.player.powerup.v2.fireRateDelay];
      console.log(`[FIRE V2] Firing blocked - cooldown (${timeSinceLastFire}ms / ${fireRateDelay}ms)`);
      return false;
    }

    // Fire another projectile during the duration window
    return this.fireProjectile(playerPos, direction);
  }

  private fireProjectile(playerPos: ICoordinate, direction: Direction): boolean {
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
      console.log(`[FIRE V2] Cannot fire - wall directly in front at (${checkX}, ${checkY})`);
      return false;
    }

    // Calculate starting position (one tile ahead)
    let startX = playerPos.x;
    let startY = playerPos.y;

    switch (direction) {
      case Direction.UP: startY--; break;
      case Direction.DOWN: startY++; break;
      case Direction.LEFT: startX--; break;
      case Direction.RIGHT: startX++; break;
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
      console.log(`[FIRE V2] Projectile created successfully at (${startX}, ${startY}), total projectiles: ${this.projectiles.length}`);

      // Set cooldown
      this.canFireAgain = false;
      this.lastFireTime = Date.now();

      return true;
    }

    console.log(`[FIRE V2] Projectile creation failed - blocked by wall`);
    return false;
  }

  update(delta: number): void {
    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);

      // Clean up inactive projectiles
      if (!projectile.active) {
        console.log(`[FIRE V2] Projectile ${i} became inactive, cleaning up`);
        this.projectiles.splice(i, 1);
      }
    }

    // Update fire duration timer
    if (this.fireActive) {
      this.fireDuration -= delta;
      if (this.fireDuration <= 0) {
        console.log(`[FIRE V2] Fire duration expired, deactivating`);
        this.deactivate();
        return;
      }

      // Check if we can fire again based on fire rate delay
      if (!this.canFireAgain) {
        const timeSinceLastFire = Date.now() - this.lastFireTime;
        const fireRateDelay = gameConfig.player.powerup.v2.fireRateDelay[this.difficulty as keyof typeof gameConfig.player.powerup.v2.fireRateDelay];
        if (timeSinceLastFire >= fireRateDelay) {
          console.log(`[FIRE V2] Fire cooldown complete, can fire again`);
          this.canFireAgain = true;
        }
      }
    }
  }

  deactivate(): void {
    this.fireActive = false;
    this.canFireAgain = true;
    this.lastFireTime = 0;

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

  private isWall(x: number, y: number): boolean {
    // Check if out of bounds
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return true;
    }

    const tile = this.mapData.map[y][x];
    return tile === MapValue.WALL || tile === MapValue.PEN_DOOR;
  }
}
