import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { Language } from '../enums/Language';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { loadPreloadedMaps } from '../utils/preloadedMaps';

export class MenuScene extends Phaser.Scene {
  selectedDifficulty: string = 'medium';
  orientation: Orientation = Orientation.HORIZONTAL;
  localization!: LocalizationManager;
  mapsLoaded: boolean = false;
  loadingText!: Phaser.GameObjects.Text;
  menuContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create() {
    this.localization = LocalizationManager.getInstance();
    const loc = this.localization;

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Create a container for all menu elements
    this.menuContainer = this.add.container(0, 0);

    // Add loading indicator for map preloading
    this.loadingText = this.add.text(
      centerX,
      this.cameras.main.height - 30,
      'Loading maps...',
      {
        fontSize: '14px',
        color: '#888'
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Load preloaded maps in the background during menu
    console.log('Preloading maps during menu...');
    loadPreloadedMaps()
      .then(() => {
        this.mapsLoaded = true;
        console.log('✓ Preloaded maps ready');
        this.loadingText.setText('✓ Maps ready');
        this.loadingText.setColor('#00ff00');
      })
      .catch((error) => {
        console.warn('Failed to preload maps:', error);
        this.mapsLoaded = true; // Continue anyway
        this.loadingText.setText('Maps will generate on-the-fly');
        this.loadingText.setColor('#ffaa00');
      });
    
    this.add.text(centerX, 80, loc.getText('gameTitle'), {
      fontSize: '48px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(centerX, 150, loc.getText('selectDifficulty'), {
      fontSize: '24px',
      color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    const difficulties = [
      { key: 'easy', color: '#00ff00' },
      { key: 'medium', color: '#ffff00' },
      { key: 'hard', color: '#ff0000' }
    ];
    
    difficulties.forEach((diff, i) => {
      const btn = this.add.text(
        centerX,
        220 + i * 60,
        loc.getText(diff.key as any),
        {
          fontSize: '28px',
          color: diff.color,
          backgroundColor: '#000',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      btn.on('pointerover', () => btn.setScale(1.1));
      btn.on('pointerout', () => btn.setScale(1));
      btn.on('pointerdown', () => {
        this.selectedDifficulty = diff.key;
        this.startGame();
      });
    });

    this.add.text(centerX, 450, loc.getText('controls'), {
      fontSize: '16px',
      color: '#aaa',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    const languages = [
      { lang: Language.ENGLISH, label: 'EN' },
      { lang: Language.SPANISH, label: 'ES' },
      { lang: Language.FRENCH, label: 'FR' },
      { lang: Language.GERMAN, label: 'DE' }
    ];

    this.add.text(centerX, 520, 'Language:', {
      fontSize: '14px',
      color: '#888'
    }).setOrigin(0.5).setScrollFactor(0);
    
    languages.forEach((langObj, i) => {
      const langBtn = this.add.text(
        centerX - 80 + i * 50,
        550,
        langObj.label,
        {
          fontSize: '16px',
          color: this.localization.getLanguage() === langObj.lang ? '#ffff00' : '#fff',
          backgroundColor: '#222',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      langBtn.on('pointerover', () => langBtn.setScale(1.1));
      langBtn.on('pointerout', () => langBtn.setScale(1));
      langBtn.on('pointerdown', () => {
        this.localization.setLanguage(langObj.lang);
        this.scene.restart();
      });
    });

    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    const mapWidth = 280; // Approximate menu width
    const mapHeight = 600; // Approximate menu height

    // Calculate the scale factor
    const scaleX = gameSize.width / mapWidth;
    const scaleY = gameSize.height / mapHeight;
    const scale = Math.min(scaleX, scaleY);

    // Update camera zoom to maintain aspect ratio
    this.cameras.main.setZoom(scale);

    // Center the camera
    this.cameras.main.centerOn(this.cameras.main.centerX, this.cameras.main.centerY);
  }

  startGame() {
    this.scene.start('GameScene', {
      difficulty: this.selectedDifficulty,
      orientation: this.orientation,
      reset: true
    });
  }
}