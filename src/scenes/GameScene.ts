import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Blinky } from '../entities/enemies/Blinky';
import { Pinky } from '../entities/enemies/Pinky';
import { Inky } from '../entities/enemies/Inky';
import { Clyde } from '../entities/enemies/Clyde';
import { MapGeneratorV2 } from '../utils/MapGeneratorV2';
import { MapRenderer } from '../utils/MapRenderer';
import { UIRenderer } from '../utils/UIRenderer';
import { IMapData } from '../interfaces/IMapData';
import { Direction } from '../enums/Direction';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  mapData!: IMapData;
  pellets: Phaser.GameObjects.Arc[][] = [];
  powerups: Phaser.GameObjects.Arc[] = [];
  player!: Player;
  enemies: Enemy[] = [];
  score: number = 0;
  level: number = 1;
  lives: number = 3;
  difficulty: string = 'medium';
  orientation: Orientation = Orientation.HORIZONTAL;
  localization!: LocalizationManager;
  tunnelCooldown: number = 0;
  mapOffsetX: number = 0;
  mapOffsetY: number = 0;

  scoreText!: Phaser.GameObjects.Text;
  highScoreText!: Phaser.GameObjects.Text;
  livesText!: Phaser.GameObjects.Text;
  levelText!: Phaser.GameObjects.Text;
  powerText!: Phaser.GameObjects.Text;
  
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

    this.graphics = this.add.graphics();
    
    if (data.reset) {
      this.score = 0;
      this.level = 1;
      this.lives = gameConfig.player.startLives;
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
    this.mapData = await MapGeneratorV2.generate(gameConfig.map.width, gameConfig.map.height);
    this.calculateMapOffset();

    const tileSize = this.getTileSize();
    const mapRenderer = new MapRenderer(
      this,
      this.mapData,
      this.graphics!,
      this.mapOffsetX,
      this.mapOffsetY,
      tileSize
    );

    this.mapRectangles = mapRenderer.drawMap();
    const { pellets, powerups } = mapRenderer.createPellets();
    this.pellets = pellets;
    this.powerups = powerups;

    const baseSpeed = gameConfig.player.speed[this.difficulty as keyof typeof gameConfig.player.speed];
    // Scale speed based on tile size (base tile size is 10)
    const playerSpeed = baseSpeed * (tileSize / gameConfig.map.tileSize);

    // Use player start position from map data
    const startX = this.mapData.playerStart.x;
    const startY = this.mapData.playerStart.y;

    this.player = new Player(this, startX, startY, gameConfig.colors.player, playerSpeed, this.mapData, tileSize, this.mapOffsetX, this.mapOffsetY);

    this.createEnemies();
    this.setupInput();
    this.createUI();
  }
  
  createEnemies() {
    const tileSize = this.getTileSize();
    const baseSpeed = gameConfig.enemy.speed[this.difficulty as keyof typeof gameConfig.enemy.speed];
    // Scale speed based on tile size (base tile size is 10)
    const enemySpeed = baseSpeed * (tileSize / gameConfig.map.tileSize);
    const types = [Blinky, Pinky, Inky, Clyde];

    const penX = this.mapData.penCenter.x;
    const penY = this.mapData.penCenter.y;

    for (let i = 0; i < Math.min(this.level + 2, 4); i++) {
      const EnemyClass = types[i % types.length];
      const enemy = new EnemyClass(this, penX, penY, enemySpeed, this.mapData, tileSize, this.mapOffsetX, this.mapOffsetY);
      this.enemies.push(enemy);
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
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;
      const dx = pointer.x - px;
      const dy = pointer.y - py;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.inputQueue.push(dx > 0 ? Direction.RIGHT : Direction.LEFT);
      } else {
        this.player.inputQueue.push(dy > 0 ? Direction.DOWN : Direction.UP);
      }
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.primaryDown) {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const dx = pointer.x - px;
        const dy = pointer.y - py;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          this.player.inputQueue = [dx > 0 ? Direction.RIGHT : Direction.LEFT];
        } else {
          this.player.inputQueue = [dy > 0 ? Direction.DOWN : Direction.UP];
        }
      }
    });
  }
  
  createUI() {
    const tileSize = this.getTileSize();
    const mapWidth = gameConfig.map.width * tileSize;
    const mapHeight = gameConfig.map.height * tileSize;

    const uiRenderer = new UIRenderer(this, this.localization);
    const uiElements = uiRenderer.createUI(
      this.orientation,
      this.mapOffsetX,
      this.mapOffsetY,
      mapWidth,
      mapHeight,
      this.score,
      this.lives,
      this.level
    );

    this.scoreText = uiElements.scoreText;
    this.highScoreText = uiElements.highScoreText;
    this.livesText = uiElements.livesText;
    this.levelText = uiElements.levelText;
    this.powerText = uiElements.powerText;
  }

  private isInitialized(): boolean {
    return !!(this.cursors && this.player);
  }

  update(time: number, delta: number) {
    // Guard: Don't update until scene is fully initialized
    if (!this.isInitialized()) {
      return;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.player.inputQueue.push(Direction.UP);
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.player.inputQueue.push(Direction.DOWN);
    }
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.inputQueue.push(Direction.LEFT);
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.inputQueue.push(Direction.RIGHT);
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.player.activateFire();
    }
    
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        if (pad.leftStick.x < -0.5) this.player.inputQueue.push(Direction.LEFT);
        if (pad.leftStick.x > 0.5) this.player.inputQueue.push(Direction.RIGHT);
        if (pad.leftStick.y < -0.5) this.player.inputQueue.push(Direction.UP);
        if (pad.leftStick.y > 0.5) this.player.inputQueue.push(Direction.DOWN);
        
        if (pad.buttons[gameConfig.controls.gamepad.fire].pressed) {
          this.player.activateFire();
        }
      }
    }
    
    if (this.player.inputQueue.length > 2) {
      this.player.inputQueue = this.player.inputQueue.slice(-2);
    }
    
    this.player.update(time, delta);
    this.enemies.forEach(enemy => enemy.update(time, delta));

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

      // Calculate player's distance from pellet center
      const pelletCenterX = this.mapOffsetX + px * tileSize + tileSize / 2;
      const pelletCenterY = this.mapOffsetY + py * tileSize + tileSize / 2;
      const playerX = this.player.sprite.x;
      const playerY = this.player.sprite.y;

      const distX = Math.abs(playerX - pelletCenterX);
      const distY = Math.abs(playerY - pelletCenterY);
      const distance = Math.sqrt(distX * distX + distY * distY);

      // Only eat pellet when player is within configured distance from center
      if (distance < tileSize * gameConfig.player.pelletEatDistance) {
        const isPower = this.powerups.includes(pellet);

        pellet.destroy();
        this.pellets[py][px] = null as any;

        if (isPower) {
          this.score += gameConfig.map.powerupScore;
          this.player.hasFirePower = true;
          const uiRenderer = new UIRenderer(this, this.localization);
          uiRenderer.updatePowerText(this.powerText, this.orientation, true, false);
        } else {
          this.score += gameConfig.map.pelletScore;
        }

        const uiRenderer = new UIRenderer(this, this.localization);
        uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);

        this.checkWinCondition();
      }
    }
    
    this.checkEnemyCollision();

    const uiRenderer = new UIRenderer(this, this.localization);
    uiRenderer.updatePowerText(this.powerText, this.orientation, this.player.hasFirePower, this.player.fireActive);
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
    const firePositions = this.player.getFirePositions();
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      const hitByFire = firePositions.some(pos => 
        pos.x === enemy.gridX && pos.y === enemy.gridY
      );
      
      if (hitByFire) {
        this.score += gameConfig.map.enemyScore;
        const uiRenderer = new UIRenderer(this, this.localization);
        uiRenderer.updateScoreText(this.scoreText, this.orientation, this.score);

        // Respawn enemy to pen after delay
        this.time.delayedCall(gameConfig.enemy.respawnDelay, () => {
          enemy.moveTo(this.mapData.penCenter.x, this.mapData.penCenter.y);
        });
        
        continue;
      }
      
      const dist = Math.abs(this.player.gridX - enemy.gridX) + 
                   Math.abs(this.player.gridY - enemy.gridY);
      
      if (dist < 1) {
        this.loseLife();
        return;
      }
    }
  }
  
  checkWinCondition() {
    let pelletsRemaining = 0;
    
    for (let y = 0; y < this.pellets.length; y++) {
      for (let x = 0; x < this.pellets[y].length; x++) {
        if (this.pellets[y][x]) {
          pelletsRemaining++;
        }
      }
    }
    
    if (pelletsRemaining === 0) {
      this.nextLevel();
    }
  }
  
  loseLife() {
    this.lives--;
    const uiRenderer = new UIRenderer(this, this.localization);
    uiRenderer.updateLivesText(this.livesText, this.orientation, this.lives);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.resetPositions();
    }
  }
  
  resetPositions() {
    // Use player start position from map data
    this.player.moveTo(this.mapData.playerStart.x, this.mapData.playerStart.y);
    this.player.direction = Direction.RIGHT;
    this.player.deactivateFire();
    this.player.hasFirePower = false;

    // Return all enemies to pen
    this.enemies.forEach(enemy => {
      enemy.moveTo(this.mapData.penCenter.x, this.mapData.penCenter.y);
    });
  }
  
  nextLevel() {
    this.level++;
    this.scene.restart({ 
      difficulty: this.difficulty, 
      orientation: this.orientation,
      reset: false 
    });
  }
  
  gameOver() {
    const loc = this.localization;
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `${loc.getText('gameOver')}\n\n${loc.getText('clickToRestart')}`,
      {
        fontSize: '32px',
        color: '#fff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    this.input.once('pointerdown', () => {
      this.scene.restart({ 
        difficulty: this.difficulty, 
        orientation: this.orientation,
        reset: true 
      });
    });
    
    this.scene.pause();
  }

  shutdown() {
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

    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}