import Phaser from 'phaser';
import { Entity } from '../Entity';
import { Direction } from '../../enums/Direction';
import { gameConfig } from '../../config/gameConfig';
import { IMapData } from '../../interfaces/IMapData';
import { getRandomFloat } from '../../utils/utils';

export class Enemy extends Entity {
  type: string;
  pathfindTimer: number = 0;
  targetX: number;
  targetY: number;
  difficulty: string;
  quirkTimer: number = 0;
  nextQuirkTime: number = 0;
  isReleased: boolean = false;
  isInjured: boolean = false;
  injuredSpeed: number;
  normalSpeed: number;
  originalColor: number;
  respawnTimer: number = 0;
  isRespawning: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: string, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    const color = gameConfig.colors[type as keyof typeof gameConfig.colors] as number;
    super(scene, x, y, color, speed, mapData, tileSize, mapOffsetX, mapOffsetY);
    this.type = type;
    this.targetX = x;
    this.targetY = y;
    this.difficulty = difficulty;
    this.normalSpeed = speed;
    this.originalColor = color;

    // Calculate injured speed using the speed scaling utility
    const baseInjuredSpeed = gameConfig.enemy.injuredSpeed[this.difficulty as keyof typeof gameConfig.enemy.injuredSpeed];
    this.injuredSpeed = baseInjuredSpeed * (this.tileSize / gameConfig.map.tileSize);

    this.scheduleNextQuirk();
  }

  /**
   * Release the enemy from the pen to start chasing
   */
  release(): void {
    this.isReleased = true;
  }

  /**
   * Reset enemy to pen position and unreleased state
   */
  reset(penX: number, penY: number): void {
    this.moveTo(penX, penY);
    this.isReleased = false;
    this.isInjured = false;
    this.isRespawning = false;
    this.respawnTimer = 0;
    this.speed = this.normalSpeed;

    // Restore original color (Arc uses setFillStyle, not setTint)
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setFillStyle(this.originalColor);
    }
  }

  /**
   * Injure the enemy - changes color to gray and flees to pen
   */
  injure(): void {
    if (this.isInjured || this.isRespawning) return;

    this.isInjured = true;
    this.speed = this.injuredSpeed;

    // Change color to gray (Arc uses setFillStyle, not setTint)
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setFillStyle(0x808080);
    }

    console.log(`[ENEMY] ${this.type} injured! Fleeing to pen at speed ${this.speed}`);
  }

  /**
   * Start respawning process - waits in pen before returning to normal
   */
  startRespawn(): void {
    if (this.isRespawning) return;

    this.isInjured = false;
    this.isRespawning = true;
    this.isReleased = false;
    this.respawnTimer = 0;

    console.log(`[ENEMY] ${this.type} starting respawn in pen`);
  }

  /**
   * Complete respawn - return to normal state and leave pen
   */
  completeRespawn(): void {
    this.isRespawning = false;
    this.isReleased = true;
    this.speed = this.normalSpeed;

    // Restore original color (Arc uses setFillStyle, not setTint)
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setFillStyle(this.originalColor);
    }

    console.log(`[ENEMY] ${this.type} respawn complete, leaving pen`);
  }

  /**
   * Schedule the next quirk based on difficulty
   */
  protected scheduleNextQuirk(): void {
    const quirkConfig = gameConfig.enemy.quirks.triggerTime[this.difficulty as keyof typeof gameConfig.enemy.quirks.triggerTime];
    const min = quirkConfig.min;
    const max = quirkConfig.max;
    this.nextQuirkTime = getRandomFloat(min, max);
    this.quirkTimer = 0;
  }

  /**
   * Override this in subclasses to implement quirk behavior
   */
  protected triggerQuirk(): void {
    // Override in subclasses
  }
  
  update(time: number, delta: number): void {
    // Handle respawning state - pause in pen
    if (this.isRespawning) {
      this.respawnTimer += delta;
      if (this.respawnTimer >= gameConfig.enemy.respawnDelay) {
        this.completeRespawn();
      }
      return;
    }

    // Don't move or update if not released from pen yet
    if (!this.isReleased) {
      return;
    }

    const moveSpeed = this.speed * delta / 1000;

    // If injured, pathfind to pen
    if (this.isInjured) {
      this.targetX = this.mapData.penCenter.x;
      this.targetY = this.mapData.penCenter.y;

      // Check if reached pen
      if (this.gridX === this.mapData.penCenter.x && this.gridY === this.mapData.penCenter.y) {
        this.startRespawn();
        return;
      }
    } else {
      // Normal behavior - update quirk timer
      this.quirkTimer += delta;
      if (this.quirkTimer >= this.nextQuirkTime) {
        this.triggerQuirk();
        this.scheduleNextQuirk();
      }

      // Update target for normal pathfinding
      this.pathfindTimer += delta;
      if (this.pathfindTimer >= 500) {
        this.pathfindTimer = 0;
        this.updateTarget();
      }
    }

    this.moveTowardsTarget(moveSpeed);
  }
  
  updateTarget(): void {
    // Override in subclasses
  }
  
  moveTowardsTarget(speed: number): void {
    const targetX = this.mapOffsetX + this.gridX * this.tileSize + this.tileSize / 2;
    const targetY = this.mapOffsetY + this.gridY * this.tileSize + this.tileSize / 2;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const nextDir = this.chooseDirection();
      const next = this.getNextPosition(nextDir);

      if (this.canMove(next.x, next.y)) {
        this.direction = nextDir;
        this.gridX = next.x;
        this.gridY = next.y;
      }
    }

    const newTargetX = this.mapOffsetX + this.gridX * this.tileSize + this.tileSize / 2;
    const newTargetY = this.mapOffsetY + this.gridY * this.tileSize + this.tileSize / 2;

    const moveX = newTargetX - this.sprite.x;
    const moveY = newTargetY - this.sprite.y;
    const dist = Math.sqrt(moveX * moveX + moveY * moveY);

    if (dist > 0) {
      const actualSpeed = Math.min(speed, dist);
      this.sprite.x += (moveX / dist) * actualSpeed;
      this.sprite.y += (moveY / dist) * actualSpeed;
    }
  }
  
  chooseDirection(): Direction {
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const validDirs: Direction[] = [];
    
    for (const dir of directions) {
      const next = this.getNextPosition(dir);
      if (this.canMove(next.x, next.y) && dir !== this.getOppositeDirection()) {
        validDirs.push(dir);
      }
    }
    
    if (validDirs.length === 0) return this.direction;
    
    let bestDir = validDirs[0];
    let bestDist = Infinity;
    
    for (const dir of validDirs) {
      const next = this.getNextPosition(dir);
      const dist = Math.abs(next.x - this.targetX) + Math.abs(next.y - this.targetY);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
    
    return bestDir;
  }
}