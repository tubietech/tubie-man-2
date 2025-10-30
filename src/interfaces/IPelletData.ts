import Phaser from 'phaser';

export interface IPelletData {
  pellets: Phaser.GameObjects.Arc[][];
  powerups: Phaser.GameObjects.Arc[];
}
