import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load the sprite atlas
    this.load.atlas('atlas', '/assets/sprites/atlas.png', '/assets/sprites/atlas.json');

    // Optional: Add a loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      percentText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }

  create() {
    // Create player animations here so they're available in all scenes
    this.createPlayerAnimations();

    // Start the menu scene
    this.scene.start('MenuScene');
  }

  private createPlayerAnimations() {
    const frameRate = gameConfig.player.animationFrameRate;

    // UP animation
    this.anims.create({
      key: 'player_up',
      frames: [
        { key: 'atlas', frame: 'player_up_frame_1.png' },
        { key: 'atlas', frame: 'player_up_frame_2.png' },
        { key: 'atlas', frame: 'player_up_frame_3.png' }
      ],
      frameRate: frameRate,
      repeat: -1
    });

    // DOWN animation
    this.anims.create({
      key: 'player_down',
      frames: [
        { key: 'atlas', frame: 'player_down_frame_1.png' },
        { key: 'atlas', frame: 'player_down_frame_2.png' },
        { key: 'atlas', frame: 'player_down_frame_3.png' }
      ],
      frameRate: frameRate,
      repeat: -1
    });

    // LEFT animation
    this.anims.create({
      key: 'player_left',
      frames: [
        { key: 'atlas', frame: 'player_left_frame_1.png' },
        { key: 'atlas', frame: 'player_left_frame_2.png' },
        { key: 'atlas', frame: 'player_left_frame_3.png' }
      ],
      frameRate: frameRate,
      repeat: -1
    });

    // RIGHT animation
    this.anims.create({
      key: 'player_right',
      frames: [
        { key: 'atlas', frame: 'player_right_frame_1.png' },
        { key: 'atlas', frame: 'player_right_frame_2.png' },
        { key: 'atlas', frame: 'player_right_frame_3.png' }
      ],
      frameRate: frameRate,
      repeat: -1
    });
  }
}
