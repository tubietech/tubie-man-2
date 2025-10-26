import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';

export class Blinky extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData) {
    super(scene, x, y, 'blinky', speed, mapData);
  }
  
  updateTarget(): void {
    const player = (this.scene as GameScene).player;
    this.targetX = player.gridX;
    this.targetY = player.gridY;
  }
}