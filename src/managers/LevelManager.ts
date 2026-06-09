import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { IMapData } from '../interfaces/IMapData';
import { Drawable } from '../interfaces/IPelletData';
import { gameConfig } from '../config/gameConfig';
import { canEatPellet } from '../utils/utils';

/**
 * Result of checking pellet collection
 */
export interface IPelletCollectionResult {
  collected: boolean;
  isPowerup: boolean;
  score: number;
}

/**
 * Callbacks for level events that need to be handled by the scene
 */
export interface ILevelCallbacks {
  onPelletCollected: (isPowerup: boolean, score: number) => void;
  onWinCondition: () => void;
}

/**
 * Manages level-related state including pellets, tunnels, and win conditions.
 * Extracts level logic from GameScene.
 */
export class LevelManager {
  private mapData: IMapData;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private tileSize: number;
  private callbacks: ILevelCallbacks;

  // Pellet state
  pellets: Drawable[][] = [];
  powerups: Phaser.GameObjects.Sprite[] = [];

  // Tunnel state
  tunnelCooldown: number = 0;

  constructor(
    mapData: IMapData,
    mapOffsetX: number,
    mapOffsetY: number,
    tileSize: number,
    callbacks: ILevelCallbacks
  ) {
    this.mapData = mapData;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.tileSize = tileSize;
    this.callbacks = callbacks;
  }

  /**
   * Set pellets and powerups arrays (created by MapRenderer)
   */
  setPellets(pellets: Drawable[][], powerups: Phaser.GameObjects.Sprite[]): void {
    this.pellets = pellets;
    this.powerups = powerups;
  }

  /**
   * Update tunnel cooldown
   */
  updateTunnelCooldown(delta: number): void {
    if (this.tunnelCooldown > 0)
      this.tunnelCooldown -= delta;
  }

  /**
   * Check and handle tunnel teleportation for player and enemies
   */
  checkTunnels(player: Player, enemies: Enemy[]): void {
    // Check player tunnels (only if cooldown expired)
    if (this.tunnelCooldown <= 0) {
      for (const tunnel of this.mapData.tunnels) {
        if (player.gridX === tunnel.location.x && player.gridY === tunnel.location.y) {
          player.moveTo(tunnel.target.x, tunnel.target.y);
          this.tunnelCooldown = gameConfig.map.tunnelCooldown;
          break; // Only teleport once per frame
        }
      }
    }

    // Check enemy tunnels
    for (const enemy of enemies) {
      for (const tunnel of this.mapData.tunnels) {
        if (enemy.gridX === tunnel.location.x && enemy.gridY === tunnel.location.y) {
          enemy.moveTo(tunnel.target.x, tunnel.target.y);
          break; // Only teleport once per frame per enemy
        }
      }
    }
  }

  /**
   * Check if player can collect a pellet at their current position
   * Returns collection result with score info
   */
  checkPelletCollection(player: Player): IPelletCollectionResult | null {
    const px = player.gridX;
    const py = player.gridY;

    // Check if there's a pellet on the current tile
    if (!this.pellets[py] || !this.pellets[py][px])
      return null;

    const pellet = this.pellets[py][px];

    // Calculate pellet center and player position
    const pelletCenter = {
      x: this.mapOffsetX + px * this.tileSize + this.tileSize / 2,
      y: this.mapOffsetY + py * this.tileSize + this.tileSize / 2
    };
    const playerPos = {
      x: player.sprite.x,
      y: player.sprite.y
    };

    // Check if player can eat the pellet
    if (!canEatPellet(pelletCenter, playerPos, this.tileSize))
      return null;

    const isPower = pellet instanceof Phaser.GameObjects.Sprite && this.powerups.includes(pellet);
    const score = isPower ? gameConfig.map.powerup.score : gameConfig.map.pellet.score;

    // Destroy the pellet
    pellet.destroy();
    this.pellets[py][px] = null as any;

    // Notify callback
    this.callbacks.onPelletCollected(isPower, score);

    return {
      collected: true,
      isPowerup: isPower,
      score
    };
  }

  /**
   * Count remaining pellets on the map
   */
  countRemainingPellets(): number {
    let count = 0;
    for (let y = 0; y < this.pellets.length; y++) {
      for (let x = 0; x < this.pellets[y].length; x++) {
        if (this.pellets[y][x] && this.pellets[y][x].visible)
          count++;
      }
    }
    return count;
  }

  /**
   * Check if the level is complete (all pellets collected)
   */
  checkWinCondition(): boolean {
    if (this.countRemainingPellets() === 0) {
      this.callbacks.onWinCondition();
      return true;
    }
    return false;
  }

  /**
   * Clean up pellets and powerups
   */
  cleanup(): void {
    if (this.pellets) {
      for (let y = 0; y < this.pellets.length; y++) {
        for (let x = 0; x < this.pellets[y].length; x++) {
          if (this.pellets[y][x])
            this.pellets[y][x].destroy();
        }
      }
      this.pellets = [];
    }

    if (this.powerups) {
      this.powerups.forEach(powerup => {
        if (powerup)
          powerup.destroy();
      });
      this.powerups = [];
    }
  }
}
