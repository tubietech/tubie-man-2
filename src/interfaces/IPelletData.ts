import Phaser from 'phaser';

/**
 * Drawable type represents either an Arc or Sprite that can be rendered by the graphics system
 */
export type Drawable = Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;

export interface IPelletData {
  pellets: Drawable[][];
  powerups: Phaser.GameObjects.Sprite[];
}
