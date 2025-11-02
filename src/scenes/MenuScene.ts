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

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create() {
    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        console.log("Phaser is using WebGL.");
    } else if (this.renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer) {
        console.log("Phaser is using Canvas.");
    } else {
        console.log("Unknown renderer type.");
    }

    this.localization = LocalizationManager.getInstance();
    const loc = this.localization;

    const centerX = this.cameras.main.centerX;

    // Add loading indicator for map preloading
    this.loadingText = this.add.text(
      centerX,
      this.cameras.main.height - 30,
      'Loading maps...',
      {
        fontFamily: 'PressStart2P',
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
      fontFamily: 'PressStart2P',
      fontSize: '48px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(centerX, 150, loc.getText('selectDifficulty'), {
      fontFamily: 'PressStart2P',
      fontSize: '24px',
      color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    const difficulties = [
      { key: 'easy', color: '#00ff00' },
      { key: 'medium', color: '#ffff00' },
      { key: 'hard', color: '#ff0000' }
    ];
    
    difficulties.forEach((diff, i) => {
      const y = 220 + i * 60;

      // Create background rectangle
      const bg = this.add.rectangle(centerX, y, 200, 50, 0x000000)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      const btn = this.add.text(
        centerX,
        y,
        loc.getText(diff.key as any),
        {
          fontFamily: 'PressStart2P',
          fontSize: '28px',
          color: diff.color
        }
      ).setOrigin(0.5)
        .setScrollFactor(0);

      bg.on('pointerover', () => { bg.setScale(1.1); btn.setScale(1.1); });
      bg.on('pointerout', () => { bg.setScale(1); btn.setScale(1); });
      bg.on('pointerdown', () => {
        this.selectedDifficulty = diff.key;
        this.startGame();
      });
    });

    this.add.text(centerX, 450, loc.getText('controls'), {
      fontFamily: 'PressStart2P',
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
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#888'
    }).setOrigin(0.5).setScrollFactor(0);
    
    languages.forEach((langObj, i) => {
      const x = centerX - 80 + i * 50;
      const y = 550;

      // Create background rectangle
      const bg = this.add.rectangle(x, y, 40, 30, 0x222222)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      const langBtn = this.add.text(
        x,
        y,
        langObj.label,
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: this.localization.getLanguage() === langObj.lang ? '#ffff00' : '#fff'
        }
      ).setOrigin(0.5)
        .setScrollFactor(0);

      bg.on('pointerover', () => { bg.setScale(1.1); langBtn.setScale(1.1); });
      bg.on('pointerout', () => { bg.setScale(1); langBtn.setScale(1); });
      bg.on('pointerdown', () => {
        this.localization.setLanguage(langObj.lang);
        this.scene.restart();
      });
    });
  }

  startGame() {
    this.scene.start('GameScene', {
      difficulty: this.selectedDifficulty,
      orientation: this.orientation,
      reset: true
    });
  }
}