import Phaser from 'phaser';
import { Direction } from '../enums/Direction';

export interface IEntity {
  sprite: Phaser.GameObjects.Arc;
  gridX: number;
  gridY: number;
  direction: Direction;
  speed: number;
  update(time: number, delta: number): void;
  moveTo(x: number, y: number): void;
}