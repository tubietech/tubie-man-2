import Phaser from 'phaser';
import { Entity } from '../Entity';
import { Direction } from '../../enums/Direction';
import { MapValue } from '../../enums/MapValue';
import { gameConfig } from '../../config/gameConfig';
import { IMapData } from '../../interfaces/IMapData';
import { getRandomFloat } from '../../utils/utils';

export class Enemy extends Entity {
  type: string;
  enemyNumber: number; // 1=Stingy, 2=Pokey, 3=Pricky, 4=Doc
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
  exitPath: { x: number; y: number }[] = [];
  exitPathIndex: number = 0;
  isFollowingExitPath: boolean = false;
  animatedSprite: Phaser.GameObjects.Sprite | null = null;
  currentAnimKey: string = '';
  isPaused: boolean = false;
  startX: number;
  startY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: string, enemyNumber: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number, difficulty: string = 'medium') {
    const color = gameConfig.colors[type as keyof typeof gameConfig.colors] as number;
    super(scene, x, y, color, speed, mapData, tileSize, mapOffsetX, mapOffsetY);
    this.type = type;
    this.enemyNumber = enemyNumber;
    this.targetX = x;
    this.targetY = y;
    this.difficulty = difficulty;
    this.normalSpeed = speed;
    this.originalColor = color;

    // Store starting position
    this.startX = x;
    this.startY = y;

    // Calculate injured speed using the speed scaling utility
    const baseInjuredSpeed = gameConfig.enemy.injuredSpeed[this.difficulty as keyof typeof gameConfig.enemy.injuredSpeed];
    this.injuredSpeed = baseInjuredSpeed * (this.tileSize / gameConfig.map.tileSize);

    // Create animations and sprite
    this.createAnimations();
    this.createAnimatedSprite(x, y);

    this.scheduleNextQuirk();
  }

  /**
   * Create all animations for this enemy
   */
  private createAnimations(): void {
    const scene = this.scene;

    // Create normal movement animations for each direction
    const directions = ['up', 'left', 'down', 'right'];
    directions.forEach(dir => {
      const animKey = `enemy${this.enemyNumber}_${dir}`;

      // Only create if it doesn't exist
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [
            { key: 'atlas', frame: `enemy${this.enemyNumber}_${dir}_frame_1.png` },
            { key: 'atlas', frame: `enemy${this.enemyNumber}_${dir}_frame_2.png` }
          ],
          frameRate: 8,
          repeat: -1
        });
      }
    });

    // Create injured animations for each direction
    directions.forEach(dir => {
      const animKey = `enemy_injured_${dir}`;

      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [{ key: 'atlas', frame: `enemy_injured_${dir}.png` }],
          frameRate: 1,
          repeat: -1
        });
      }
    });
  }

  /**
   * Create the animated sprite for this enemy
   */
  private createAnimatedSprite(x: number, y: number): void {
    const pixelX = this.mapOffsetX + x * this.tileSize + this.tileSize / 2;
    const pixelY = this.mapOffsetY + y * this.tileSize + this.tileSize / 2;

    // Create sprite
    this.animatedSprite = this.scene.add.sprite(pixelX, pixelY, 'atlas');

    // Scale sprite using config value
    const spriteScale = (this.tileSize * gameConfig.enemy.spriteScale) / this.animatedSprite.width;
    this.animatedSprite.setScale(spriteScale);

    // Hide the circle sprite from Entity base class
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setVisible(false);
    }

    // Start with right-facing animation
    this.updateAnimation();
  }

  /**
   * Update the animation based on current state (direction, injured)
   */
  protected updateAnimation(): void {
    if (!this.animatedSprite || !this.animatedSprite.anims) return;

    let animKey = '';

    if (this.isInjured) {
      // Use injured sprite based on direction
      const dirMap = {
        [Direction.UP]: 'up',
        [Direction.DOWN]: 'down',
        [Direction.LEFT]: 'left',
        [Direction.RIGHT]: 'right'
      };
      const dirStr = dirMap[this.direction];
      animKey = `enemy_injured_${dirStr}`;
    } else {
      // Use normal sprite based on direction
      const dirMap = {
        [Direction.UP]: 'up',
        [Direction.DOWN]: 'down',
        [Direction.LEFT]: 'left',
        [Direction.RIGHT]: 'right'
      };
      const dirStr = dirMap[this.direction];
      animKey = `enemy${this.enemyNumber}_${dirStr}`;
    }

    // Only change animation if it's different from current
    if (animKey !== this.currentAnimKey) {
      this.currentAnimKey = animKey;
      if (this.scene.anims.exists(animKey)) {
        this.animatedSprite.play(animKey);
      }
    }
  }

  /**
   * Set the exit path for the enemy to follow when leaving the pen
   */
  setExitPath(path: { x: number; y: number }[]): void {
    this.exitPath = path;
    this.exitPathIndex = 0;
    this.isFollowingExitPath = path.length > 0;
  }

  /**
   * Release the enemy from the pen to start chasing
   */
  release(): void {
    this.isReleased = true;
    // If there's an exit path, start following it
    if (this.exitPath.length > 0) {
      this.isFollowingExitPath = true;
      this.exitPathIndex = 0;
    }
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

    // Update animation to normal
    this.updateAnimation();

    // Restore original color (Arc uses setFillStyle, not setTint)
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setFillStyle(this.originalColor);
    }
  }

  /**
   * Override moveTo to also update animated sprite position
   */
  moveTo(x: number, y: number): void {
    super.moveTo(x, y);

    // Update animated sprite position to match
    if (this.animatedSprite) {
      const pixelX = this.mapOffsetX + x * this.tileSize + this.tileSize / 2;
      const pixelY = this.mapOffsetY + y * this.tileSize + this.tileSize / 2;
      this.animatedSprite.setPosition(pixelX, pixelY);
    }
  }

  /**
   * Reset enemy to starting position
   */
  resetToStart(): void {
    this.moveTo(this.startX, this.startY);
    this.isReleased = false;
    this.isInjured = false;
    this.isRespawning = false;
    this.respawnTimer = 0;
    this.speed = this.normalSpeed;
    this.isPaused = false;
    this.isFollowingExitPath = false;
    this.exitPathIndex = 0;

    // Update animation to normal
    this.updateAnimation();

    // Restore original color
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setFillStyle(this.originalColor);
    }
  }

  /**
   * Pause enemy movement (during player death)
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume enemy movement
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Hide enemy sprites
   */
  hide(): void {
    if (this.animatedSprite) {
      this.animatedSprite.setVisible(false);
    }
    if (this.sprite) {
      this.sprite.setVisible(false);
    }
  }

  /**
   * Show enemy sprites
   */
  show(): void {
    if (this.animatedSprite) {
      this.animatedSprite.setVisible(true);
    }
    // Keep circle sprite hidden since we're using animated sprite
    if (this.sprite instanceof Phaser.GameObjects.Arc) {
      this.sprite.setVisible(false);
    }
  }

  /**
   * Injure the enemy - changes sprite to injured and flees to pen
   */
  injure(): void {
    if (this.isInjured || this.isRespawning) return;

    this.isInjured = true;
    this.speed = this.injuredSpeed;

    // Update to injured animation
    this.updateAnimation();

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
  
  update(_time: number, delta: number): void {
    // Don't update if paused (during player death)
    if (this.isPaused) {
      return;
    }

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

    // If following exit path, use that instead of normal pathfinding
    if (this.isFollowingExitPath) {
      this.followExitPath(moveSpeed);
      return;
    }

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

  /**
   * Follow the predefined exit path from the pen
   */
  followExitPath(speed: number): void {
    // Check if we've completed the path
    if (this.exitPathIndex >= this.exitPath.length) {
      this.isFollowingExitPath = false;
      this.updateTarget(); // Start normal pathfinding
      this.moveTowardsTarget(speed);
      return;
    }

    const nextWaypoint = this.exitPath[this.exitPathIndex];
    const targetX = this.mapOffsetX + nextWaypoint.x * this.tileSize + this.tileSize / 2;
    const targetY = this.mapOffsetY + nextWaypoint.y * this.tileSize + this.tileSize / 2;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If we're close enough to the current waypoint, move to the next one
    if (dist < 2) {
      this.gridX = nextWaypoint.x;
      this.gridY = nextWaypoint.y;
      this.exitPathIndex++;
      return;
    }

    // Move towards the current waypoint
    if (dist > 0) {
      const actualSpeed = Math.min(speed, dist);
      this.sprite.x += (dx / dist) * actualSpeed;
      this.sprite.y += (dy / dist) * actualSpeed;

      // Sync animated sprite position
      if (this.animatedSprite) {
        this.animatedSprite.x = this.sprite.x;
        this.animatedSprite.y = this.sprite.y;
      }
    }
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
        const prevDir = this.direction;
        this.direction = nextDir;
        this.gridX = next.x;
        this.gridY = next.y;

        // Update animation if direction changed
        if (prevDir !== nextDir) {
          this.updateAnimation();
        }
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

      // Sync animated sprite position
      if (this.animatedSprite) {
        this.animatedSprite.x = this.sprite.x;
        this.animatedSprite.y = this.sprite.y;
      }
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

  /**
   * Override canMove to prevent enemies from entering the pen after they've exited,
   * unless they are injured and returning to respawn
   */
  canMove(x: number, y: number): boolean {
    // First check if the position is valid using parent class logic
    if (!super.canMove(x, y)) {
      return false;
    }

    const tile = this.mapData.map[y][x];

    // If following exit path, allow movement to pen interior and door
    if (this.isFollowingExitPath) {
      return true;
    }

    // If injured, allow movement to pen (returning to respawn)
    if (this.isInjured) {
      return true;
    }

    // If not released yet, allow movement in pen
    if (!this.isReleased) {
      return true;
    }

    // Normal case: don't allow entering pen interior or door once outside
    if (tile === MapValue.PEN_INTERIOR || tile === MapValue.PEN_DOOR) {
      return false;
    }

    return true;
  }
}