import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GameScene } from '../../scenes/GameScene';
import { IMapData } from '../../interfaces/IMapData';

export class Inky extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, mapData: IMapData) {
    super(scene, x, y, 'inky', speed, mapData);
  }
  
  updateTarget(): void {
    const player = (this.scene as GameScene).player;
    this.targetX = this.mapData.map[0].length - player.gridX;
    this.targetY = this.mapData.map.length - player.gridY;
  }
}