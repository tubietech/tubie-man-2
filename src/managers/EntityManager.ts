import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Pokey } from '../entities/enemies/Pokey';
import { Pricky } from '../entities/enemies/Pricky';
import { Stingy } from '../entities/enemies/Stingy';
import { Doc } from '../entities/enemies/Doc';
import { Bonus } from '../entities/Bonus';
import { BonusSelector } from '../utils/BonusSelector';
import { IMapData } from '../interfaces/IMapData';
import { IBonusData } from '../interfaces/IBonusData';
import { Difficulty } from '../enums/Difficulty';
import { gameConfig } from '../config/gameConfig';
import { calculateScaledSpeed, calculateBonusAppearances } from '../utils/utils';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Callbacks for entity events that need to be handled by the scene
 */
export interface IEntityCallbacks {
  onEnemyReachedPen: (enemy: Enemy) => void;
}

/**
 * Manages player, enemies, and bonus entity lifecycle.
 * Extracts entity creation, spawning, and release logic from GameScene.
 */
export class EntityManager {
  private scene: Phaser.Scene;
  private mapData: IMapData;
  private difficulty: Difficulty;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private callbacks: IEntityCallbacks;

  // Entities
  player!: Player;
  enemies: Enemy[] = [];
  bonus: Bonus | null = null;

  // Bonus state
  private bonusData!: IBonusData;
  private bonusAppearances: number[] = [];
  private currentBonusAppearance: number = 0;

  // Enemy release state
  private enemiesReleased: number = 0;
  private releaseTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    mapData: IMapData,
    difficulty: Difficulty,
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
    callbacks: IEntityCallbacks
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.difficulty = difficulty;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.callbacks = callbacks;
  }

  /**
   * Create the player entity
   */
  createPlayer(): Player {
    const playerSpeed = calculateScaledSpeed(gameConfig.player.speed, this.difficulty, this.tileSize);
    const startX = this.mapData.playerStart.x;
    const startY = this.mapData.playerStart.y;

    this.player = new Player(
      this.scene,
      startX,
      startY,
      gameConfig.colors.player,
      playerSpeed,
      this.mapData,
      this.tileSize,
      this.mapOffsetX,
      this.mapOffsetY,
      this.difficulty
    );

    return this.player;
  }

  /**
   * Create all enemy entities based on the current level
   */
  createEnemies(level: number): Enemy[] {
    // Clear the enemies array to prevent duplicates on scene restart
    this.enemies = [];

    const enemySpeed = calculateScaledSpeed(gameConfig.enemy.speed, this.difficulty, this.tileSize);
    const penCenterX = this.mapData.penCenter.x;
    const penCenterY = this.mapData.penCenter.y;
    const doorX = this.mapData.penDoor.x;
    const doorY = this.mapData.penDoor.y;

    // Determine number of enemies based on level from config
    const countConfig = gameConfig.enemy.countPerLevel;
    const enemyCount = countConfig[level as keyof typeof countConfig] ||
      Object.values(countConfig)[Object.entries(countConfig).length - 1];

    // Always include Stingy - starts outside the pen, in front of the door
    const stingy = new Stingy(
      this.scene,
      doorX,
      doorY - 1,
      enemySpeed,
      this.mapData,
      this.tileSize,
      this.mapOffsetX,
      this.mapOffsetY,
      this.difficulty
    );
    stingy.setExitPath([]);
    this.enemies.push(stingy);

    // Position other enemies inside the pen based on count
    if (enemyCount === 3) {
      // 3 enemies: Stingy (already placed), Pokey, Pricky
      const pokey = new Pokey(
        this.scene,
        penCenterX - 1,
        penCenterY,
        enemySpeed,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      pokey.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pokey);

      const pricky = new Pricky(
        this.scene,
        penCenterX + 1,
        penCenterY,
        enemySpeed,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      pricky.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pricky);
    } else if (enemyCount >= 4) {
      // 4 enemies: Stingy (already placed), Pokey, Pricky, Doc
      const pokey = new Pokey(
        this.scene,
        penCenterX - 1,
        penCenterY,
        enemySpeed,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      pokey.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pokey);

      const pricky = new Pricky(
        this.scene,
        penCenterX,
        penCenterY,
        enemySpeed,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      pricky.setExitPath([
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pricky);

      const doc = new Doc(
        this.scene,
        penCenterX + 1,
        penCenterY,
        enemySpeed,
        this.mapData,
        this.tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      doc.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(doc);
    }

    // Attach respawn callback to all enemies
    this.enemies.forEach(enemy => {
      enemy.onReachedPen = (reachedEnemy) => this.callbacks.onEnemyReachedPen(reachedEnemy);
    });

    // Initialize enemy release counter
    this.enemiesReleased = 0;

    return this.enemies;
  }

  /**
   * Initialize bonus data for the current level
   */
  initializeBonus(level: number): void {
    const bonusLogger = new Logger(LogGroup.BONUS);

    const bonusSelection = BonusSelector.selectBonus(level);

    this.bonusData = {
      sprite: bonusSelection.sprite,
      score: bonusSelection.score,
      entryTunnel: 0,
      path: this.mapData.bonusPath
    };

    this.bonusAppearances = calculateBonusAppearances();
    this.currentBonusAppearance = 0;

    bonusLogger.log(`Initialized for level ${level}: ${bonusSelection.sprite}, score: ${bonusSelection.score}`);
    bonusLogger.log(`Will appear at ${this.bonusAppearances[0]} and ${this.bonusAppearances[1]} pellets eaten`);
  }

  /**
   * Check if bonus should spawn based on pellets eaten
   */
  checkBonusSpawn(pelletsEaten: number): boolean {
    if (this.currentBonusAppearance < this.bonusAppearances.length &&
        pelletsEaten >= this.bonusAppearances[this.currentBonusAppearance]) {
      this.spawnBonus();
      this.currentBonusAppearance++;
      return true;
    }
    return false;
  }

  /**
   * Spawn the bonus entity
   */
  spawnBonus(): void {
    // Don't spawn if bonus is already active
    if (this.bonus && this.bonus.isActive())
      return;

    const bonusSpeed = calculateScaledSpeed(gameConfig.map.bonus.speed, this.difficulty, this.tileSize);
    this.bonus = new Bonus(this.scene, this.bonusData, this.tileSize, this.mapOffsetX, this.mapOffsetY, this.mapData, bonusSpeed);

    Logger.logStatic(LogGroup.BONUS, `Spawned bonus #${this.currentBonusAppearance + 1}`);
  }

  /**
   * Schedule the release of the next enemy from the pen
   */
  scheduleNextEnemyRelease(): void {
    const enemyLogger = new Logger(LogGroup.ENEMY);

    if (this.enemiesReleased < this.enemies.length) {
      if (this.enemiesReleased === 0) {
        // Release first enemy immediately
        this.enemies[0].release();
        this.enemiesReleased++;
        enemyLogger.log(`Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
        this.scheduleNextEnemyRelease();
      } else {
        // Schedule next enemy release after delay
        const releaseDelay = gameConfig.enemy.releaseDelay[this.difficulty as keyof typeof gameConfig.enemy.releaseDelay];
        this.releaseTimer = this.scene.time.delayedCall(releaseDelay, () => {
          this.releaseTimer = null;
          if (this.enemiesReleased < this.enemies.length) {
            this.enemies[this.enemiesReleased].release();
            this.enemiesReleased++;
            enemyLogger.log(`Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
            this.scheduleNextEnemyRelease();
          }
        });
      }
    }
  }

  /**
   * Cancel any pending enemy release timer
   */
  cancelPendingRelease(): void {
    if (this.releaseTimer) {
      this.releaseTimer.destroy();
      this.releaseTimer = null;
    }
  }

  /**
   * Reset enemy release counter and restart staggered release
   */
  restartEnemyRelease(): void {
    this.cancelPendingRelease();
    this.enemiesReleased = 0;
    this.scheduleNextEnemyRelease();
  }

  /**
   * Update all entities
   */
  updateAll(time: number, delta: number, enemyAIEnabled: boolean): void {
    this.player.update(time, delta);

    if (enemyAIEnabled)
      this.enemies.forEach(enemy => enemy.update(time, delta));

    if (this.bonus && this.bonus.isActive())
      this.bonus.update(delta);
  }

  /**
   * Reset player to starting position
   */
  resetPlayer(): void {
    this.player.reset(this.mapData.playerStart.x, this.mapData.playerStart.y);
  }

  /**
   * Pause and hide all enemies, reset them to starting positions
   */
  pauseAndHideEnemies(): void {
    this.cancelPendingRelease();
    this.enemies.forEach(enemy => {
      enemy.resetToStart();
      enemy.pause();
      enemy.hide();
    });
  }

  /**
   * Show all enemies
   */
  showEnemies(): void {
    this.enemies.forEach(enemy => {
      enemy.resume();
      enemy.show();
    });
  }

  /**
   * Remove bonus if active
   */
  removeBonus(): void {
    if (this.bonus && this.bonus.isActive()) {
      this.bonus.cleanup();
      Logger.logStatic(LogGroup.BONUS, 'Removed due to player death');
    }
  }

  /**
   * Clean up all entities
   */
  cleanup(): void {
    this.cancelPendingRelease();

    if (this.player)
      this.player.cleanup();

    if (this.enemies) {
      this.enemies.forEach(enemy => enemy.cleanup());
    }

    if (this.bonus) {
      this.bonus.cleanup();
      this.bonus = null;
    }
  }

  /**
   * Get the current bonus appearance index
   */
  getCurrentBonusAppearance(): number {
    return this.currentBonusAppearance;
  }
}
