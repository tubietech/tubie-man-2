import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';
import { gameConfig } from '../../config/gameConfig';

/**
 * Stingy - The relentless veteran, calm, focused, and efficient.
 * Acts as the group's leader. Tracks Tubie-Man with precision.
 * Quirk: "Sterile Mode" - when few pellets remain, becomes fire-resistant and moves faster
 */
export class Stingy extends Enemy {
  private inSterileMode: boolean = false;
  private baseSpeed: number;
  public isFireResistant: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    super(scene, x, y, 'stingy', speed, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty);
    this.baseSpeed = speed;
  }

  /**
   * Check if Sterile Mode should be activated based on pellet count
   */
  private checkSterileMode(): void {
    const gameScene = this.scene as GameScene;
    const pelletsRemaining = gameScene.countRemainingPellets();
    const threshold = gameConfig.enemy.quirks.stingy.sterileModeThreshold;

    if (pelletsRemaining <= threshold && !this.inSterileMode) {
      this.activateSterileMode();
    } else if (pelletsRemaining > threshold && this.inSterileMode) {
      this.deactivateSterileMode();
    }
  }

  /**
   * Activate Sterile Mode - increase speed and become fire-resistant
   */
  private activateSterileMode(): void {
    this.inSterileMode = true;
    this.isFireResistant = true;
    const speedMultiplier = gameConfig.enemy.quirks.stingy.sterileModeSpeedMultiplier[this.difficulty as keyof typeof gameConfig.enemy.quirks.stingy.sterileModeSpeedMultiplier];
    this.speed = this.baseSpeed * speedMultiplier;
    console.log(`[STINGY] Sterile Mode activated! Speed: ${this.speed}, Fire Resistant: ${this.isFireResistant}`);
  }

  /**
   * Deactivate Sterile Mode - return to normal speed and lose fire resistance
   */
  private deactivateSterileMode(): void {
    this.inSterileMode = false;
    this.isFireResistant = false;
    this.speed = this.baseSpeed;
    console.log(`[STINGY] Sterile Mode deactivated. Returning to normal.`);
  }

  update(time: number, delta: number): void {
    // Check for Sterile Mode activation every frame
    this.checkSterileMode();
    super.update(time, delta);
  }

  updateTarget(): void {
    const player = (this.scene as GameScene).player;

    // Precision tracking - directly target the player
    // Stingy is the most reliable and consistent chaser
    this.targetX = player.gridX;
    this.targetY = player.gridY;
  }
}
