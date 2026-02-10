import Phaser from 'phaser';
import { Enemy } from '../entities/enemies/Enemy';
import { MapGeneratorV2 } from '../utils/MapGeneratorV2';
import { MapRenderer } from '../utils/MapRenderer';
import { UIRenderer } from '../ui/UIRenderer';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { HighScoreManager } from '../utils/HighScoreManager';
import { colorNumberToString } from '../utils/utils';
import { IMapData } from '../interfaces/IMapData';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { PauseMenu } from '../ui/PauseMenu';
import { HighScoreEntryOverlay } from '../ui/HighScoreEntryOverlay';
import { mapColorPalettes, getRandomPaletteIndex, IMapColorPalette, defaultPalette } from '../config/mapColorPalettes';
import { DeveloperMode } from '../utils/DeveloperMode';
import { Difficulty } from '../enums/Difficulty';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';
import { SettingsManager } from '../utils/SettingsManager';
import { AudioManager, SoundEffect } from '../utils/AudioManager';
import { GameStateManager } from '../managers/GameStateManager';
import { InputManager } from '../managers/InputManager';
import { EntityManager } from '../managers/EntityManager';
import { CollisionManager } from '../managers/CollisionManager';
import { LevelManager } from '../managers/LevelManager';
import { ICollisionContext } from '../interfaces/ICollisionContext';
import { TouchControls } from '../ui/TouchControls';
import { Direction } from '../enums/Direction';

export class GameScene extends Phaser.Scene {
  // Managers
  gameState!: GameStateManager;
  inputManager!: InputManager;
  entityManager!: EntityManager;
  collisionManager!: CollisionManager;
  levelManager!: LevelManager;

  mapData!: IMapData;
  difficulty: Difficulty = Difficulty.MEDIUM;
  orientation: Orientation = Orientation.HORIZONTAL;
  localization!: LocalizationManager;
  uiRenderer!: UIRenderer;
  performanceMonitor!: PerformanceMonitor;
  mapRenderer: MapRenderer | null = null;
  mapOffsetX: number = 0;
  mapOffsetY: number = 0;
  mapWidth: number = 0;
  mapHeight: number = 0;
  getReadyText: Phaser.GameObjects.Text | null = null;
  pauseMenu!: PauseMenu;
  highScoreEntryOverlay: HighScoreEntryOverlay | null = null;
  currentPaletteIndex: number = -1;
  currentPalette!: IMapColorPalette;
  developerIndicator!: Phaser.GameObjects.Text;
  enemyAIEnabled: boolean = true;

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

  touchControls: TouchControls | null = null;
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

    // Initialize GameStateManager
    if (data.reset) {
      // Full reset - start new game
      this.gameState = new GameStateManager(this, this.difficulty, 1, 0, undefined, {
        onScoreChanged: (score, highScore) => {
          if (this.scoreText) this.uiRenderer.updateScoreText(this.scoreText, this.orientation, score);
          if (this.highScoreText && score > highScore) this.uiRenderer.updateHighScoreText(this.highScoreText, this.orientation, score);
        },
        onLivesChanged: (lives) => {
          if (this.livesSprites) this.uiRenderer.updateLivesSprites(this.livesSprites, this.orientation, lives);
        }
      });
      this.currentPaletteIndex = -1; // Reset palette
    } else {
      // Level transition - preserve game state
      const level = data.level ?? 1;
      const score = data.score ?? 0;
      const lives = data.lives ?? gameConfig.player.startLives[this.difficulty as keyof typeof gameConfig.player.startLives];
      this.gameState = new GameStateManager(this, this.difficulty, level, score, lives, {
        onScoreChanged: (newScore, highScore) => {
          if (this.scoreText) this.uiRenderer.updateScoreText(this.scoreText, this.orientation, newScore);
          if (this.highScoreText && newScore > highScore) this.uiRenderer.updateHighScoreText(this.highScoreText, this.orientation, newScore);
        },
        onLivesChanged: (newLives) => {
          if (this.livesSprites) this.uiRenderer.updateLivesSprites(this.livesSprites, this.orientation, newLives);
        }
      });
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
    const level = this.gameState.getLevel();
    // Calculate which palette group this level belongs to (changes every 2 levels)
    // Group 0: levels 1-2, Group 1: levels 3-4, Group 2: levels 5-6, etc.
    const currentPaletteGroup = Math.floor((level - 1) / 2);

    // Levels 1 & 2 always use the default palette
    if (level <= 2) {
      this.currentPaletteIndex = 0; // Default palette is at index 0
      this.currentPalette = defaultPalette;
      paletteLogger.log(`Level ${level} (Group ${currentPaletteGroup}): Using DEFAULT palette`);
      return;
    }

    // For levels 3+: Check if we need to change palette (only on odd levels: 3, 5, 7, etc.)
    const shouldChangePalette = (level - 1) % 2 === 0;

    if (shouldChangePalette || this.currentPaletteIndex === -1) {
      // Select a new random palette different from the current one
      this.currentPaletteIndex = getRandomPaletteIndex(this.currentPaletteIndex);
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      paletteLogger.log(`Level ${level} (Group ${currentPaletteGroup}): Selected NEW palette ${this.currentPaletteIndex}`);
    } else {
      // Keep the same palette
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      paletteLogger.log(`Level ${level} (Group ${currentPaletteGroup}): Keeping palette ${this.currentPaletteIndex}`);
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

    // On touch devices in vertical mode, ensure enough space above the map for UI
    if (TouchControls.isTouchDevice() && this.orientation === Orientation.VERTICAL)
      this.mapOffsetY = Math.max(this.mapOffsetY, gameConfig.ui.minTopMargin);
  }

  async create() {
    // Force black background on both camera and game canvas
    this.cameras.main.setBackgroundColor('#000000');
    if (this.game.canvas) {
      this.game.canvas.style.backgroundColor = '#000000';
    }

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

    // Create LevelManager
    this.levelManager = new LevelManager(
      this.mapData,
      this.mapOffsetX,
      this.mapOffsetY,
      tileSize,
      {
        onPelletCollected: (isPowerup, score) => this.handlePelletCollected(isPowerup, score),
        onWinCondition: () => this.nextLevel()
      }
    );
    this.levelManager.setPellets(pellets, powerups);

    // Create EntityManager
    this.entityManager = new EntityManager(
      this,
      this.mapData,
      this.difficulty,
      tileSize,
      this.mapOffsetX,
      this.mapOffsetY,
      {
        onEnemyReachedPen: (enemy) => this.handleEnemyReachedPen(enemy)
      }
    );

    // Create entities
    this.entityManager.createPlayer();
    this.entityManager.createEnemies(this.gameState.getLevel());
    this.entityManager.initializeBonus(this.gameState.getLevel());

    // Create CollisionManager
    this.collisionManager = new CollisionManager({
      onPlayerDeath: () => {}, // loseLife handles this
      onEnemyInjured: () => {}, // Handled inline in collision check
      onBonusCollected: () => {
        // Clean up bonus reference after collection
        this.entityManager.bonus = null;
      }
    });

    // Enable multi-touch for virtual controls (D-Pad + Fire simultaneously)
    this.input.addPointer(1);

    this.setupInput();
    this.createUI();
    this.showGetReady();
  }

  /**
   * Handle when an injured enemy reaches the pen
   * Stagger releases if multiple enemies are in the pen
   */
  handleEnemyReachedPen(enemy: Enemy) {
    const gameLogger = new Logger(LogGroup.GAME);

    // Count how many enemies are currently in the pen (respawning)
    const enemiesInPen = this.entityManager.enemies.filter(e => e.isRespawning).length;

    // Calculate stagger delay: 1 second (1000ms) per enemy already in pen
    const staggerDelay = enemiesInPen * 1000;

    if (staggerDelay > 0)
      gameLogger.log(`${enemy.type} reached pen. ${enemiesInPen} enemies already respawning. Adding ${staggerDelay}ms delay.`);

    // Start respawn with calculated delay
    enemy.startRespawn(staggerDelay);
  }

  setupInput() {
    const devLogger = new Logger(LogGroup.DEVELOPER);

    this.inputManager = new InputManager(
      this,
      {
        onTogglePause: () => this.togglePause(),
        onPointerInput: (x, y) => this.entityManager.player.processPointerInput({ x, y }),
        onPointerDrag: (x, y) => {
          this.entityManager.player.inputQueue = [];
          this.entityManager.player.processPointerInput({ x, y });
        },
        onFirePressed: () => this.entityManager.player.activateFire(),
        // Developer mode callbacks
        onToggleEnemyAI: () => {
          this.enemyAIEnabled = !this.enemyAIEnabled;
          devLogger.log(`Enemy AI ${this.enemyAIEnabled ? 'ENABLED' : 'DISABLED'}`);
        },
        onClearPellets: () => this.devClearPellets(),
        onKillPlayer: () => {
          devLogger.log('Killing player');
          this.entityManager.player.playDeathAnimation();
        },
        onActivatePowerup: () => {
          devLogger.log('Activating powerup');
          this.entityManager.player.giveFirePower();
          this.uiRenderer.updatePowerText(
            this.powerText,
            this.orientation,
            this.entityManager.player.hasFirePower,
            this.entityManager.player.fireActive,
            0,
            0,
            this.durationPieChart,
            this.cooldownBar,
            this.cooldownBarBg,
            this.mapOffsetX,
            this.mapOffsetY,
            this.mapWidth,
            this.mapHeight,
            this.entityManager.player.getDifficulty()
          );
        },
        onClearHighScores: () => {
          HighScoreManager.clearHighScores(this.difficulty);
          devLogger.log(`High scores cleared for ${this.difficulty} difficulty`);
        }
      },
      () => this.gameState.isPaused()
    );
    this.inputManager.setup();
  }

  /**
   * Developer helper: Clear all pellets except 3 below pen center
   */
  private devClearPellets(): void {
    const devLogger = new Logger(LogGroup.DEVELOPER);
    const tileSize = this.getTileSize();
    const penCenterX = this.mapData.penCenter.x;
    const penCenterY = this.mapData.penCenter.y;
    const pellets = this.levelManager.pellets;

    // Define the 3 pellet positions below pen center
    const preservedPellets = [
      { x: penCenterX - 1, y: penCenterY + 3 },
      { x: penCenterX, y: penCenterY + 3 },
      { x: penCenterX + 1, y: penCenterY + 3 }
    ];

    // Clear all pellets except the preserved ones
    pellets.forEach((row, y) => {
      row.forEach((pellet, x) => {
        const isPreserved = preservedPellets.some(p => p.x === x && p.y === y);
        if (pellet && pellet.active && !isPreserved) {
          pellet.destroy();
          row[x] = null as any;
        }
      });
    });

    // Spawn preserved pellets if they don't exist or were eaten
    preservedPellets.forEach(pos => {
      const existingPellet = pellets[pos.y]?.[pos.x];
      if (!existingPellet || !existingPellet.active) {
        if (!pellets[pos.y])
          pellets[pos.y] = [];

        const pellet = this.add.circle(
          this.mapOffsetX + pos.x * tileSize + tileSize / 2,
          this.mapOffsetY + pos.y * tileSize + tileSize / 2,
          tileSize * gameConfig.map.pellet.size,
          gameConfig.colors.pellet
        );
        pellets[pos.y][pos.x] = pellet;
      }
    });

    devLogger.log('Pellets cleared except 3 below pen center for level progression testing');
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
      this.gameState.getScore(),
      this.gameState.getLevel(),
      this.gameState.getHighScore(),
      () => this.togglePause(),  // Pause button callback
      this.gameState.getLives(),  // Pass current lives count
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

    this.createTouchControls();
  }

  private createTouchControls(): void {
    if (!TouchControls.isTouchDevice()) return;

    this.touchControls = new TouchControls(this, {
      onDirectionInput: (dir: Direction) => {
        this.entityManager.player.processInput({ direction: dir });
      },
      onFirePressed: () => {
        this.entityManager.player.activateFire();
      }
    });

    this.touchControls.create(
      this.orientation,
      this.mapOffsetX,
      this.mapOffsetY,
      this.mapWidth,
      this.mapHeight
    );

    this.inputManager.setPointerFilter(
      (pointer) => this.touchControls!.isPointerOnControls(pointer)
    );
  }

  private isInitialized(): boolean {
    return !!(this.inputManager && this.entityManager && this.levelManager && this.collisionManager && this.powerText);
  }

  private addScore(points: number): void {
    this.gameState.addScore(points);
    // UI update is handled by GameStateManager callback
  }

  /**
   * Handle pellet collection event from LevelManager
   */
  private handlePelletCollected(isPowerup: boolean, score: number): void {
    const player = this.entityManager.player;

    this.addScore(score);

    if (isPowerup) {
      player.giveFirePower();
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
        player.getDifficulty()
      );
    } else {
      this.gameState.incrementPelletsEaten();

      // Start pellet eating sound if not already playing
      if (!this.isEatingPellet) {
        this.isEatingPellet = true;
        AudioManager.getInstance().startLoopingSoundEffect('pelletEat');
      }
      this.lastPelletEatTime = this.time.now;

      // Check if bonus should spawn
      this.entityManager.checkBonusSpawn(this.gameState.getPelletsEaten());
    }
  }

  /**
   * Create collision context for collision manager
   */
  private createCollisionContext(): ICollisionContext {
    return {
      gameState: this.gameState,
      time: this.time.now,
      addScore: (points) => this.addScore(points),
      showFloatingScore: (x, y, score) => this.showFloatingScore(x, y, score),
      showInjuryScore: (x, y, score) => this.showInjuryScore(x, y, score),
      playSound: (sound) => AudioManager.getInstance().playSoundEffect(sound),
      loseLife: () => this.loseLife()
    };
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
    this.gameState.setGetReady(false);

    if (this.getReadyText) {
      this.getReadyText.destroy();
      this.getReadyText = null;
    }

    // Stop the "Get Ready" music and start game background music
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playBackgroundMusic('game', true);

    // Now schedule enemy releases since the game is starting
    this.entityManager.scheduleNextEnemyRelease();
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
      score: reset ? undefined : this.gameState.getScore(),
      level: reset ? undefined : this.gameState.getLevel(),
      lives: reset ? undefined : this.gameState.getLives(),
      currentPaletteIndex: reset ? undefined : this.currentPaletteIndex
    };
  }

  update(time: number, delta: number) {
    // Update performance monitoring
    this.performanceMonitor.update(delta);

    // Guard: Don't update until scene is fully initialized
    if (!this.isInitialized())
      return;

    // Guard: Don't update game logic if game is over
    if (this.gameState.isGameOver())
      return;

    // Guard: Don't update game logic if paused
    if (this.gameState.isPaused())
      return;

    // Guard: Don't update game logic during "Get Ready" phase
    if (this.gameState.isGetReady())
      return;

    // Process input (fire key checking is handled via callback)
    this.inputManager.update();

    const player = this.entityManager.player;

    // Delegate keyboard input to player
    player.processKeyboardInput(this.inputManager.cursors, this.inputManager.wasd);

    // Delegate gamepad input to player
    const pad = this.inputManager.getGamepad();
    if (pad)
      player.processGamepadInput(pad);

    // Process touch control input
    if (this.touchControls)
      this.touchControls.update();

    // Update all entities
    this.entityManager.updateAll(time, delta, this.enemyAIEnabled);

    // Update tunnel cooldown and check teleportation
    this.levelManager.updateTunnelCooldown(delta);
    this.levelManager.checkTunnels(player, this.entityManager.enemies);

    // Check pellet collection
    const pelletResult = this.levelManager.checkPelletCollection(player);
    if (pelletResult && pelletResult.collected)
      this.levelManager.checkWinCondition();

    // Check bonus collection using CollisionManager
    const context = this.createCollisionContext();
    this.collisionManager.checkBonusCollection(player, this.entityManager.bonus, context);

    // Check enemy collision using CollisionManager
    this.collisionManager.checkEnemyCollision(player, this.entityManager.enemies, context);

    // Update power UI
    this.uiRenderer.updatePowerText(
      this.powerText,
      this.orientation,
      player.hasFirePower,
      player.fireActive,
      player.getRemainingPowerDuration(),
      player.getFireCooldown(),
      this.durationPieChart,
      this.cooldownBar,
      this.cooldownBarBg,
      this.mapOffsetX,
      this.mapOffsetY,
      this.mapWidth,
      this.mapHeight,
      player.getDifficulty()
    );

    // Update touch control fire button state
    if (this.touchControls)
      this.touchControls.updateFireButtonState(player.hasFirePower, player.fireActive);

    // Check if pellet eating sound should stop
    if (this.isEatingPellet && this.time.now - this.lastPelletEatTime > this.pelletEatSoundTimeout) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
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

  async loseLife() {
    const remainingLives = this.gameState.loseLife();

    // Stop pellet eating sound
    if (this.isEatingPellet) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }

    // Stop game background music and play death sound effect
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playSoundEffect('playerDeath');

    // Remove bonus if it's currently on screen
    this.entityManager.removeBonus();

    // Immediately reset enemies to starting positions and hide them
    this.entityManager.pauseAndHideEnemies();

    // Play death animation
    await this.entityManager.player.playDeathAnimation();

    if (remainingLives <= 0) {
      this.gameOver();
    } else {
      this.resetPositions();
    }
  }

  resetPositions() {
    // Reset player to starting position
    this.entityManager.resetPlayer();

    // Show enemies (they were already reset to start in loseLife)
    this.entityManager.showEnemies();

    // Restart game background music
    AudioManager.getInstance().playBackgroundMusic('game', true);

    // Restart staggered release
    this.entityManager.restartEnemyRelease();
  }

  nextLevel() {
    this.gameState.nextLevel();

    // Stop pellet eating sound
    if (this.isEatingPellet) {
      this.isEatingPellet = false;
      AudioManager.getInstance().stopLoopingSoundEffect('pelletEat');
    }

    // Stop game background music and play level complete sound
    AudioManager.getInstance().stopBackgroundMusic();
    AudioManager.getInstance().playSoundEffect('levelComplete');

    // Reset player powerup state before moving to next level
    if (this.entityManager) {
      this.entityManager.player.deactivateFire();
      this.entityManager.player.hasFirePower = false;
    }

    // Hide enemies during the flash animation
    this.entityManager.pauseAndHideEnemies();

    // Flash the walls before transitioning to the next level
    this.playWinFlash(() => {
      this.scene.restart(this.getSceneRestartData(false));
    });
  }

  private playWinFlash(onComplete: () => void): void {
    const { count, duration, wallColor, outlineColor } = gameConfig.map.winFlash;
    const flashPalette: IMapColorPalette = { wall: wallColor, wallOutline: outlineColor };
    const halfDuration = duration / 2;
    let flashIndex = 0;

    const doFlash = () => {
      if (flashIndex >= count) {
        onComplete();
        return;
      }

      // Flash to alternate colors
      this.mapRenderer!.redrawWalls(flashPalette);

      // Flash back to normal colors after half duration
      this.time.delayedCall(halfDuration, () => {
        this.mapRenderer!.redrawWalls(this.currentPalette);

        flashIndex++;
        // Wait the other half before next flash
        this.time.delayedCall(halfDuration, doFlash);
      });
    };

    doFlash();
  }
  
  togglePause(): void {
    // Don't allow pausing during game over
    if (this.gameState.isGameOver())
      return;

    if (this.gameState.isPaused()) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame(): void {
    this.gameState.setPaused(true);

    // Pause all Phaser timers
    this.time.paused = true;

    // Hide touch controls during pause
    if (this.touchControls)
      this.touchControls.setVisible(false);

    // Show pause menu
    this.pauseMenu.show();
  }

  resumeGame(): void {
    this.gameState.setPaused(false);

    // Resume all Phaser timers
    this.time.paused = false;

    // Hide pause menu
    this.pauseMenu.hide();

    // Restore touch controls
    if (this.touchControls)
      this.touchControls.setVisible(true);
  }

  quitToMenu(): void {
    // Clean up pause state
    this.gameState.setPaused(false);
    this.time.paused = false;

    // Return to menu scene
    this.scene.start('MenuScene');
  }

  gameOver() {
    this.gameState.setGameOver();

    // Hide touch controls
    if (this.touchControls)
      this.touchControls.setVisible(false);

    // Stop any playing audio (music already stopped in loseLife, but ensure cleanup)
    AudioManager.getInstance().stopBackgroundMusic();

    // Clear all timers immediately to prevent duplicate enemy releases on restart
    this.time.removeAllEvents();

    // Check if this score qualifies as a high score
    const isDeveloperMode = DeveloperMode.getInstance().isEnabled();
    const currentScore = this.gameState.getScore();
    const isNewHighScore = HighScoreManager.isHighScore(currentScore, this.difficulty) && !isDeveloperMode;

    if (isNewHighScore) {
      // Show high score entry overlay
      this.highScoreEntryOverlay = new HighScoreEntryOverlay(
        this,
        this.localization,
        currentScore,
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
    HighScoreManager.addHighScore(this.gameState.getScore(), name, this.difficulty);

    // Go to main menu after saving high score
    this.scene.start('MenuScene');
  }

  private showNormalGameOver(): void {
    const loc = this.localization;

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      loc.getText('gameOver'),
      {
        fontFamily: 'PressStart2P',
        fontSize: '32px',
        color: '#fff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // Show game over text for a few seconds, then return to main menu
    this.time.delayedCall(3000, () => {
      this.scene.start('MenuScene');
    });
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

    // Clean up touch controls
    if (this.touchControls) {
      this.touchControls.destroy();
      this.touchControls = null;
    }

    // Clean up input manager
    if (this.inputManager)
      this.inputManager.cleanup();

    // Reset pause state
    if (this.gameState)
      this.gameState.setPaused(false);
    this.time.paused = false;

    // Clean up map renderer and texture
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }

    // Clean up entities
    if (this.entityManager)
      this.entityManager.cleanup();

    // Clean up level manager (handles pellets and powerups)
    if (this.levelManager)
      this.levelManager.cleanup();

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
}