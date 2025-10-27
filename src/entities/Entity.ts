import Phaser from 'phaser';
import { IEntity } from '../interfaces/IEntity';
import { Direction } from '../enums/Direction';
import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';
import { MapValue } from '../enums/MapValue';

export class Entity implements IEntity {
  sprite: Phaser.GameObjects.Arc;
  gridX: number;
  gridY: number;
  direction: Direction;
  speed: number;
  scene: Phaser.Scene;
  mapData: IMapData;
  tileSize: number;
  mapOffsetX: number;
  mapOffsetY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, speed: number, mapData: IMapData, tileSize: number, mapOffsetX: number, mapOffsetY: number) {
    this.scene = scene;
    this.gridX = x;
    this.gridY = y;
    this.direction = Direction.RIGHT;
    this.speed = speed;
    this.mapData = mapData;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;

    this.sprite = scene.add.circle(
      mapOffsetX + x * tileSize + tileSize / 2,
      mapOffsetY + y * tileSize + tileSize / 2,
      tileSize / 2 - 2,
      color
    );
  }
  
  update(time: number, delta: number): void {
    // Override in subclasses
  }
  
  moveTo(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
    this.sprite.setPosition(
      this.mapOffsetX + x * this.tileSize + this.tileSize / 2,
      this.mapOffsetY + y * this.tileSize + this.tileSize / 2
    );
  }
  
  canMove(x: number, y: number): boolean {
    if (x < 0 || y < 0 || y >= this.mapData.map.length || x >= this.mapData.map[0].length) {
      return false;
    }
    const tile = this.mapData.map[y][x];
    // Can move on paths, door, tunnels, and powerups
    return tile === MapValue.PATH ||
           tile === MapValue.PEN_DOOR ||
           tile === MapValue.TUNNEL ||
           tile === MapValue.POWERUP;
  }
  
  getNextPosition(dir: Direction): { x: number, y: number } {
    let nextX = this.gridX;
    let nextY = this.gridY;
    
    switch (dir) {
      case Direction.UP: nextY--; break;
      case Direction.DOWN: nextY++; break;
      case Direction.LEFT: nextX--; break;
      case Direction.RIGHT: nextX++; break;
    }
    
    return { x: nextX, y: nextY };
  }
  
  getOppositeDirection(): Direction {
    switch (this.direction) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      case Direction.LEFT: return Direction.RIGHT;
      case Direction.RIGHT: return Direction.LEFT;
    }
  }
}