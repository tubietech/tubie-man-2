import Phaser from 'phaser';
import { Entity } from './Entity';
import { Direction } from '../enums/Direction';
import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';

export class Player extends Entity {
  hasFirePower: boolean = false;
  fireActive: boolean = false;
  fireDuration: number = 0;
  fireParticles: Phaser.GameObjects.Arc[] = [];
  inputQueue: Direction[] = [];
  animatedSprite!: Phaser.GameObjects.Sprite;
  isMoving: boolean = false;
  lastDirection: Direction = Direction.RIGHT;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number) {
    super(scene, x, y, color, speed, mapData, tileSize, mapOffsetX, mapOffsetY);

    // Destroy the circle sprite created by parent
    this.sprite.destroy();

    // Create animated sprite
    this.animatedSprite = scene.add.sprite(
      mapOffsetX + x * tileSize + tileSize / 2,
      mapOffsetY + y * tileSize + tileSize / 2,
      'atlas',
      'player_right_frame_1.png'
    );

    // Scale sprite to fit tile size, then scale up by 50%
    const spriteScale = tileSize / Math.max(this.animatedSprite.width, this.animatedSprite.height);
    this.animatedSprite.setScale(spriteScale * gameConfig.player.spriteScale);

    // Update sprite reference to point to animated sprite
    this.sprite = this.animatedSprite;

    // Start with idle frame for right direction
    this.lastDirection = Direction.RIGHT;
  }
  
  update(time: number, delta: number): void {
    const moveSpeed = this.speed * delta / 1000;
    
    if (this.fireActive) {
      this.fireDuration -= delta;
      if (this.fireDuration <= 0) {
        this.deactivateFire();
      }
    }
    
    if (this.inputQueue.length > 0) {
      const nextDir = this.inputQueue[0];
      if (this.tryChangeDirection(nextDir)) {
        this.inputQueue.shift();
      }
    }
    
    this.moveInDirection(moveSpeed);
  }
  
  tryChangeDirection(dir: Direction): boolean {
    const nextPos = this.getNextPosition(dir);
    if (this.canMovePlayer(nextPos.x, nextPos.y)) {
      this.direction = dir;
      return true;
    }
    return false;
  }
  
  canMovePlayer(x: number, y: number): boolean {
    if (!this.canMove(x, y)) return false;

    // Player cannot enter pen
    const penBounds = this.mapData.penBounds;
    if (x >= penBounds.minX && x <= penBounds.maxX &&
        y >= penBounds.minY && y <= penBounds.maxY) {
      return false;
    }

    // Player cannot enter pen door (tile value 3)
    if (this.mapData.map[y] && this.mapData.map[y][x] === 3) {
      return false;
    }

    return true;
  }
  
  moveInDirection(speed: number): void {
    const targetX = this.mapOffsetX + this.gridX * this.tileSize + this.tileSize / 2;
    const targetY = this.mapOffsetY + this.gridY * this.tileSize + this.tileSize / 2;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const next = this.getNextPosition(this.direction);
      if (this.canMovePlayer(next.x, next.y)) {
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
      this.isMoving = true;

      // Play animation based on direction
      this.playDirectionAnimation(this.direction);
      this.lastDirection = this.direction;
    } else {
      // Not moving - freeze on last frame
      this.isMoving = false;
      if (this.animatedSprite && this.animatedSprite.anims && this.animatedSprite.anims.isPlaying) {
        this.animatedSprite.anims.pause();
      }
    }
  }

  private playDirectionAnimation(direction: Direction): void {
    // Safety check: ensure sprite and anims exist
    if (!this.animatedSprite || !this.animatedSprite.anims) {
      return;
    }

    let animKey = '';

    switch (direction) {
      case Direction.UP:
        animKey = 'player_up';
        break;
      case Direction.DOWN:
        animKey = 'player_down';
        break;
      case Direction.LEFT:
        animKey = 'player_left';
        break;
      case Direction.RIGHT:
        animKey = 'player_right';
        break;
    }

    // Only play if not already playing this animation
    if (this.animatedSprite.anims.currentAnim?.key !== animKey) {
      this.animatedSprite.play(animKey);
    } else if (!this.animatedSprite.anims.isPlaying) {
      this.animatedSprite.anims.resume();
    }
  }
  
  activateFire(): void {
    if (!this.hasFirePower || this.fireActive) return;

    this.fireActive = true;
    this.fireDuration = gameConfig.player.fireBreathDuration;
    this.hasFirePower = false;

    const range = gameConfig.player.fireBreathRange;

    this.fireParticles = [];
    for (let i = 1; i <= range; i++) {
      let fx = this.gridX;
      let fy = this.gridY;

      switch (this.direction) {
        case Direction.UP: fy -= i; break;
        case Direction.DOWN: fy += i; break;
        case Direction.LEFT: fx -= i; break;
        case Direction.RIGHT: fx += i; break;
      }

      if (this.canMove(fx, fy)) {
        const fire = this.scene.add.circle(
          this.mapOffsetX + fx * this.tileSize + this.tileSize / 2,
          this.mapOffsetY + fy * this.tileSize + this.tileSize / 2,
          this.tileSize / 3,
          gameConfig.colors.fire
        );
        this.fireParticles.push(fire);
      }
    }
  }
  
  deactivateFire(): void {
    this.fireActive = false;
    this.fireParticles.forEach(p => p.destroy());
    this.fireParticles = [];
  }
  
  getFirePositions(): { x: number, y: number }[] {
    if (!this.fireActive) return [];
    
    const positions: { x: number, y: number }[] = [];
    const range = gameConfig.player.fireBreathRange;
    
    for (let i = 1; i <= range; i++) {
      let fx = this.gridX;
      let fy = this.gridY;
      
      switch (this.direction) {
        case Direction.UP: fy -= i; break;
        case Direction.DOWN: fy += i; break;
        case Direction.LEFT: fx -= i; break;
        case Direction.RIGHT: fx += i; break;
      }
      
      positions.push({ x: fx, y: fy });
    }
    
    return positions;
  }
}