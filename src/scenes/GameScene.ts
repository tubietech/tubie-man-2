import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Blinky } from '../entities/enemies/Blinky';
import { Pinky } from '../entities/enemies/Pinky';
import { Inky } from '../entities/enemies/Inky';
import { Clyde } from '../entities/enemies/Clyde';
import { MapGeneratorV2 } from '../utils/MapGeneratorV2';
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

  scoreText!: Phaser.GameObjects.Text;
  highScoreText!: Phaser.GameObjects.Text;
  livesText!: Phaser.GameObjects.Text;
  levelText!: Phaser.GameObjects.Text;
  powerText!: Phaser.GameObjects.Text;
  
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: any;
  fireKey!: Phaser.Input.Keyboard.Key;
  
  constructor() {
    super({ key: 'GameScene' });
  }
  
  init(data: any) {
    this.difficulty = data.difficulty || 'medium';
    this.orientation = data.orientation || Orientation.HORIZONTAL;
    this.localization = LocalizationManager.getInstance();
    
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

  async create() {
    this.mapData = await MapGeneratorV2.generate(gameConfig.map.width, gameConfig.map.height);
    this.drawMap();
    this.createPellets();

    const tileSize = this.getTileSize();
    const baseSpeed = gameConfig.player.speed[this.difficulty as keyof typeof gameConfig.player.speed];
    // Scale speed based on tile size (base tile size is 10)
    const playerSpeed = baseSpeed * (tileSize / gameConfig.map.tileSize);

    // Use player start position from map data
    const startX = this.mapData.playerStart.x;
    const startY = this.mapData.playerStart.y;

    this.player = new Player(this, startX, startY, gameConfig.colors.player, playerSpeed, this.mapData, tileSize);

    this.createEnemies();
    this.setupInput();
    this.createUI();
  }
  
  drawMap() {
    const tileSize = this.getTileSize();

    for (let y = 0; y < this.mapData.map.length; y++) {
      for (let x = 0; x < this.mapData.map[y].length; x++) {
        const tile = this.mapData.map[y][x];
        
        if (tile === 1) {
          // Wall
          this.add.rectangle(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.wall
          ).setOrigin(0);
        } else if (tile === 2) {
          // Pen interior
          this.add.rectangle(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.wall
          ).setOrigin(0).setAlpha(0.3);
        } else if (tile === 3) {
          // Pen door
          this.add.rectangle(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.penDoor
          ).setOrigin(0);
        } else if (tile === 4) {
          // Tunnel
          this.add.rectangle(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.tunnel
          ).setOrigin(0).setAlpha(0.5);
        }
      }
    }
  }
  
  createPellets() {
    const tileSize = this.getTileSize();
    this.pellets = [];
    const doorStartX = this.mapData.penDoor.x;
    const doorY = this.mapData.penDoor.y;
    const doorWidth = gameConfig.map.enemyPen.doorWidth;

    for (let y = 0; y < this.mapData.map.length; y++) {
      this.pellets[y] = [];
      for (let x = 0; x < this.mapData.map[y].length; x++) {
        // Only place pellets on paths (0), not in pen, door, tunnels, or in front of door
        if (this.mapData.map[y][x] === 0) {
          // Skip door front (entire width of door)
          let isInFrontOfDoor = false;
          if (y === doorY - 1) {
            for (let i = 0; i < doorWidth; i++) {
              if (x === doorStartX + i) {
                isInFrontOfDoor = true;
                break;
              }
            }
          }

          if (isInFrontOfDoor) {
            continue;
          }

          const pellet = this.add.circle(
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2,
            tileSize / 5,
            gameConfig.colors.pellet
          );
          this.pellets[y][x] = pellet;
        }
      }
    }

    // Add powerups from map data
    for (const powerPelletPos of this.mapData.powerPellets) {
      const x = powerPelletPos.x;
      const y = powerPelletPos.y;

      // Remove regular pellet if it exists
      if (this.pellets[y]?.[x]) {
        this.pellets[y][x].destroy();
      }

      // Create powerup
      const powerup = this.add.circle(
        x * tileSize + tileSize / 2,
        y * tileSize + tileSize / 2,
        tileSize / 2.5,
        gameConfig.colors.powerup
      );
      this.powerups.push(powerup);

      if (!this.pellets[y]) {
        this.pellets[y] = [];
      }
      this.pellets[y][x] = powerup;
    }
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
      const enemy = new EnemyClass(this, penX, penY, enemySpeed, this.mapData, tileSize);
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
    const loc = this.localization;

    if (this.orientation === Orientation.VERTICAL) {
      this.scoreText = this.add.text(10, 10, `${loc.getText('score')}: ${this.score}`, {
        fontSize: '16px',
        color: '#fff'
      }).setScrollFactor(0);

      this.highScoreText = this.add.text(mapWidth / 2, 10, `${loc.getText('highScore')}: 0`, {
        fontSize: '16px',
        color: '#fff'
      }).setOrigin(0.5, 0).setScrollFactor(0);

      this.levelText = this.add.text(mapWidth - 10, 10, `${loc.getText('level')}: ${this.level}`, {
        fontSize: '16px',
        color: '#fff'
      }).setOrigin(1, 0).setScrollFactor(0);

      this.livesText = this.add.text(10, mapHeight + 10, `${loc.getText('lives')}: ${this.lives}`, {
        fontSize: '16px',
        color: '#fff'
      }).setScrollFactor(0);

      this.powerText = this.add.text(mapWidth / 2, mapHeight + 10, `${loc.getText('power')}: ${loc.getText('powerReady')}`, {
        fontSize: '16px',
        color: '#00ff00'
      }).setOrigin(0.5, 0).setScrollFactor(0);
    } else {
      const uiX = mapWidth + 20;

      this.scoreText = this.add.text(uiX, 50, `${loc.getText('score')}:\n${this.score}`, {
        fontSize: '18px',
        color: '#fff',
        align: 'left'
      }).setScrollFactor(0);

      this.highScoreText = this.add.text(uiX, 120, `${loc.getText('highScore')}:\n0`, {
        fontSize: '18px',
        color: '#fff',
        align: 'left'
      }).setScrollFactor(0);

      this.livesText = this.add.text(uiX, 190, `${loc.getText('lives')}:\n${this.lives}`, {
        fontSize: '18px',
        color: '#fff',
        align: 'left'
      }).setScrollFactor(0);

      this.levelText = this.add.text(uiX, 260, `${loc.getText('level')}:\n${this.level}`, {
        fontSize: '18px',
        color: '#fff',
        align: 'left'
      }).setScrollFactor(0);

      this.powerText = this.add.text(uiX, 330, `${loc.getText('power')}:\n${loc.getText('powerReady')}`, {
        fontSize: '18px',
        color: '#00ff00',
        align: 'left'
      }).setScrollFactor(0);
    }
  }
  
  update(time: number, delta: number) {
    // Guard: Don't update until scene is fully initialized
    if (!this.cursors || !this.player) {
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
    
    if (this.pellets[py] && this.pellets[py][px]) {
      const pellet = this.pellets[py][px];
      const isPower = this.powerups.includes(pellet);
      
      pellet.destroy();
      this.pellets[py][px] = null as any;
      
      if (isPower) {
        this.score += gameConfig.map.powerupScore;
        this.player.hasFirePower = true;
        this.powerText.setColor('#00ff00');
        const loc = this.localization;
        this.powerText.setText(
          this.orientation === Orientation.VERTICAL 
            ? `${loc.getText('power')}: ${loc.getText('powerReady')}` 
            : `${loc.getText('power')}:\n${loc.getText('powerReady')}`
        );
      } else {
        this.score += gameConfig.map.pelletScore;
      }
      
      const loc = this.localization;
      this.scoreText.setText(
        this.orientation === Orientation.VERTICAL 
          ? `${loc.getText('score')}: ${this.score}` 
          : `${loc.getText('score')}:\n${this.score}`
      );
      
      this.checkWinCondition();
    }
    
    this.checkEnemyCollision();
    
    const loc = this.localization;
    if (!this.player.hasFirePower && !this.player.fireActive) {
      this.powerText.setColor('#ff0000');
      this.powerText.setText(
        this.orientation === Orientation.VERTICAL 
          ? `${loc.getText('power')}: ${loc.getText('powerNone')}` 
          : `${loc.getText('power')}:\n${loc.getText('powerNone')}`
      );
    } else if (this.player.fireActive) {
      this.powerText.setColor('#ffa500');
      this.powerText.setText(
        this.orientation === Orientation.VERTICAL 
          ? `${loc.getText('power')}: ${loc.getText('powerActive')}` 
          : `${loc.getText('power')}:\n${loc.getText('powerActive')}`
      );
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
    const firePositions = this.player.getFirePositions();
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      const hitByFire = firePositions.some(pos => 
        pos.x === enemy.gridX && pos.y === enemy.gridY
      );
      
      if (hitByFire) {
        this.score += gameConfig.map.enemyScore;
        const loc = this.localization;
        this.scoreText.setText(
          this.orientation === Orientation.VERTICAL 
            ? `${loc.getText('score')}: ${this.score}` 
            : `${loc.getText('score')}:\n${this.score}`
        );
        
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
    const loc = this.localization;
    this.livesText.setText(
      this.orientation === Orientation.VERTICAL 
        ? `${loc.getText('lives')}: ${this.lives}` 
        : `${loc.getText('lives')}:\n${this.lives}`
    );
    
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
}