import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';
import { AudioManager } from '../utils/AudioManager';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load local fonts
    this.load.font('PressStart2P', '/assets/fonts/PressStart2P.ttf', 'truetype');

    // Load the sprite atlas
    this.load.atlas('atlas', '/assets/sprites/atlas.png', '/assets/sprites/atlas.json');

    // Load audio files
    this.loadAudio();

    // Optional: Add a loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'PressStart2P',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: 'PressStart2P',
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

    // Create Enemy animations here so they're available in all scenes
    this.createEnemyAnimations();

    // Create projectile animation
    this.createProjectileAnimation();

    // Initialize AudioManager and mark audio as loaded
    const audioManager = AudioManager.getInstance();
    audioManager.initialize(this);
    audioManager.setLoaded(true);

    // Start the menu scene
    this.scene.start('MenuScene');
  }

  /**
   * Load all audio files for the game
   */
  private loadAudio(): void {
    // Background music tracks
    this.load.audio('music_menu', '/assets/audio/getting-it-done.mp3');
    this.load.audio('music_game', '/assets/audio/chase_2.mp3');
    this.load.audio('music_gameOver', '/assets/audio/robobozo-death.mp3');
    this.load.audio('music_victory', '/assets/audio/win.mp3');
    this.load.audio('music_getReady', '/assets/audio/bit-shift-clip.mp3');

    // Sound effects
    this.load.audio('sfx_pellet', '/assets/audio/tubie-tubie-8.mp3');
    this.load.audio('sfx_powerup', '/assets/audio/pixel-peeker-polka-bonus.mp3');
    this.load.audio('sfx_enemyHit', '/assets/audio/spazzmatica-powerup.mp3');
    this.load.audio('sfx_enemyReturn', '/assets/audio/enemy_return.mp3');
    this.load.audio('sfx_death', '/assets/audio/robobozo-death.mp3');
    this.load.audio('sfx_bonus', '/assets/audio/spazzmatica-powerup.mp3');
    this.load.audio('sfx_levelComplete', '/assets/audio/win.mp3');
    this.load.audio('sfx_menuSelect', '/assets/audio/tubie-tubie.mp3');
    this.load.audio('sfx_menuNavigate', '/assets/audio/bit-shift-clip.mp3');
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

  private createEnemyAnimations() {
     const frameRate = gameConfig.enemy.animationFrameRate;

     const createEnemyAnimations = (enemyName: string, enemyKey: string):void => {
        const createAnimation = (name: string, key: string, direction: string): void => {
          this.anims.create({
            key: `${name}_${direction}`,
            frames: [
              { key: 'atlas', frame: `${key}_${direction}_frame_1.png` },
              { key: 'atlas', frame: `${key}_${direction}_frame_2.png` }
            ],
            frameRate: frameRate,
            repeat: -1
          }); 
        }

        createAnimation(enemyName, enemyKey, "up");
        createAnimation(enemyName, enemyKey, "down");
        createAnimation(enemyName, enemyKey, "left");
        createAnimation(enemyName, enemyKey, "right");
     }

     createEnemyAnimations("stingy", "enemy1");
     createEnemyAnimations("pokey", "enemy2");
     createEnemyAnimations("pricky", "enemy3");
     createEnemyAnimations("doc", "enemy4");
  }

  private createProjectileAnimation() {
    const frameRate = gameConfig.player.powerup.projectile.animationFrameRate;

    // Projectile animation
    this.anims.create({
      key: 'projectile_anim',
      frames: [
        { key: 'atlas', frame: 'player_projectile_frame_1.png' },
        { key: 'atlas', frame: 'player_projectile_frame_2.png' },
        { key: 'atlas', frame: 'player_projectile_frame_3.png' },
        { key: 'atlas', frame: 'player_projectile_frame_4.png' },
        { key: 'atlas', frame: 'player_projectile_frame_5.png' }
      ],
      frameRate: frameRate,
      repeat: -1
    });
  }
}
