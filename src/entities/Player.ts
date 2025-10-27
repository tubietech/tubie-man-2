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
  
  constructor(scene: Phaser.Scene, x: number, y: number, color: number, speed: number, mapData: IMapData, tileSize: number) {
    super(scene, x, y, color, speed, mapData, tileSize);
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

    return true;
  }
  
  moveInDirection(speed: number): void {
    const targetX = this.gridX * this.tileSize + this.tileSize / 2;
    const targetY = this.gridY * this.tileSize + this.tileSize / 2;
    
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const next = this.getNextPosition(this.direction);
      if (this.canMovePlayer(next.x, next.y)) {
        this.gridX = next.x;
        this.gridY = next.y;
      }
    }
    
    const newTargetX = this.gridX * this.tileSize + this.tileSize / 2;
    const newTargetY = this.gridY * this.tileSize + this.tileSize / 2;
    
    const moveX = newTargetX - this.sprite.x;
    const moveY = newTargetY - this.sprite.y;
    const dist = Math.sqrt(moveX * moveX + moveY * moveY);
    
    if (dist > 0) {
      const actualSpeed = Math.min(speed, dist);
      this.sprite.x += (moveX / dist) * actualSpeed;
      this.sprite.y += (moveY / dist) * actualSpeed;
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
          fx * this.tileSize + this.tileSize / 2,
          fy * this.tileSize + this.tileSize / 2,
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