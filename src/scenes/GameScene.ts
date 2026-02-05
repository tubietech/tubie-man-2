import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Pokey } from '../entities/enemies/Pokey';
import { Pricky } from '../entities/enemies/Pricky';
import { Stingy } from '../entities/enemies/Stingy';
import { Doc } from '../entities/enemies/Doc';
import { MapGeneratorV2 } from '../utils/MapGeneratorV2';
import { MapRenderer } from '../utils/MapRenderer';
import { UIRenderer } from '../ui/UIRenderer';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { HighScoreManager } from '../utils/HighScoreManager';
import { canEatPellet, calculateScaledSpeed, calculateBonusAppearances, colorNumberToString } from '../utils/utils';
import { IMapData } from '../interfaces/IMapData';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { Bonus } from '../entities/Bonus';
import { BonusSelector } from '../utils/BonusSelector';
import { IBonusData } from '../interfaces/IBonusData';
import { PauseMenu } from '../ui/PauseMenu';
import { HighScoreEntryOverlay } from '../ui/HighScoreEntryOverlay';
import { mapColorPalettes, getRandomPaletteIndex, IMapColorPalette, defaultPalette } from '../config/mapColorPalettes';
import { DeveloperMode } from '../utils/DeveloperMode';
import { Drawable } from '../interfaces/IPelletData';
import { Difficulty } from '../enums/Difficulty';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';
import { SettingsManager } from '../utils/SettingsManager';
import { AudioManager } from '../utils/AudioManager';

export class GameScene extends Phaser.Scene {
  mapData!: IMapData;
  pellets: Drawable[][] = [];
  powerups: Phaser.GameObjects.Sprite[] = [];
  player!: Player;
  enemies: Enemy[] = [];
  bonus: Bonus | null = null;
  bonusData!: IBonusData;
  bonusAppearances: number[] = [];
  currentBonusAppearance: number = 0;
  pelletsEaten: number = 0;
  score: number = 0;
  highScore: number = 0;
  level: number = 1;
  lives: number = 3;
  difficulty: Difficulty = Difficulty.MEDIUM;
  orientation: Orientation = Orientation.HORIZONTAL;
  localization!: LocalizationManager;
  uiRenderer!: UIRenderer;
  performanceMonitor!: PerformanceMonitor;
  mapRenderer: MapRenderer | null = null;
  tunnelCooldown: number = 0;
  mapOffsetX: number = 0;
  mapOffsetY: number = 0;
  mapWidth: number = 0;
  mapHeight: number = 0;
  enemiesReleased: number = 0;
  injuryComboCount: number = 0;
  lastInjuryTime: number = 0;
  isGameOver: boolean = false;
  isPaused: boolean = false;
  isGetReady: boolean = true;
  getReadyText: Phaser.GameObjects.Text | null = null;
  pauseMenu!: PauseMenu;
  highScoreEntryOverlay: HighScoreEntryOverlay | null = null;
  pauseKey!: Phaser.Input.Keyboard.Key;
  muteKey!: Phaser.Input.Keyboard.Key;
  currentPaletteIndex: number = -1;
  currentPalette!: IMapColorPalette;
  developerIndicator!: Phaser.GameObjects.Text;
  devKeys!: {
    toggleAI: Phaser.Input.Keyboard.Key;
    clearPellets: Phaser.Input.Keyboard.Key;
    killPlayer: Phaser.Input.Keyboard.Key;
    activatePowerup: Phaser.Input.Keyboard.Key;
    reloadBrowser: Phaser.Input.Keyboard.Key;
  };
  devKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
  enemyAIEnabled: boolean = true;
  respawnQueue: Enemy[] = [];
  lastRespawnTime: number = 0;

  // Audio state tracking
  isEatingPellet: boolean = false;
  lastPelletEatTime: number = 0;
  pelletEatSoundTimeout: number = 200; // Stop eating sound if no pellet eaten for this duration (ms)

  scoreText!: Phaser.GameObjects.Container;
  highScoreText!: Phaser.GameObjects.Container;
  livesText!: Phaser.GameObjects.Container;
  livesSprites!: Phaser.GameObjects.Sprite[];
  levelText!: Phaser.GameObjects.Container;
  levelSprites!: Phaser.GameObjects.Sprite[];
  powerText!: Phaser.GameObjects.Text;
  durationPieChart?: Phaser.GameObjects.Graphics;
  cooldownBar?: Phaser.GameObjects.Graphics;
  cooldownBarBg?: Phaser.GameObjects.Graphics;

  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: any;
  fireKey!: Phaser.Input.Keyboard.Key;

  graphics: Phaser.GameObjects.Graphics | null;
  mapRectangles: Phaser.GameObjects.Rectangle[] = [];
  
  constructor() {
    super({ key: 'GameScene' });
    this.graphics = null;
  }
  
  init(data: any) {
    this.difficulty = data.difficulty || 'medium';
    this.orientation = data.orientation || Orientation.HORIZONTAL;
    this.localization = LocalizationManager.getInstance();
    this.uiRenderer = new UIRenderer(this, this.localization);
    this.performanceMonitor = PerformanceMonitor.getInstance();

    Logger.logStatic(LogGroup.GAME, `Init - Orientation: ${this.orientation}, Difficulty: ${this.difficulty}`);

    // Always create a fresh graphics object
    this.graphics = this.add.graphics();

    // Reset game over and get ready flags
    this.isGameOver = false;
    this.isGetReady = true;

    if (data.reset) {
      // Full reset - start new game
      this.score = 0;
      this.level = 1;
      this.lives = gameConfig.player.startLives[this.difficulty as keyof typeof gameConfig.player.startLives];
      this.currentPaletteIndex = -1; // Reset palette
    } else {
      // Level transition - preserve game state
      this.score = data.score ?? this.score;
      this.level = data.level ?? this.level;
      this.lives = data.lives ?? this.lives;
      this.currentPaletteIndex = data.currentPaletteIndex ?? this.currentPaletteIndex;
    }

    // Select color palette - change every 2 levels
    this.selectColorPalette();
  }

  /**
   * Select a color palette based on the current level
   * - Levels 1 & 2: Always use the default theme
   * - Levels 3+: Random palette selection every 2 levels, ensuring variety
   */
  private selectColorPalette(): void {
    const paletteLogger = new Logger(LogGroup.PALETTE);
    // Calculate which palette group this level belongs to (changes every 2 levels)
    // Group 0: levels 1-2, Group 1: levels 3-4, Group 2: levels 5-6, etc.
    const currentPaletteGroup = Math.floor((this.level - 1) / 2);

    // Levels 1 & 2 always use the default palette
    if (this.level <= 2) {
      this.currentPaletteIndex = 0; // Default palette is at index 0
      this.currentPalette = defaultPalette;
      paletteLogger.log(`Level ${this.level} (Group ${currentPaletteGroup}): Using DEFAULT palette`);
      return;
    }

    // For levels 3+: Check if we need to change palette (only on odd levels: 3, 5, 7, etc.)
    const shouldChangePalette = (this.level - 1) % 2 === 0;

    if (shouldChangePalette || this.currentPaletteIndex === -1) {
      // Select a new random palette different from the current one
      this.currentPaletteIndex = getRandomPaletteIndex(this.currentPaletteIndex);
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      paletteLogger.log(`Level ${this.level} (Group ${currentPaletteGroup}): Selected NEW palette ${this.currentPaletteIndex}`);
    } else {
      // Keep the same palette
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      paletteLogger.log(`Level ${this.level} (Group ${currentPaletteGroup}): Keeping palette ${this.currentPaletteIndex}`);
    }
  }

  private getTileSize(): number {
    // Calculate tile size based on canvas dimensions to fill the screen
    const canvasWidth = this.cameras.main.width;
    const canvasHeight = this.cameras.main.height;
    const mapWidth = gameConfig.map.width;
    const mapHeight = gameConfig.map.height;

    // Use the smaller scale to ensure the entire map fits
    return Math.min(canvasWidth / mapWidth, canvasHeight / mapHeight);
  }

  private calculateMapOffset(): void {
    const tileSize = this.getTileSize();
    const mapPixelWidth = gameConfig.map.width * tileSize;
    const mapPixelHeight = gameConfig.map.height * tileSize;
    const canvasWidth = this.cameras.main.width;
    const canvasHeight = this.cameras.main.height;

    // Center the map on the canvas
    this.mapOffsetX = (canvasWidth - mapPixelWidth) / 2;
    this.mapOffsetY = (canvasHeight - mapPixelHeight) / 2;
  }

  async create() {
    // Force black background on both camera and game canvas
    this.cameras.main.setBackgroundColor('#000000');
    if (this.game.canvas) {
      this.game.canvas.style.backgroundColor = '#000000';
    }

    // Load high score from localStorage for the current difficulty
    this.highScore = HighScoreManager.getHighScore(this.difficulty);

    this.mapData = await MapGeneratorV2.generate(gameConfig.map.width, gameConfig.map.height);
    this.calculateMapOffset();

    const tileSize = this.getTileSize();
    this.mapRenderer = new MapRenderer(
      this,
      this.mapData,
      this.graphics!,
      this.mapOffsetX,
      this.mapOffsetY,
      tileSize,
      this.currentPalette
    );

    this.mapRectangles = this.mapRenderer.drawMap();
    const { pellets, powerups } = this.mapRenderer.createPellets();
    this.pellets = pellets;
    this.powerups = powerups;

    // Calculate scaled player speed
    const playerSpeed = calculateScaledSpeed(gameConfig.player.speed, this.difficulty, tileSize);

    // Use player start position from map data
    const startX = this.mapData.playerStart.x;
    const startY = this.mapData.playerStart.y;

    this.player = new Player(this, startX, startY, gameConfig.colors.player, playerSpeed, this.mapData, tileSize, this.mapOffsetX, this.mapOffsetY, this.difficulty);

    this.createEnemies();
    this.initializeBonus();
    this.setupInput();
    this.createUI();
    this.showGetReady();
  }

  initializeBonus() {
    const bonusLogger = new Logger(LogGroup.BONUS);

    // Select bonus for this level
    const bonusSelection = BonusSelector.selectBonus(this.level);

    // Create bonus data
    this.bonusData = {
      sprite: bonusSelection.sprite,
      score: bonusSelection.score,
      entryTunnel: 0, // Use first tunnel
      path: this.mapData.bonusPath
    };

    // Calculate when bonus should appear
    this.bonusAppearances = calculateBonusAppearances();
    this.currentBonusAppearance = 0;
    this.pelletsEaten = 0;

    bonusLogger.log(`Initialized for level ${this.level}: ${bonusSelection.sprite}, score: ${bonusSelection.score}`);
    bonusLogger.log(`Will appear at ${this.bonusAppearances[0]} and ${this.bonusAppearances[1]} pellets eaten`);
  }
  
  createEnemies() {
    // Clear the enemies array to prevent duplicates on scene restart
    this.enemies = [];

    const tileSize = this.getTileSize();
    const enemySpeed = calculateScaledSpeed(gameConfig.enemy.speed, this.difficulty, tileSize);

    const penCenterX = this.mapData.penCenter.x;
    const penCenterY = this.mapData.penCenter.y;
    const doorX = this.mapData.penDoor.x;
    const doorY = this.mapData.penDoor.y;

    // Determine number of enemies based on level from config
    const countConfig = gameConfig.enemy.countPerLevel;
    const enemyCount = countConfig[this.level as keyof typeof countConfig] || Object.values(countConfig)[Object.entries(countConfig).length - 1]; // Default to last entry in the list

    // Always include Stingy (index 2)
    // Stingy starts outside the pen, in front of the door
    const stingy = new Stingy(
      this,
      doorX,
      doorY - 1, // One tile above the door (outside the pen)
      enemySpeed,
      this.mapData,
      tileSize,
      this.mapOffsetX,
      this.mapOffsetY,
      this.difficulty
    );
    // Stingy is already outside, no exit path needed
    stingy.setExitPath([]);
    this.enemies.push(stingy);

    // Position other enemies inside the pen based on count
    // Exit path for pen enemies: from pen center -> door -> outside door
    if (enemyCount === 3) {
      // 3 enemies: Stingy (already placed), Pokey, Pricky
      // Place Pokey and Pricky side by side, centered in pen
      const pokey = new Pokey(
        this,
        penCenterX - 1, // Left of center
        penCenterY,
        enemySpeed,
        this.mapData,
        tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      // Exit path for Pokey: left position -> center -> door -> outside
      pokey.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pokey);

      const pricky = new Pricky(
        this,
        penCenterX + 1, // Right of center
        penCenterY,
        enemySpeed,
        this.mapData,
        tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      // Exit path for Pricky: right position -> center -> door -> outside
      pricky.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pricky);
    } else if (enemyCount >= 4) {
      // 4 enemies: Stingy (already placed), Pokey, Pricky, Doc
      // Place Pokey, Pricky, and Doc in a row inside the pen
      const pokey = new Pokey(
        this,
        penCenterX - 1, // Left
        penCenterY,
        enemySpeed,
        this.mapData,
        tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      // Exit path for Pokey: left -> center -> door -> outside
      pokey.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pokey);

      const pricky = new Pricky(
        this,
        penCenterX, // Center
        penCenterY,
        enemySpeed,
        this.mapData,
        tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      // Exit path for Pricky: already at center -> door -> outside
      pricky.setExitPath([
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(pricky);

      const doc = new Doc(
        this,
        penCenterX + 1, // Right
        penCenterY,
        enemySpeed,
        this.mapData,
        tileSize,
        this.mapOffsetX,
        this.mapOffsetY,
        this.difficulty
      );
      // Exit path for Doc: right -> center -> door -> outside
      doc.setExitPath([
        { x: penCenterX, y: penCenterY },
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 }
      ]);
      this.enemies.push(doc);
    }

    // All enemies are now visible from the start and properly positioned
    // Attach respawn callback to all enemies for staggered release
    this.enemies.forEach(enemy => {
      enemy.onReachedPen = (reachedEnemy) => this.handleEnemyReachedPen(reachedEnemy);
    });

    // Initialize enemy release counter (actual release happens after "Get Ready" phase)
    this.enemiesReleased = 0;
  }

  /**
   * Schedule the release of the next enemy from the pen
   */
  scheduleNextEnemyRelease() {
    const enemyLogger = new Logger(LogGroup.ENEMY);

    if (this.enemiesReleased < this.enemies.length) {
      if (this.enemiesReleased === 0) {
        // Release first enemy immediately
        this.enemies[0].release();
        this.enemiesReleased++;
        enemyLogger.log(`Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
        this.scheduleNextEnemyRelease();
      } else {
        // Schedule next enemy release after delay
        const releaseDelay = gameConfig.enemy.releaseDelay[this.difficulty as keyof typeof gameConfig.enemy.releaseDelay];
        this.time.delayedCall(releaseDelay, () => {
          if (this.enemiesReleased < this.enemies.length) {
            this.enemies[this.enemiesReleased].release();
            this.enemiesReleased++;
            enemyLogger.log(`Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
            this.scheduleNextEnemyRelease();
          }
        });
      }
    }
  }

  /**
   * Handle when an injured enemy reaches the pen
   * Stagger releases if multiple enemies are in the pen
   */
  handleEnemyReachedPen(enemy: Enemy) {
    const gameLogger = new Logger(LogGroup.GAME);

    // Count how many enemies are currently in the pen (respawning)
    const enemiesInPen = this.enemies.filter(e => e.isRespawning).length;

    // Calculate stagger delay: 1 second (1000ms) per enemy already in pen
    const staggerDelay = enemiesInPen * 1000;

    if (staggerDelay > 0) {
      gameLogger.log(`${enemy.type} reached pen. ${enemiesInPen} enemies already respawning. Adding ${staggerDelay}ms delay.`);
    }

    // Start respawn with calculated delay
    enemy.startRespawn(staggerDelay);

    // Update last respawn time
    this.lastRespawnTime = this.time.now;
  }

  setupInput() {
    // Get settings manager for key bindings (persisted in localStorage)
    const settingsManager = SettingsManager.getInstance();

    this.cursors = this.input.keyboard!.createCursorKeys();

    // Movement keys from settings
    this.wasd = this.input.keyboard!.addKeys({
      up: settingsManager.getUpKeyCode(),
      down: settingsManager.getDownKeyCode(),
      left: settingsManager.getLeftKeyCode(),
      right: settingsManager.getRightKeyCode()
    });

    // Fire key from settings
    this.fireKey = this.input.keyboard!.addKey(settingsManager.getFireKeyCode());

    // Pause key from settings
    this.pauseKey = this.input.keyboard!.addKey(settingsManager.getPauseKeyCode());

    // Pause key handler
    this.pauseKey.on('down', () => {
      this.togglePause();
    });

    this.muteKey = this.input.keyboard!.addKey(settingsManager.getMuteKeyCode());
    this.muteKey.on('down', () => {
      AudioManager.getInstance().toggleMasterMute();
    });

    // Gamepad pause button handler (Select button = button 8)
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === gameConfig.controls.gamepad.pause) {
        this.togglePause();
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPaused) {
        this.player.processPointerInput({ x: pointer.x, y: pointer.y });
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPaused && pointer.isDown && pointer.primaryDown) {
        // Clear queue and set new direction for drag
        this.player.inputQueue = [];
        this.player.processPointerInput({ x: pointer.x, y: pointer.y });
      }
    });

    // Set up developer mode key bindings
    this.setupDeveloperKeys();
  }
  
  createUI() {
    const devLogger = new Logger(LogGroup.DEVELOPER);

    const tileSize = this.getTileSize();
    this.mapWidth = gameConfig.map.width * tileSize;
    this.mapHeight = gameConfig.map.height * tileSize;

    const uiElements = this.uiRenderer.createUI(
      this.orientation,
      this.mapOffsetX,
      this.mapOffsetY,
      this.mapWidth,
      this.mapHeight,
      this.score,
      this.level,
      this.highScore,
      () => this.togglePause(),  // Pause button callback
      this.lives,  // Pass current lives count
      this.difficulty  // Pass difficulty for lives sprite count
    );

    this.scoreText = uiElements.scoreText;
    this.highScoreText = uiElements.highScoreText;
    this.livesText = uiElements.livesText;
    this.livesSprites = uiElements.livesSprites;
    this.levelText = uiElements.levelText;
    this.levelSprites = uiElements.levelSprites;
    this.powerText = uiElements.powerText;
    this.durationPieChart = uiElements.durationPieChart;
    this.cooldownBar = uiElements.cooldownBar;
    this.cooldownBarBg = uiElements.cooldownBarBg;

    // Initialize pause menu
    this.pauseMenu = new PauseMenu(
      this,
      this.localization,
      () => this.resumeGame(),
      () => this.quitToMenu()
    );

    const isDeveloperMode = DeveloperMode.getInstance().isEnabled();
    devLogger.log(`isEnabled: ${isDeveloperMode}`);
    HighScoreManager.setDeveloperMode(isDeveloperMode);

    
    // Create developer mode indicator (yellow asterisk in top left, outside map)
    if (isDeveloperMode) {
      this.developerIndicator = this.add.text(
        10,
        10,
        '*',
        {
          fontFamily: 'PressStart2P',
          fontSize: '48px',
          color: colorNumberToString(gameConfig.colors.developerIndicator),
        }
      ).setScrollFactor(0).setDepth(10002);
      devLogger.log('Indicator displayed');
    }
  }

  private isInitialized(): boolean {
    return !!(this.cursors && this.player && this.powerText);
  }

  private addScore(points: number): void {
    this.score += points;
    this.uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);
  }

  /**
   * Show "Get Ready!" text at the start of each level
   * Prevents player and enemy movement until the delay expires
   */
  private showGetReady(): void {
    const loc = this.localization;

    // Calculate center of screen
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Create the "Get Ready!" text with stroke (outline)
    this.getReadyText = this.add.text(centerX, centerY, loc.getText('getReady'), {
      fontFamily: 'PressStart2P',
      fontSize: '32px',
      color: colorNumberToString(gameConfig.colors.getReadyText),
      stroke: colorNumberToString(gameConfig.colors.getReadyOutline),
      strokeThickness: gameConfig.levelStart.getReadyOutlineThickness,
      align: 'center'
    });
    this.getReadyText.setOrigin(0.5);
    this.getReadyText.setScrollFactor(0);
    this.getReadyText.setDepth(10000);

    // Play the "Get Ready" music
    AudioManager.getInstance().playBackgroundMusic('getReady', false);

    // Set up timer to hide text and start game
    this.time.delayedCall(gameConfig.levelStart.getReadyDelay, () => {
      this.hideGetReady();
    });
  }

  /**
   * Hide "Get Ready!" text and start the game
   */
  private hideGetReady(): void {
    this.isGetReady = false;

    if (this.getReadyText) {
      this.getReadyText.destroy();
      this.getReadyText = null;
    }

    // Stop the "Get Ready" music and start game background music
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playBackgroundMusic('game', true);

    // Now schedule enemy releases since the game is starting
    this.scheduleNextEnemyRelease();
  }

  private getSceneRestartData(reset: boolean): {
    difficulty: string;
    orientation: Orientation;
    reset: boolean;
    score?: number;
    level?: number;
    lives?: number;
    currentPaletteIndex?: number;
  } {
    return {
      difficulty: this.difficulty,
      orientation: this.orientation,
      reset,
      score: reset ? undefined : this.score,
      level: reset ? undefined : this.level,
      lives: reset ? undefined : this.lives,
      currentPaletteIndex: reset ? undefined : this.currentPaletteIndex
    };
  }

  update(time: number, delta: number) {
    // Update performance monitoring
    this.performanceMonitor.update(delta);

    // Guard: Don't update until scene is fully initialized
    if (!this.isInitialized()) {
      return;
    }

    // Guard: Don't update game logic if game is over
    if (this.isGameOver) {
      return;
    }

    // Guard: Don't update game logic if paused
    if (this.isPaused) {
      return;
    }

    // Guard: Don't update game logic during "Get Ready" phase
    if (this.isGetReady) {
      return;
    }

    // Delegate keyboard input to player
    this.player.processKeyboardInput(this.cursors, this.wasd);

    // Handle fire key
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.player.activateFire();
    }

    // Delegate gamepad input to player
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.player.processGamepadInput(pad);

        // Get fire button from settings (supports both keyboard and gamepad bindings)
        const settingsManager = SettingsManager.getInstance();
        const fireButton = settingsManager.getFireGamepadButton();
        if (pad.buttons[fireButton] && pad.buttons[fireButton].pressed) {
          this.player.activateFire();
        }
      }
    }

    this.player.update(time, delta);

    // Only update enemies if AI is enabled (or developer mode is not active)
    if (this.enemyAIEnabled) {
      this.enemies.forEach(enemy => enemy.update(time, delta));
    }

    // Update bonus
    if (this.bonus && this.bonus.isActive()) {
      this.bonus.update(delta);
    }

    // Update tunnel cooldown
    if (this.tunnelCooldown > 0) {
      this.tunnelCooldown -= delta;
    }

    // Check tunnel teleportation
    this.checkTunnels();
    
    const px = this.player.gridX;
    const py = this.player.gridY;

    // Check if there's a pellet on the current tile and player is close enough to eat it
    if (this.pellets[py] && this.pellets[py][px]) {
      const pellet = this.pellets[py][px];
      const tileSize = this.getTileSize();

      // Calculate pellet center and player position
      const pelletCenter = {
        x: this.mapOffsetX + px * tileSize + tileSize / 2,
        y: this.mapOffsetY + py * tileSize + tileSize / 2
      };
      const playerPos = {
        x: this.player.sprite.x,
        y: this.player.sprite.y
      };

      // Check if player can eat the pellet
      if (canEatPellet(pelletCenter, playerPos, tileSize)) {
        const isPower = pellet instanceof Phaser.GameObjects.Sprite && this.powerups.includes(pellet);

        pellet.destroy();
        this.pellets[py][px] = null as any;

        if (isPower) {
          this.addScore(gameConfig.map.powerup.score);
          this.player.giveFirePower();
          // Play powerup collect sound effect
          AudioManager.getInstance().playSoundEffect('powerupCollect');
          this.uiRenderer.updatePowerText(
            this.powerText,
            this.orientation,
            true,
            false,
            0,
            0,
            this.durationPieChart,
            this.cooldownBar,
            this.cooldownBarBg,
            this.mapOffsetX,
            this.mapOffsetY,
            this.mapWidth,
            this.mapHeight,
            this.player.getDifficulty()
          );
        } else {
          this.addScore(gameConfig.map.pellet.score);
          this.pelletsEaten++;

          // Start pellet eating sound if not already playing
          if (!this.isEatingPellet) {
            this.isEatingPellet = true;
            AudioManager.getInstance().startLoopingSoundEffect('pelletEat');
          }
          this.lastPelletEatTime = this.time.now;

          // Check if bonus should spawn
          this.checkBonusSpawn();
        }

        this.checkWinCondition();
      }
    }

    // Check bonus collection
    this.checkBonusCollection();

    this.checkEnemyCollision();

    this.uiRenderer.updatePowerText(
      this.powerText,
      this.orientation,
      this.player.hasFirePower,
      this.player.fireActive,
      this.player.getRemainingPowerDuration(),
      this.player.getFireCooldown(),
      this.durationPieChart,
      this.cooldownBar,
      this.cooldownBarBg,
      this.mapOffsetX,
      this.mapOffsetY,
      this.mapWidth,
      this.mapHeight,
      this.player.getDifficulty()
    );

    // Check if pellet eating sound should stop
    if (this.isEatingPellet && this.time.now - this.lastPelletEatTime > this.pelletEatSoundTimeout) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }
  }
  
  checkTunnels() {
    // Check player tunnels (only if cooldown expired)
    if (this.tunnelCooldown <= 0) {
      for (const tunnel of this.mapData.tunnels) {
        if (this.player.gridX === tunnel.location.x && this.player.gridY === tunnel.location.y) {
          this.player.moveTo(tunnel.target.x, tunnel.target.y);
          this.tunnelCooldown = gameConfig.map.tunnelCooldown;
          break; // Only teleport once per frame
        }
      }
    }

    // Check enemy tunnels
    for (const enemy of this.enemies) {
      for (const tunnel of this.mapData.tunnels) {
        if (enemy.gridX === tunnel.location.x && enemy.gridY === tunnel.location.y) {
          enemy.moveTo(tunnel.target.x, tunnel.target.y);
          break; // Only teleport once per frame per enemy
        }
      }
    }
  }
  
  checkEnemyCollision() {
    const gameLogger = new Logger(LogGroup.GAME);
    // Skip collision detection if player is dying or invulnerable
    if (this.player.isDying || this.player.isInvulnerable) {
      return;
    }

    const collisionResult = this.player.checkEnemyCollisions(this.enemies);

    if (collisionResult.hasCollision) {
      if (collisionResult.hitByFire && collisionResult.enemy) {
        // Check if enemy is already injured - don't score again
        if (collisionResult.enemy.isInjured) {
          return; // Already injured, no additional scoring
        }

        // Check if enemy is fire-resistant (Stingy in Sterile Mode)
        const enemy = collisionResult.enemy as any;
        if (enemy.isFireResistant) {
          gameLogger.log('Enemy is fire-resistant! Fire has no effect.');
          return; // Fire has no effect
        }

        // Enemy was hit by fire - injure them
        const currentTime = this.time.now;

        // Check if combo timer has expired (more than 10 seconds since last injury)
        if (currentTime - this.lastInjuryTime > gameConfig.player.injuryComboResetTime) {
          this.injuryComboCount = 0;
        }

        // Capture enemy position before injuring (sprite may move)
        const enemyX = collisionResult.enemy.sprite.x;
        const enemyY = collisionResult.enemy.sprite.y;

        // Calculate score based on combo count using fixed array
        const scores = gameConfig.enemy.injuryScores;
        const scoreIndex = Math.min(this.injuryComboCount, scores.length - 1);
        const injuryScore = scores[scoreIndex];
        this.addScore(injuryScore);

        // Show floating score at enemy location
        this.showInjuryScore(enemyX, enemyY, injuryScore);

        // Increment combo count (capped at array length - 1)
        if (this.injuryComboCount < scores.length - 1) {
          this.injuryComboCount++;
        }

        // Update last injury time
        this.lastInjuryTime = currentTime;

        gameLogger.log(`Enemy injured! Score +${injuryScore}, Combo: ${this.injuryComboCount}`);

        // Play enemy hit sound effect
        AudioManager.getInstance().playSoundEffect('enemyHit');

        // Injure the enemy (changes to gray, pathfinds to pen)
        collisionResult.enemy.injure();
      } else {
        // Player collided with enemy - only lose life if enemy is not injured
        if (!collisionResult.enemy?.isInjured) {
          this.loseLife();
        }
      }
    }
  }

  /**
   * Count remaining pellets on the map
   */
  countRemainingPellets(): number {
    let count = 0;
    for (let y = 0; y < this.pellets.length; y++) {
      for (let x = 0; x < this.pellets[y].length; x++) {
        if (this.pellets[y][x] && this.pellets[y][x].visible) {
          count++;
        }
      }
    }
    return count;
  }
  
  checkBonusSpawn() {
    // Check if we should spawn the bonus
    if (this.currentBonusAppearance < this.bonusAppearances.length &&
        this.pelletsEaten >= this.bonusAppearances[this.currentBonusAppearance]) {
      this.spawnBonus();
      this.currentBonusAppearance++;
    }
  }

  spawnBonus() {
    // Don't spawn if bonus is already active
    if (this.bonus && this.bonus.isActive()) {
      return;
    }

    const tileSize = this.getTileSize();
    const bonusSpeed = calculateScaledSpeed(gameConfig.map.bonus.speed, this.difficulty, tileSize);

    this.bonus = new Bonus(this, this.bonusData, tileSize, this.mapOffsetX, this.mapOffsetY, this.mapData, bonusSpeed);

    Logger.logStatic(LogGroup.BONUS, `Spawned bonus #${this.currentBonusAppearance + 1}`);
  }

  checkBonusCollection() {
    const bonusLogger = new Logger(LogGroup.BONUS);

    if (!this.bonus || !this.bonus.isActive()) {
      return;
    }

    // Collision occurs when the edge of the bonus sprite reaches the center of the player's tile
    // Bonus sprites are scaled to 2.2x tile size (from gameConfig.map.bonus.scale)
    // Using threshold of 1.0 for consistent gameplay feel with other collision types
    if (this.player.checkCollision(this.bonus, 1.0)) {
      // Capture position and score before collecting (which destroys the sprite)
      const bonusX = this.bonus.sprite.x;
      const bonusY = this.bonus.sprite.y;
      const bonusScore = this.bonus.score;

      // Collect bonus
      this.bonus.collect();
      this.addScore(bonusScore);

      // Play bonus collect sound effect
      AudioManager.getInstance().playSoundEffect('bonusCollect');

      bonusLogger.log(`Collected! Score +${bonusScore}, New total: ${this.score}`);

      // Show floating score sprite at the bonus location
      this.showFloatingScore(bonusX, bonusY, bonusScore);

      // Clean up bonus
      this.bonus = null;
    }
  }

  /**
   * Display a floating score sprite at the given position that fades away
   */
  showFloatingScore(x: number, y: number, score: number): void {
    const config = gameConfig.map.bonus.scoreDisplay;

    // Create the score sprite using the points_${score}.png pattern
    const scoreSprite = this.add.sprite(x, y, 'atlas', `points_${score}.png`);
    scoreSprite.setScale(config.spriteScale);
    scoreSprite.setDepth(1000); // Ensure it's above other game elements

    // After visibleDuration, start fade out
    this.time.delayedCall(config.visibleDuration, () => {
      this.tweens.add({
        targets: scoreSprite,
        alpha: 0,
        duration: config.fadeDuration,
        ease: 'Power2',
        onComplete: () => {
          scoreSprite.destroy();
        }
      });
    });
  }

  /**
   * Display a floating injury score sprite at the given position that fades away
   */
  showInjuryScore(x: number, y: number, score: number): void {
    const config = gameConfig.enemy.injuryScoreDisplay;

    // Create the score sprite using the d_points_${score}.png pattern
    const scoreSprite = this.add.sprite(x, y, 'atlas', `d_points_${score}.png`);
    scoreSprite.setScale(config.spriteScale);
    scoreSprite.setDepth(1000); // Ensure it's above other game elements

    // After visibleDuration, start fade out
    this.time.delayedCall(config.visibleDuration, () => {
      this.tweens.add({
        targets: scoreSprite,
        alpha: 0,
        duration: config.fadeDuration,
        ease: 'Power2',
        onComplete: () => {
          scoreSprite.destroy();
        }
      });
    });
  }

  checkWinCondition() {
    if (this.countRemainingPellets() === 0) {
      this.nextLevel();
    }
  }
  
  async loseLife() {
    this.lives--;
    //this.uiRenderer.updateLivesText(this.livesText, this.orientation, this.lives);
    this.uiRenderer.updateLivesSprites(this.livesSprites, this.orientation, this.lives);

    // Stop pellet eating sound
    if (this.isEatingPellet) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }

    // Stop game background music and play death sound effect
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playSoundEffect('playerDeath');

    // Remove bonus if it's currently on screen
    if (this.bonus && this.bonus.isActive()) {
      this.bonus.cleanup();
      Logger.logStatic(LogGroup.BONUS, 'Removed due to player death');
    }

    // Immediately reset enemies to starting positions and hide them
    this.enemies.forEach(enemy => {
      enemy.pause();
      enemy.resetToStart();
      enemy.hide();
    });

    // Play death animation
    await this.player.playDeathAnimation();

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.resetPositions();
    }
  }

  resetPositions() {
    // Reset player to starting position
    this.player.reset(this.mapData.playerStart.x, this.mapData.playerStart.y);

    // Show enemies (they were already reset to start in loseLife)
    this.enemies.forEach(enemy => {
      enemy.show();
    });

    // Restart game background music
    AudioManager.getInstance().playBackgroundMusic('game', true);

    // Restart staggered release
    this.enemiesReleased = 0;
    this.scheduleNextEnemyRelease();
  }
  
  nextLevel() {
    this.level++;

    // Stop pellet eating sound
    if (this.isEatingPellet) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }

    // Stop game background music and play level complete sound
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playSoundEffect('levelComplete');

    // Reset player powerup state before moving to next level
    if (this.player) {
      this.player.deactivateFire();
      this.player.hasFirePower = false;
    }

    this.scene.restart(this.getSceneRestartData(false));
  }
  
  togglePause(): void {
    // Don't allow pausing during game over
    if (this.isGameOver) {
      return;
    }

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame(): void {
    this.isPaused = true;

    // Pause all Phaser timers
    this.time.paused = true;

    // Show pause menu
    this.pauseMenu.show();
  }

  resumeGame(): void {
    this.isPaused = false;

    // Resume all Phaser timers
    this.time.paused = false;

    // Hide pause menu
    this.pauseMenu.hide();
  }

  quitToMenu(): void {
    // Clean up pause state
    this.isPaused = false;
    this.time.paused = false;

    // Return to menu scene
    this.scene.start('MenuScene');
  }

  gameOver() {
    const loc = this.localization;
    this.isGameOver = true;

    // Stop any playing audio (music already stopped in loseLife, but ensure cleanup)
    AudioManager.getInstance().stopBackgroundMusic();

    // Clear all timers immediately to prevent duplicate enemy releases on restart
    this.time.removeAllEvents();

    // Check if this score qualifies as a high score
    const isDeveloperMode = DeveloperMode.getInstance().isEnabled();
    const isNewHighScore = HighScoreManager.isHighScore(this.score, this.difficulty) && !isDeveloperMode;

    if (isNewHighScore) {
      // Show high score entry overlay
      this.highScoreEntryOverlay = new HighScoreEntryOverlay(
        this,
        this.localization,
        this.score,
        this.difficulty,
        (name: string) => this.handleHighScoreSave(name),
        () => this.showNormalGameOver()
      );
      this.highScoreEntryOverlay.show();
    } else {
      // Show normal game over screen
      this.showNormalGameOver();
    }
  }

  private handleHighScoreSave(name: string): void {
    // Save the high score
    HighScoreManager.addHighScore(this.score, name, this.difficulty);

    // Go to main menu after saving high score
    this.scene.start('MenuScene');
  }

  private showNormalGameOver(): void {
    const loc = this.localization;

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `${loc.getText('gameOver')}\n\n${loc.getText('clickToRestart')}`,
      {
        fontFamily: 'PressStart2P',
        fontSize: '32px',
        color: '#fff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // Set up click to restart
    this.input.once('pointerdown', () => {
      this.scene.restart(this.getSceneRestartData(true));
    });

    // Set up Continue key to restart (from settings)
    const settingsManager = SettingsManager.getInstance();
    const continueKey = this.input.keyboard?.addKey(settingsManager.getContinueKeyCode());
    if (continueKey) {
      continueKey.once('down', () => {
        this.scene.restart(this.getSceneRestartData(true));
      });
    }
  }

  shutdown() {
    // Remove all timed events to prevent them from firing after scene restart
    this.time.removeAllEvents();

    // Stop any playing audio
    if (this.isEatingPellet) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }
    AudioManager.getInstance().stopBackgroundMusic();

    // Clean up pause menu
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
    }

    // Clean up high score entry overlay
    if (this.highScoreEntryOverlay) {
      this.highScoreEntryOverlay.destroy();
      this.highScoreEntryOverlay = null;
    }

    // Clean up get ready text
    if (this.getReadyText) {
      this.getReadyText.destroy();
      this.getReadyText = null;
    }

    // Clean up developer keydown handler
    if (this.devKeydownHandler) {
      window.removeEventListener('keydown', this.devKeydownHandler);
      this.devKeydownHandler = null;
    }

    // Reset pause state
    this.isPaused = false;
    this.time.paused = false;

    // Clean up map renderer and texture
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }

    // Clean up player
    if (this.player) {
      this.player.cleanup();
    }

    // Clean up enemies
    if (this.enemies) {
      this.enemies.forEach(enemy => {
        enemy.cleanup();
      });
    }

    // Clean up pellets
    if (this.pellets) {
      for (let y = 0; y < this.pellets.length; y++) {
        for (let x = 0; x < this.pellets[y].length; x++) {
          if (this.pellets[y][x]) {
            this.pellets[y][x].destroy();
          }
        }
      }
    }

    // Clean up powerups
    if (this.powerups) {
      this.powerups.forEach(powerup => {
        if (powerup) {
          powerup.destroy();
        }
      });
    }

    // Clean up bonus
    if (this.bonus) {
      this.bonus.cleanup();
      this.bonus = null;
    }

    // Clean up map rectangles (pen interiors and tunnels)
    if (this.mapRectangles) {
      this.mapRectangles.forEach(rect => {
        if (rect) {
          rect.destroy();
        }
      });
    }

    // Clean up UI text elements
    if (this.scoreText) this.scoreText.destroy();
    if (this.highScoreText) this.highScoreText.destroy();
    if (this.livesText) this.livesText.destroy();
    if (this.levelText) this.levelText.destroy();
    if (this.powerText) this.powerText.destroy();

    // Clean up developer indicator if it exists
    if (this.developerIndicator) {
      this.developerIndicator.destroy();
    }

    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  /**
   * Set up developer mode key bindings
   * Only active when developer mode is enabled
   */
  private setupDeveloperKeys(): void {
    const devLogger = new Logger(LogGroup.DEVELOPER);

    // ! (Shift+1) - Reset high scores for current difficulty (uses DOM event for shifted key)
    // Set up before keyboard check since this uses DOM events
    this.devKeydownHandler = (event: KeyboardEvent) => {
      if (event.key === '!' && DeveloperMode.getInstance().isEnabled()) {
        // this.difficulty is already the lowercase string value from the Difficulty enum
        HighScoreManager.clearHighScores(this.difficulty);
        devLogger.log(`High scores cleared for ${this.difficulty} difficulty`);
      }
    };
    window.addEventListener('keydown', this.devKeydownHandler);

    if (!this.input.keyboard) return;

    // Create developer key bindings
    this.devKeys = {
      toggleAI: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.toggleEnemyAI as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      clearPellets: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.clearPellets as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      killPlayer: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.killPlayer as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      activatePowerup: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.activatePowerup as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      reloadBrowser: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.reloadBrowser as keyof typeof Phaser.Input.Keyboard.KeyCodes])
    };

    // Q - Toggle enemy AI
    this.devKeys.toggleAI.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        this.enemyAIEnabled = !this.enemyAIEnabled;
        devLogger.log(`Enemy AI ${this.enemyAIEnabled ? 'ENABLED' : 'DISABLED'}`);
      }
    });

    // Z - Clear all pellets except 3 below pen center (for testing level progression)
    this.devKeys.clearPellets.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        const tileSize = this.getTileSize();
        const penCenterX = this.mapData.penCenter.x;
        const penCenterY = this.mapData.penCenter.y;

        // Define the 3 pellet positions below pen center
        // Position them 3 rows below center (safely below the pen walls)
        const preservedPellets = [
          { x: penCenterX - 1, y: penCenterY + 3 },
          { x: penCenterX, y: penCenterY + 3 },
          { x: penCenterX + 1, y: penCenterY + 3 }
        ];

        // Clear all pellets except the preserved ones
        this.pellets.forEach((row, y) => {
          row.forEach((pellet, x) => {
            const isPreserved = preservedPellets.some(p => p.x === x && p.y === y);
            if (pellet && pellet.active && !isPreserved) {
              pellet.destroy();
            }
          });
        });

        // Spawn preserved pellets if they don't exist or were eaten
        preservedPellets.forEach(pos => {
          const existingPellet = this.pellets[pos.y]?.[pos.x];
          if (!existingPellet || !existingPellet.active) {
            // Ensure the row exists
            if (!this.pellets[pos.y]) {
              this.pellets[pos.y] = [];
            }

            // Create new pellet
            const pellet = this.add.circle(
              this.mapOffsetX + pos.x * tileSize + tileSize / 2,
              this.mapOffsetY + pos.y * tileSize + tileSize / 2,
              tileSize * gameConfig.map.pellet.size,
              gameConfig.colors.pellet
            );
            this.pellets[pos.y][pos.x] = pellet;
          }
        });

        devLogger.log('Pellets cleared except 3 below pen center for level progression testing');
      }
    });

    // K - Kill player
    this.devKeys.killPlayer.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        devLogger.log('Killing player');
        this.player.playDeathAnimation();
      }
    });

    // P - Activate powerup
    this.devKeys.activatePowerup.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        devLogger.log('Activating powerup');
        this.player.giveFirePower();
        this.uiRenderer.updatePowerText(
          this.powerText,
          this.orientation,
          this.player.hasFirePower,
          this.player.fireActive,
          0,
          0,
          this.durationPieChart,
          this.cooldownBar,
          this.cooldownBarBg,
          this.mapOffsetX,
          this.mapOffsetY,
          this.mapWidth,
          this.mapHeight,
          this.player.getDifficulty()
        );
      }
    });

    // R - Reload Browser
    this.devKeys.reloadBrowser.on('down', () => {
      if(DeveloperMode.getInstance().isEnabled()) {
        devLogger.log('Reloading Browser');
        window.location.reload();
      }
    });
  }
}