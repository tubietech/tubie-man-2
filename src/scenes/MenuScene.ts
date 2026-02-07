import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { Language } from '../enums/Language';
import { Difficulty } from '../enums/Difficulty';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { loadPreloadedMaps } from '../utils/preloadedMaps';
import { DeveloperMode } from '../utils/DeveloperMode';
import { AudioManager } from '../utils/AudioManager';
import { gameConfig } from '../config/gameConfig';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';
import { MainMenu } from '../ui/menus/MainMenu';
import { SettingsMenu } from '../ui/menus/SettingsMenu';
import { AboutMenu } from '../ui/menus/AboutMenu';
import { Menu } from '../ui/menus/Menu';
import { InstructionsMenu } from '../ui/menus/InstructionsMenu';
import { HighScoreListMenu } from '../ui/menus/HighScoreListMenu';

export class MenuScene extends Phaser.Scene {
  orientation: Orientation = Orientation.HORIZONTAL;
  localization!: LocalizationManager;
  mapsLoaded: boolean = false;
  loadingText!: Phaser.GameObjects.Text;
  konamiCodeInput: string[] = [];
  konamiCodeKeys: Map<number, string> = new Map();

  // Menu system
  private mainMenu!: MainMenu;
  private settingsMenu!: SettingsMenu;
  private aboutMenu!: AboutMenu;
  private instructionsMenu!: InstructionsMenu;
  private highScoreListMenu!: HighScoreListMenu;
  private menuStack: Menu[] = [];

  // Audio
  private audioManager!: AudioManager;
  private userInteractionHandler: (() => void) | null = null;
  private gameAudioLoaded: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create(data?: { languageChanged?: boolean }) {
    const gameLogger = new Logger(LogGroup.GAME);
    const preloadLogger = new Logger(LogGroup.PRELOAD);

    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      gameLogger.log("Phaser is using WebGL.");
    } else if (this.renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer) {
      gameLogger.log("Phaser is using Canvas.");
    } else {
      gameLogger.log("Unknown renderer type.");
    }

    this.localization = LocalizationManager.getInstance();
    const devLogger = new Logger(LogGroup.DEVELOPER);

    // Set up Konami code detection
    this.setupKonamiCode();

    this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes[
        gameConfig.developer.keys.reloadBrowser as keyof typeof Phaser.Input.Keyboard.KeyCodes
      ]).on('down', () => {
        if(DeveloperMode.getInstance().isEnabled()) {
          devLogger.log('Reloading Browser');
          window.location.reload();
        }
    });
    
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
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    // Load preloaded maps in the background during menu
    preloadLogger.log('Preloading maps during menu...');
    loadPreloadedMaps()
      .then(() => {
        this.mapsLoaded = true;
        preloadLogger.log('✓ Preloaded maps ready');
        // this.loadingText.setText('✓ Maps ready');
        this.loadingText.setText('©Tubie Tech 2025, All Rights Reserved');
        this.loadingText.setColor('#00ff00');
      })
      .catch((error) => {
        preloadLogger.warnMultiLine(['Failed to preload maps:', error]);
        this.mapsLoaded = true; // Continue anyway
        // this.loadingText.setText('Maps will generate on-the-fly');
        this.loadingText.setText('©Tubie Tech 2025, All Rights Reserved');
        this.loadingText.setColor('#ffaa00');
      });

    // Create menus (pass language change flag to focus on language selector)
    this.createMenus(data?.languageChanged ?? false);

    // Show main menu
    this.openMenu(this.mainMenu);

    // Initialize audio
    this.setupAudio();

    // Lazy-load game audio in the background
    this.loadGameAudio();
  }

  /**
   * Set up background music for the menu
   * Handles browser autoplay restrictions by waiting for user interaction on first load
   */
  private setupAudio(): void {
    this.audioManager = AudioManager.getInstance();
    this.audioManager.initialize(this);

    // Try to play menu music
    // If user hasn't interacted yet, this will queue the track
    this.audioManager.playBackgroundMusic('menu');

    // If user hasn't interacted yet, set up listener for first interaction
    if (!this.audioManager.hasUserInteracted()) {
      this.userInteractionHandler = () => {
        this.audioManager.onUserInteraction();
        this.removeUserInteractionListeners();
      };

      // Listen for any user interaction
      this.input.keyboard?.on('keydown', this.userInteractionHandler);
      this.input.on('pointerdown', this.userInteractionHandler);
      this.input.on('pointermove', this.userInteractionHandler);

      // Also listen on window for clicks outside game canvas
      window.addEventListener('keydown', this.userInteractionHandler, { once: true });
      window.addEventListener('click', this.userInteractionHandler, { once: true });
      window.addEventListener('touchstart', this.userInteractionHandler, { once: true });
      window.addEventListener('mousemove', this.userInteractionHandler, { once: true });
    }
  }

  /**
   * Remove user interaction listeners once interaction is detected
   */
  private removeUserInteractionListeners(): void {
    if (this.userInteractionHandler) {
      this.input.keyboard?.off('keydown', this.userInteractionHandler);
      this.input.off('pointerdown', this.userInteractionHandler);
      this.input.off('pointermove', this.userInteractionHandler);
      window.removeEventListener('keydown', this.userInteractionHandler);
      window.removeEventListener('click', this.userInteractionHandler);
      window.removeEventListener('touchstart', this.userInteractionHandler);
      window.removeEventListener('mousemove', this.userInteractionHandler);
      this.userInteractionHandler = null;
    }
  }

  /**
   * Lazy-load game audio (sound effects, game music) in the background
   * so the menu appears instantly without waiting for all audio.
   */
  private loadGameAudio(): void {
    if (this.gameAudioLoaded) return;

    const logger = new Logger(LogGroup.PRELOAD);
    logger.log('Lazy-loading game audio...');

    // Queue game audio files
    this.load.audio('music_game', '/assets/audio/chase_2.mp3');
    this.load.audio('music_gameOver', '/assets/audio/robobozo-death.mp3');
    this.load.audio('music_victory', '/assets/audio/win.mp3');
    this.load.audio('music_getReady', '/assets/audio/bit-shift-clip.mp3');
    this.load.audio('sfx_pellet', '/assets/audio/tubie-tubie-8.mp3');
    this.load.audio('sfx_powerup', '/assets/audio/pixel-peeker-polka-bonus.mp3');
    this.load.audio('sfx_enemyHit', '/assets/audio/spazzmatica-powerup.mp3');
    this.load.audio('sfx_enemyReturn', '/assets/audio/enemy_return.mp3');
    this.load.audio('sfx_death', '/assets/audio/robobozo-death.mp3');
    this.load.audio('sfx_bonus', '/assets/audio/spazzmatica-powerup.mp3');
    this.load.audio('sfx_levelComplete', '/assets/audio/win.mp3');

    this.load.once('complete', () => {
      this.gameAudioLoaded = true;
      logger.log('Game audio loaded');
    });

    this.load.start();
  }

  private createMenus(focusOnLanguage: boolean = false): void {
    // Create main menu
    this.mainMenu = new MainMenu(this, this.orientation);
    this.mainMenu.setCallbacks({
      onStartGame: (difficulty) => this.startGame(difficulty),
      onOpenSettings: () => this.openMenu(this.settingsMenu),
      onOpenAbout: () => this.openMenu(this.aboutMenu),
      onOpenInstructions: () => this.openMenu(this.instructionsMenu),
      onOpenHighScores: () => this.openMenu(this.highScoreListMenu)
    });

    // Create settings menu
    this.settingsMenu = new SettingsMenu(this, this.orientation);
    this.settingsMenu.setOnBack(() => this.goBack());
    this.settingsMenu.setOnLanguageChange((language) => this.changeLanguage(language));

    // Create about menu
    this.aboutMenu = new AboutMenu(this, this.orientation);
    this.aboutMenu.setOnBack(() => this.goBack());

    // Create instructions menu
    this.instructionsMenu = new InstructionsMenu(this, this.orientation);
    this.instructionsMenu.setOnBack(() => this.goBack());

    // Create high score list menu
    this.highScoreListMenu = new HighScoreListMenu(this, this.orientation);
    this.highScoreListMenu.setOnBack(() => this.goBack());
  }

  private openMenu(menu: Menu): void {
    // Hide current menu if exists
    if (this.menuStack.length > 0) {
      const currentMenu = this.menuStack[this.menuStack.length - 1];
      currentMenu.hide();
    }

    // Push and show new menu
    this.menuStack.push(menu);
    menu.show();
  }

  private goBack(): void {
    // Don't go back if we're at the main menu
    if (this.menuStack.length <= 1) return;

    // Pop and hide current menu
    const currentMenu = this.menuStack.pop()!;
    currentMenu.hide();

    // Show previous menu
    const previousMenu = this.menuStack[this.menuStack.length - 1];
    previousMenu.show();
  }

  private startGame(difficulty: Difficulty): void {
    // Stop menu music before starting game
    this.audioManager.stopBackgroundMusic();

    this.scene.start('GameScene', {
      difficulty: difficulty,
      orientation: this.orientation,
      reset: true
    });
  }

  private changeLanguage(language: Language): void {
    this.localization.setLanguage(language);
    this.scene.restart({ languageChanged: true });
  }

  private setupKonamiCode(): void {
    // Map keyboard keycodes to Konami code string identifiers
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.UP, 'UP');
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.DOWN, 'DOWN');
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.LEFT, 'LEFT');
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.RIGHT, 'RIGHT');
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.B, 'B');
    this.konamiCodeKeys.set(Phaser.Input.Keyboard.KeyCodes.A, 'A');

    // Listen for keyboard input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const keyCode = event.keyCode;
      const keyString = this.konamiCodeKeys.get(keyCode);

      // Only track keys that are part of the Konami code
      if (keyString) {
        this.konamiCodeInput.push(keyString);

        // Keep only the last N inputs (where N is the length of the Konami code)
        const codeLength = gameConfig.developer.konamiCode.length;
        if (this.konamiCodeInput.length > codeLength) {
          this.konamiCodeInput.shift();
        }

        // Check if the input matches the Konami code
        if (this.konamiCodeInput.length === codeLength) {
          const inputString = this.konamiCodeInput.join(',');
          const konamiString = gameConfig.developer.konamiCode.join(',');

          if (inputString === konamiString) {
            Logger.logStatic(LogGroup.DEVELOPER, 'Developer mode activated!');
            DeveloperMode.getInstance().enable();
            this.konamiCodeInput = []; // Reset input
          }
        }
      }
    });
  }

  update(): void {
    // Sync settings menu toggles with external value changes (e.g., mute key pressed)
    if (this.menuStack.length > 0) {
      const currentMenu = this.menuStack[this.menuStack.length - 1];
      if (currentMenu === this.settingsMenu)
        this.settingsMenu.update();
    }
  }

  setOrientation(orientation: Orientation) {
    this.orientation = orientation;
    Logger.logStatic(LogGroup.GAME, `Orientation set to: ${Orientation[orientation]}`);
  }

  shutdown() {
    // Cleanup menus
    this.mainMenu?.destroy();
    this.settingsMenu?.destroy();
    this.aboutMenu?.destroy();
    this.instructionsMenu?.destroy();
    this.highScoreListMenu?.destroy();
    this.menuStack = [];

    // Cleanup audio interaction listeners
    this.removeUserInteractionListeners();
  }
}
