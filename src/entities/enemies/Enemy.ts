import Phaser from 'phaser';
import { Entity } from '../Entity';
import { Direction } from '../../enums/Direction';
import { gameConfig } from '../../config/gameConfig';
import { IMapData } from '../../interfaces/IMapData';

export class Enemy extends Entity {
  type: string;
  pathfindTimer: number = 0;
  targetX: number;
  targetY: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, type: string, speed: number, mapData: IMapData, tileSize: number) {
    const color = gameConfig.colors[type as keyof typeof gameConfig.colors] as number;
    super(scene, x, y, color, speed, mapData, tileSize);
    this.type = type;
    this.targetX = x;
    this.targetY = y;
  }
  
  update(time: number, delta: number): void {
    const moveSpeed = this.speed * delta / 1000;
    
    this.pathfindTimer += delta;
    if (this.pathfindTimer >= 500) {
      this.pathfindTimer = 0;
      this.updateTarget();
    }
    
    this.moveTowardsTarget(moveSpeed);
  }
  
  updateTarget(): void {
    // Override in subclasses
  }
  
  moveTowardsTarget(speed: number): void {
    const targetX = this.gridX * this.tileSize + this.tileSize / 2;
    const targetY = this.gridY * this.tileSize + this.tileSize / 2;
    
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