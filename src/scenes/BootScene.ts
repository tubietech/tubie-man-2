import Phaser from 'phaser';

/**
 * Minimal boot scene that loads the game font before any text is rendered.
 * Once the font is loaded, it starts PreloadScene where the loading screen
 * can use the font immediately.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.font('PressStart2P', '/assets/fonts/PressStart2P.ttf', 'truetype');
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
