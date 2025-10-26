import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Direction } from '../../enums/Direction';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';

export class Pinky extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData) {
    super(scene, x, y, 'pinky', speed, mapData);
  }
  
  updateTarget(): void {
    const player = (this.scene as GameScene).player;
    let tx = player.gridX;
    let ty = player.gridY;
    
    switch (player.direction) {
      case Direction.UP: ty -= 4; break;
      case Direction.DOWN: ty += 4; break;
      case Direction.LEFT: tx -= 4; break;
      case Direction.RIGHT: tx += 4; break;
    }
    
    this.targetX = tx;
    this.targetY = ty;
  }
}