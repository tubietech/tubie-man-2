import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';

export class Clyde extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData) {
    super(scene, x, y, 'clyde', speed, mapData);
  }
  
  updateTarget(): void {
    const player = (this.scene as GameScene).player;
    const dist = Math.abs(this.gridX - player.gridX) + Math.abs(this.gridY - player.gridY);
    
    if (dist > 8) {
      this.targetX = player.gridX;
      this.targetY = player.gridY;
    } else {
      this.targetX = 0;
      this.targetY = this.mapData.map.length - 1;
    }
  }
}