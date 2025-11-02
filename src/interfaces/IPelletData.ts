import Phaser from 'phaser';

export interface IPelletData {
  pellets: (Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite)[][];
  powerups: Phaser.GameObjects.Sprite[];
}
