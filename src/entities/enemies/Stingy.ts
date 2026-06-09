import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';
import { gameConfig } from '../../config/gameConfig';
import { Difficulty } from '../../enums/Difficulty';
import { LogGroup } from '../../enums/LogGroup';
import { Logger } from '../../utils/Logger';

/**
 * Stingy - The relentless veteran, calm, focused, and efficient.
 * Acts as the group's leader. Tracks Tubie-Man with precision.
 * Quirk: "Sterile Mode" - when few pellets remain, becomes fire-resistant and moves faster
 */
export class Stingy extends Enemy {
  private inSterileMode: boolean = false;
  private baseSpeed: number;
  public isFireResistant: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: Difficulty = Difficulty.MEDIUM) {
    super(scene, x, y, 'stingy', 1, speed, mapData, tileSize, mapOffsetX, mapOffsetY, difficulty); // Enemy number 1
    this.baseSpeed = speed;
    this.createSterilizationModeAnimation();
  }

  /**
   * Create sterilization mode animation
   */
  private createSterilizationModeAnimation(): void {
    const scene = this.scene;
    const animKey = 'sterialization_mode';

    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: 'atlas', frame: 'sterialization_mode_frame_1.png' },
          { key: 'atlas', frame: 'sterialization_mode_frame_2.png' }
        ],
        frameRate: 8,
        repeat: -1
      });
    }
  }

  /**
   * Check if Sterile Mode should be activated based on pellet count
   */
  private checkSterileMode(): void {
    // Don't activate sterile mode if injured or respawning
    if (this.isInjured || this.isRespawning) {
      // Deactivate if currently in sterile mode
      if (this.inSterileMode) {
        this.deactivateSterileMode();
      }
      return;
    }

    const gameScene = this.scene as GameScene;
    const pelletsRemaining = gameScene.levelManager.countRemainingPellets();
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

    // Update to sterilization mode animation
    this.updateAnimation();

    Logger.logStatic(LogGroup.QUIRK, `Sterile Mode activated! Speed: ${this.speed}, Fire Resistant: ${this.isFireResistant}`);
  }

  /**
   * Deactivate Sterile Mode - return to normal speed and lose fire resistance
   */
  private deactivateSterileMode(): void {
    this.inSterileMode = false;
    this.isFireResistant = false;
    this.speed = this.baseSpeed;

    // Return to normal animation
    this.updateAnimation();

    Logger.logStatic(LogGroup.QUIRK, `Sterile Mode deactivated. Returning to normal.`);
  }

  /**
   * Override to use sterilization mode sprite when active
   */
  protected updateAnimation(): void {
    if (!this.animatedSprite || !this.animatedSprite.anims) return;

    // Use sterilization mode sprite if active
    if (this.inSterileMode && !this.isInjured) {
      const animKey = 'sterialization_mode';
      if (animKey !== this.currentAnimKey) {
        this.currentAnimKey = animKey;
        if (this.scene.anims.exists(animKey)) {
          this.animatedSprite.play(animKey);
        }
      }
    } else {
      // Use parent class logic for normal/injured sprites
      super.updateAnimation();
    }
  }

  update(time: number, delta: number): void {
    // Check for Sterile Mode activation every frame
    this.checkSterileMode();
    super.update(time, delta);
  }

  updateTarget(): void {
    const player = (this.scene as GameScene).entityManager.player;

    // Precision tracking - directly target the player
    // Stingy is the most reliable and consistent chaser
    this.targetX = player.gridX;
    this.targetY = player.gridY;
  }
}
