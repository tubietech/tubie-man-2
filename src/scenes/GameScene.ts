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
import { canEatPellet, calculateScaledSpeed, calculateBonusAppearances } from '../utils/utils';
import { IMapData } from '../interfaces/IMapData';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { Bonus } from '../entities/Bonus';
import { BonusSelector } from '../utils/BonusSelector';
import { IBonusData } from '../interfaces/IBonusData';
import { PauseMenu } from '../ui/PauseMenu';
import { mapColorPalettes, getRandomPaletteIndex, IMapColorPalette, defaultPalette } from '../config/mapColorPalettes';
import { DeveloperMode } from '../utils/DeveloperMode';
import { Drawable } from '../interfaces/IPelletData';

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
  level: number = 1;
  lives: number = 3;
  difficulty: string = 'medium';
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
  pauseMenu!: PauseMenu;
  pauseKey!: Phaser.Input.Keyboard.Key;
  currentPaletteIndex: number = -1;
  currentPalette!: IMapColorPalette;
  developerIndicator!: Phaser.GameObjects.Text;
  devKeys!: {
    toggleAI: Phaser.Input.Keyboard.Key;
    clearPellets: Phaser.Input.Keyboard.Key;
    killPlayer: Phaser.Input.Keyboard.Key;
    activatePowerup: Phaser.Input.Keyboard.Key;
  };
  enemyAIEnabled: boolean = true;

  scoreText!: Phaser.GameObjects.Text;
  highScoreText!: Phaser.GameObjects.Text;
  livesText!: Phaser.GameObjects.Text;
  levelText!: Phaser.GameObjects.Text;
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

    // Ensure black background
    this.cameras.main.setBackgroundColor('#000000');

    // Always create a fresh graphics object
    this.graphics = this.add.graphics();

    // Reset game over flag
    this.isGameOver = false;

    if (data.reset) {
      // Full reset - start new game
      this.score = 0;
      this.level = 1;
      this.lives = gameConfig.player.startLives;
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
    // Calculate which palette group this level belongs to (changes every 2 levels)
    // Group 0: levels 1-2, Group 1: levels 3-4, Group 2: levels 5-6, etc.
    const currentPaletteGroup = Math.floor((this.level - 1) / 2);

    // Levels 1 & 2 always use the default palette
    if (this.level <= 2) {
      this.currentPaletteIndex = 0; // Default palette is at index 0
      this.currentPalette = defaultPalette;
      console.log(`[PALETTE] Level ${this.level} (Group ${currentPaletteGroup}): Using DEFAULT palette`);
      return;
    }

    // For levels 3+: Check if we need to change palette (only on odd levels: 3, 5, 7, etc.)
    const shouldChangePalette = (this.level - 1) % 2 === 0;

    if (shouldChangePalette || this.currentPaletteIndex === -1) {
      // Select a new random palette different from the current one
      this.currentPaletteIndex = getRandomPaletteIndex(this.currentPaletteIndex);
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      console.log(`[PALETTE] Level ${this.level} (Group ${currentPaletteGroup}): Selected NEW palette ${this.currentPaletteIndex}`);
    } else {
      // Keep the same palette
      this.currentPalette = mapColorPalettes[this.currentPaletteIndex];
      console.log(`[PALETTE] Level ${this.level} (Group ${currentPaletteGroup}): Keeping palette ${this.currentPaletteIndex}`);
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
  }

  initializeBonus() {
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

    console.log(`[BONUS] Initialized for level ${this.level}: ${bonusSelection.sprite}, score: ${bonusSelection.score}`);
    console.log(`[BONUS] Will appear at ${this.bonusAppearances[0]} and ${this.bonusAppearances[1]} pellets eaten`);
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
    const enemyCount = countConfig[this.level as keyof typeof countConfig] || countConfig[2]; // Default to level 2+ count

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
    // Release Stingy immediately since he's already outside
    this.enemiesReleased = 0;
    this.scheduleNextEnemyRelease();
  }

  /**
   * Schedule the release of the next enemy from the pen
   */
  scheduleNextEnemyRelease() {
    if (this.enemiesReleased < this.enemies.length) {
      if (this.enemiesReleased === 0) {
        // Release first enemy immediately
        this.enemies[0].release();
        this.enemiesReleased++;
        console.log(`[ENEMY RELEASE] Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
        this.scheduleNextEnemyRelease();
      } else {
        // Schedule next enemy release after delay
        const releaseDelay = gameConfig.enemy.releaseDelay[this.difficulty as keyof typeof gameConfig.enemy.releaseDelay];
        this.time.delayedCall(releaseDelay, () => {
          if (this.enemiesReleased < this.enemies.length) {
            this.enemies[this.enemiesReleased].release();
            this.enemiesReleased++;
            console.log(`[ENEMY RELEASE] Released enemy ${this.enemiesReleased} of ${this.enemies.length}`);
            this.scheduleNextEnemyRelease();
          }
        });
      }
    }
  }
  
  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Pause key handler
    this.pauseKey.on('down', () => {
      this.togglePause();
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
      this.lives,
      this.level,
      () => this.togglePause()  // Pause button callback
    );

    this.scoreText = uiElements.scoreText;
    this.highScoreText = uiElements.highScoreText;
    this.livesText = uiElements.livesText;
    this.levelText = uiElements.levelText;
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

    // Create developer mode indicator (yellow asterisk in top left, outside map)
    if (DeveloperMode.getInstance().isEnabled()) {
      this.developerIndicator = this.add.text(
        10,
        10,
        '*',
        {
          fontFamily: 'PressStart2P',
          fontSize: '48px',
          color: '#ffff00'
        }
      ).setScrollFactor(0).setDepth(10002);
      console.log('[DEVELOPER MODE] Indicator displayed');
    }
  }

  private isInitialized(): boolean {
    return !!(this.cursors && this.player && this.powerText);
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

        if (pad.buttons[gameConfig.controls.gamepad.fire].pressed) {
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
          this.score += gameConfig.map.powerup.score;
          this.player.giveFirePower();
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
          this.score += gameConfig.map.pellet.score;
          this.pelletsEaten++;

          // Check if bonus should spawn
          this.checkBonusSpawn();
        }

        this.uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);

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
    // Skip collision detection if player is dying or invulnerable
    if (this.player.isDying || this.player.isInvulnerable) {
      return;
    }

    const collisionResult = this.player.checkEnemyCollisions(this.enemies);

    if (collisionResult.hasCollision) {
      if (collisionResult.hitByFire && collisionResult.enemy) {
        // Check if enemy is fire-resistant (Stingy in Sterile Mode)
        const enemy = collisionResult.enemy as any;
        if (enemy.isFireResistant) {
          console.log('[GAME] Enemy is fire-resistant! Fire has no effect.');
          return; // Fire has no effect
        }

        // Enemy was hit by fire - injure them
        const currentTime = this.time.now;

        // Check if combo timer has expired (more than 10 seconds since last injury)
        if (currentTime - this.lastInjuryTime > gameConfig.player.injuryComboResetTime) {
          this.injuryComboCount = 0;
        }

        // Calculate score based on combo count
        const baseScore = gameConfig.enemy.injuryScore.base;
        const increment = gameConfig.enemy.injuryScore.increment;
        const maxScore = gameConfig.enemy.injuryScore.max;

        const injuryScore = Math.min(baseScore + (increment * this.injuryComboCount), maxScore);
        this.score += injuryScore;
        this.uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);

        // Increment combo count (0-indexed, so max combo count is 3 for 400 points)
        if (this.injuryComboCount < 3) {
          this.injuryComboCount++;
        }

        // Update last injury time
        this.lastInjuryTime = currentTime;

        console.log(`[GAME] Enemy injured! Score +${injuryScore}, Combo: ${this.injuryComboCount}`);

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

    this.bonus = new Bonus(this, this.bonusData, tileSize, this.mapOffsetX, this.mapOffsetY, bonusSpeed);

    console.log(`[BONUS] Spawned bonus #${this.currentBonusAppearance + 1}`);
  }

  checkBonusCollection() {
    if (!this.bonus || !this.bonus.isActive()) {
      return;
    }

    // Check distance from player to bonus
    const bonusPos = this.bonus.getGridPosition();
    const playerPos = this.player.getGridPosition();
    const distance = this.player.getGridDistance(playerPos, bonusPos);

    // Debug logging for first few frames
    if (this.bonus && Math.random() < 0.01) {
      console.log(`[BONUS] Player: (${playerPos.x}, ${playerPos.y}), Bonus: (${bonusPos.x}, ${bonusPos.y}), Distance: ${distance}`);
    }

    if (distance < 1) {
      // Collect bonus
      this.bonus.collect();
      this.score += this.bonus.score;

      this.uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);

      console.log(`[BONUS] Collected! Score +${this.bonus.score}, New total: ${this.score}`);

      // Clean up bonus
      this.bonus = null;
    }
  }

  checkWinCondition() {
    if (this.countRemainingPellets() === 0) {
      this.nextLevel();
    }
  }
  
  async loseLife() {
    this.lives--;
    this.uiRenderer.updateLivesText(this.livesText, this.orientation, this.lives);

    // Remove bonus if it's currently on screen
    if (this.bonus && this.bonus.isActive()) {
      this.bonus.deactivate();
      console.log('[BONUS] Removed due to player death');
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

    // Restart staggered release
    this.enemiesReleased = 0;
    this.scheduleNextEnemyRelease();
  }
  
  nextLevel() {
    this.level++;
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

    // Clear all timers immediately to prevent duplicate enemy releases on restart
    this.time.removeAllEvents();

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

    // Set up Enter key to restart
    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (enterKey) {
      enterKey.once('down', () => {
        this.scene.restart(this.getSceneRestartData(true));
      });
    }
  }

  shutdown() {
    // Remove all timed events to prevent them from firing after scene restart
    this.time.removeAllEvents();

    // Clean up pause menu
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
    }

    // Reset pause state
    this.isPaused = false;
    this.time.paused = false;

    // Clean up map renderer and texture
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }

    // Clean up player sprite
    if (this.player && this.player.animatedSprite) {
      this.player.deactivateFire();
      this.player.animatedSprite.destroy();
    }

    // Clean up enemy sprites
    if (this.enemies) {
      this.enemies.forEach(enemy => {
        if (enemy.sprite) {
          enemy.sprite.destroy();
        }
        if (enemy.animatedSprite) {
          enemy.animatedSprite.destroy();
        }
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
      this.bonus.deactivate();
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
    if (!this.input.keyboard) return;

    // Create developer key bindings
    this.devKeys = {
      toggleAI: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.toggleEnemyAI as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      clearPellets: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.clearPellets as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      killPlayer: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.killPlayer as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      activatePowerup: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.activatePowerup as keyof typeof Phaser.Input.Keyboard.KeyCodes])
    };

    // Q - Toggle enemy AI
    this.devKeys.toggleAI.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        this.enemyAIEnabled = !this.enemyAIEnabled;
        console.log(`[DEVELOPER MODE] Enemy AI ${this.enemyAIEnabled ? 'ENABLED' : 'DISABLED'}`);
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

        console.log('[DEVELOPER MODE] Pellets cleared except 3 below pen center for level progression testing');
      }
    });

    // K - Kill player
    this.devKeys.killPlayer.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        console.log('[DEVELOPER MODE] Killing player');
        this.player.playDeathAnimation();
      }
    });

    // P - Activate powerup
    this.devKeys.activatePowerup.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        console.log('[DEVELOPER MODE] Activating powerup');
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
  }
}