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
  
  constructor() {
    super({ key: 'GameScene' });

    // this.graphics = this.add.graphics();
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
    this.drawMap();
    this.createPellets();

    const tileSize = this.getTileSize();
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
  
  private isWall(x: number, y: number): boolean {
    if (y < 0 || y >= this.mapData.map.length || x < 0 || x >= this.mapData.map[0].length) {
      return false;
    }
    return this.mapData.map[y][x] === 1;
  }

  private floodFillWallRegion(startX: number, startY: number, visited: boolean[][]): { x: number, y: number }[] {
    const region: { x: number, y: number }[] = [];
    const queue: { x: number, y: number }[] = [{ x: startX, y: startY }];
    visited[startY][startX] = true;

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      region.push({ x, y });

      // Check all 4 adjacent cells
      const neighbors = [
        { x: x, y: y - 1 }, // up
        { x: x, y: y + 1 }, // down
        { x: x - 1, y: y }, // left
        { x: x + 1, y: y }  // right
      ];

      for (const neighbor of neighbors) {
        if (this.isWall(neighbor.x, neighbor.y) && !visited[neighbor.y][neighbor.x]) {
          visited[neighbor.y][neighbor.x] = true;
          queue.push(neighbor);
        }
      }
    }

    return region;
  }

  private drawWallRegion(region: { x: number, y: number }[], tileSize: number): void {
    const offset = gameConfig.map.wallEdgeOffset;

    // Check if this is a single-thickness wall (outline or pen wall)
    // Single-thickness walls are those where most tiles have no adjacent wall on at least 2 opposite sides
    const regionSet = new Set(region.map(p => `${p.x},${p.y}`));
    let singleThicknessCount = 0;
    for (const tile of region) {
      const hasWallAbove = regionSet.has(`${tile.x},${tile.y - 1}`);
      const hasWallBelow = regionSet.has(`${tile.x},${tile.y + 1}`);
      const hasWallLeft = regionSet.has(`${tile.x - 1},${tile.y}`);
      const hasWallRight = regionSet.has(`${tile.x + 1},${tile.y}`);

      // Single-thickness if missing walls on opposite sides
      const verticallyThin = !hasWallAbove || !hasWallBelow;
      const horizontallyThin = !hasWallLeft || !hasWallRight;

      if (verticallyThin || horizontallyThin) {
        singleThicknessCount++;
      }
    }

    // If more than 70% of tiles are single-thickness, use reduced inset
    const isSingleThickness = singleThicknessCount > region.length * 0.7;
    const adjustedOffset = isSingleThickness ? offset / gameConfig.map.thinWallAdjustment : offset;

    const inset = tileSize * adjustedOffset;
    const outlineThickness = gameConfig.map.wallOutlineThickness;
    const wallSize = tileSize - (inset * 2);
    // Use the configured radius directly - it can be larger than wallSize/2 for larger corners
    const radius = gameConfig.map.wallRadius;

    // STEP 1: Draw the fill - extend rectangles to bridge gaps with adjacent walls
    // BUT avoid extending into concave corners
    this.graphics!.fillStyle(gameConfig.colors.wall);
    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * tileSize + inset;
      const py = this.mapOffsetY + tile.y * tileSize + inset;

      // Check which adjacent cells are in the region
      const hasWallAbove = regionSet.has(`${tile.x},${tile.y - 1}`);
      const hasWallBelow = regionSet.has(`${tile.x},${tile.y + 1}`);
      const hasWallLeft = regionSet.has(`${tile.x - 1},${tile.y}`);
      const hasWallRight = regionSet.has(`${tile.x + 1},${tile.y}`);

      // Check diagonals for concave corner detection
      const hasWallTopLeft = regionSet.has(`${tile.x - 1},${tile.y - 1}`);
      const hasWallTopRight = regionSet.has(`${tile.x + 1},${tile.y - 1}`);
      const hasWallBottomLeft = regionSet.has(`${tile.x - 1},${tile.y + 1}`);
      const hasWallBottomRight = regionSet.has(`${tile.x + 1},${tile.y + 1}`);

      // Detect concave corners (where two walls meet but diagonal is empty)
      const topLeftConcave = hasWallAbove && hasWallLeft && !hasWallTopLeft;
      const topRightConcave = hasWallAbove && hasWallRight && !hasWallTopRight;
      const bottomLeftConcave = hasWallBelow && hasWallLeft && !hasWallBottomLeft;
      const bottomRightConcave = hasWallBelow && hasWallRight && !hasWallBottomRight;

      // Draw base rectangle
      this.graphics!.fillRect(px, py, wallSize, wallSize);

      // Extend upward - draw full width or partial width depending on concave corners
      // Use a fixed overlap amount that works regardless of thin wall adjustment
      const overlap = Math.max(2, inset * 0.5); // At least 2px or 20% of inset

      if (hasWallAbove) {
        if (!topLeftConcave && !topRightConcave) {
          // No concave corners - extend full width
          this.graphics!.fillRect(px, py - inset, wallSize, inset);
        } else if (topLeftConcave && !topRightConcave) {
          // Left concave corner - extend from slightly before center to avoid gap
          this.graphics!.fillRect(px + wallSize / 2 - overlap, py - inset, wallSize / 2 + overlap, inset);
        } else if (!topLeftConcave && topRightConcave) {
          // Right concave corner - extend from left to slightly past center
          this.graphics!.fillRect(px, py - inset, wallSize / 2 + overlap, inset);
        }
        // If both concave, don't extend
      }

      // Extend downward
      if (hasWallBelow) {
        if (!bottomLeftConcave && !bottomRightConcave) {
          this.graphics!.fillRect(px, py + wallSize, wallSize, inset);
        } else if (bottomLeftConcave && !bottomRightConcave) {
          this.graphics!.fillRect(px + wallSize / 2 - overlap, py + wallSize, wallSize / 2 + overlap, inset);
        } else if (!bottomLeftConcave && bottomRightConcave) {
          this.graphics!.fillRect(px, py + wallSize, wallSize / 2 + overlap, inset);
        }
      }

      // Extend leftward
      if (hasWallLeft) {
        if (!topLeftConcave && !bottomLeftConcave) {
          this.graphics!.fillRect(px - inset, py, inset, wallSize);
        } else if (topLeftConcave && !bottomLeftConcave) {
          this.graphics!.fillRect(px - inset, py + wallSize / 2 - overlap, inset, wallSize / 2 + overlap);
        } else if (!topLeftConcave && bottomLeftConcave) {
          this.graphics!.fillRect(px - inset, py, inset, wallSize / 2 + overlap);
        }
      }

      // Extend rightward
      if (hasWallRight) {
        if (!topRightConcave && !bottomRightConcave) {
          this.graphics!.fillRect(px + wallSize, py, inset, wallSize);
        } else if (topRightConcave && !bottomRightConcave) {
          this.graphics!.fillRect(px + wallSize, py + wallSize / 2 - overlap, inset, wallSize / 2 + overlap);
        } else if (!topRightConcave && bottomRightConcave) {
          this.graphics!.fillRect(px + wallSize, py, inset, wallSize / 2 + overlap);
        }
      }

      // Fill corner squares for non-concave corners (where diagonal exists)
      if (hasWallAbove && hasWallLeft && hasWallTopLeft) {
        this.graphics!.fillRect(px - inset, py - inset, inset, inset);
      }
      if (hasWallAbove && hasWallRight && hasWallTopRight) {
        this.graphics!.fillRect(px + wallSize, py - inset, inset, inset);
      }
      if (hasWallBelow && hasWallLeft && hasWallBottomLeft) {
        this.graphics!.fillRect(px - inset, py + wallSize, inset, inset);
      }
      if (hasWallBelow && hasWallRight && hasWallBottomRight) {
        this.graphics!.fillRect(px + wallSize, py + wallSize, inset, inset);
      }
    }

    // STEP 2: Draw the outlines - on all perimeter edges (exterior and concave)
    this.graphics!.lineStyle(outlineThickness, gameConfig.colors.wallOutline);

    // Collect all perimeter edge segments
    const horizontalEdges: { x1: number, x2: number, y: number }[] = [];
    const verticalEdges: { y1: number, y2: number, x: number }[] = [];

    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * tileSize + inset;
      const py = this.mapOffsetY + tile.y * tileSize + inset;

      const hasWallAbove = regionSet.has(`${tile.x},${tile.y - 1}`);
      const hasWallBelow = regionSet.has(`${tile.x},${tile.y + 1}`);
      const hasWallLeft = regionSet.has(`${tile.x - 1},${tile.y}`);
      const hasWallRight = regionSet.has(`${tile.x + 1},${tile.y}`);

      // Check diagonals for concave corner detection
      const hasWallTopLeft = regionSet.has(`${tile.x - 1},${tile.y - 1}`);
      const hasWallTopRight = regionSet.has(`${tile.x + 1},${tile.y - 1}`);
      const hasWallBottomLeft = regionSet.has(`${tile.x - 1},${tile.y + 1}`);
      const hasWallBottomRight = regionSet.has(`${tile.x + 1},${tile.y + 1}`);

      // Top edge (exposed to outside OR concave corner)
      if (!hasWallAbove) {
        const x1 = hasWallLeft ? px - inset : px + radius;
        const x2 = hasWallRight ? px + wallSize + inset : px + wallSize - radius;
        horizontalEdges.push({ x1, x2, y: py });
      }

      // Bottom edge (exposed to outside OR concave corner)
      if (!hasWallBelow) {
        const x1 = hasWallLeft ? px - inset : px + radius;
        const x2 = hasWallRight ? px + wallSize + inset : px + wallSize - radius;
        horizontalEdges.push({ x1, x2, y: py + wallSize });
      }

      // Left edge (exposed to outside OR concave corner)
      if (!hasWallLeft) {
        const y1 = hasWallAbove ? py - inset : py + radius;
        const y2 = hasWallBelow ? py + wallSize + inset : py + wallSize - radius;
        verticalEdges.push({ y1, y2, x: px });
      }

      // Right edge (exposed to outside OR concave corner)
      if (!hasWallRight) {
        const y1 = hasWallAbove ? py - inset : py + radius;
        const y2 = hasWallBelow ? py + wallSize + inset : py + wallSize - radius;
        verticalEdges.push({ y1, y2, x: px + wallSize });
      }

      // Draw concave corner edges (interior corners where walls meet at right angles)
      // For concave corners, draw straight edges that meet at the corner point
      // Top-left concave corner
      if (hasWallAbove && hasWallLeft && !hasWallTopLeft) {
        // Draw straight edges forming an L-shape in the gap
        verticalEdges.push({ y1: py - inset, y2: py, x: px });
        horizontalEdges.push({ x1: px - inset, x2: px, y: py });
      }

      // Top-right concave corner
      if (hasWallAbove && hasWallRight && !hasWallTopRight) {
        verticalEdges.push({ y1: py - inset, y2: py, x: px + wallSize });
        horizontalEdges.push({ x1: px + wallSize, x2: px + wallSize + inset, y: py });
      }

      // Bottom-left concave corner
      if (hasWallBelow && hasWallLeft && !hasWallBottomLeft) {
        verticalEdges.push({ y1: py + wallSize, y2: py + wallSize + inset, x: px });
        horizontalEdges.push({ x1: px - inset, x2: px, y: py + wallSize });
      }

      // Bottom-right concave corner
      if (hasWallBelow && hasWallRight && !hasWallBottomRight) {
        verticalEdges.push({ y1: py + wallSize, y2: py + wallSize + inset, x: px + wallSize });
        horizontalEdges.push({ x1: px + wallSize, x2: px + wallSize + inset, y: py + wallSize });
      }
    }

    // Draw all horizontal edges in one pass
    if (horizontalEdges.length > 0) {
      this.graphics!.beginPath();
      for (const edge of horizontalEdges) {
        this.graphics!.moveTo(edge.x1, edge.y);
        this.graphics!.lineTo(edge.x2, edge.y);
      }
      this.graphics!.strokePath();
    }

    // Draw all vertical edges in one pass
    if (verticalEdges.length > 0) {
      this.graphics!.beginPath();
      for (const edge of verticalEdges) {
        this.graphics!.moveTo(edge.x, edge.y1);
        this.graphics!.lineTo(edge.x, edge.y2);
      }
      this.graphics!.strokePath();
    }

    // STEP 3: Draw corner arcs (both exterior and concave)
    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * tileSize + inset;
      const py = this.mapOffsetY + tile.y * tileSize + inset;

      const hasWallAbove = regionSet.has(`${tile.x},${tile.y - 1}`);
      const hasWallBelow = regionSet.has(`${tile.x},${tile.y + 1}`);
      const hasWallLeft = regionSet.has(`${tile.x - 1},${tile.y}`);
      const hasWallRight = regionSet.has(`${tile.x + 1},${tile.y}`);

      const hasWallTopLeft = regionSet.has(`${tile.x - 1},${tile.y - 1}`);
      const hasWallTopRight = regionSet.has(`${tile.x + 1},${tile.y - 1}`);
      const hasWallBottomLeft = regionSet.has(`${tile.x - 1},${tile.y + 1}`);
      const hasWallBottomRight = regionSet.has(`${tile.x + 1},${tile.y + 1}`);

      // Exterior corners (convex)
      if (!hasWallAbove && !hasWallLeft) {
        this.graphics!.beginPath();
        this.graphics!.arc(px + radius, py + radius, radius, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(270), false);
        this.graphics!.strokePath();
      }

      if (!hasWallAbove && !hasWallRight) {
        this.graphics!.beginPath();
        this.graphics!.arc(px + wallSize - radius, py + radius, radius, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(360), false);
        this.graphics!.strokePath();
      }

      if (!hasWallBelow && !hasWallLeft) {
        this.graphics!.beginPath();
        this.graphics!.arc(px + radius, py + wallSize - radius, radius, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(180), false);
        this.graphics!.strokePath();
      }

      if (!hasWallBelow && !hasWallRight) {
        this.graphics!.beginPath();
        this.graphics!.arc(px + wallSize - radius, py + wallSize - radius, radius, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(90), false);
        this.graphics!.strokePath();
      }

      // Concave corners are handled by the straight edge segments added above
      // No rounded arcs needed for concave corners - they form sharp right angles
    }
  }

  drawMap() {
    const tileSize = this.getTileSize();

    // Create visited array for flood fill
    const visited: boolean[][] = [];
    for (let y = 0; y < this.mapData.map.length; y++) {
      visited[y] = new Array(this.mapData.map[y].length).fill(false);
    }

    // Collect pen door tiles to draw as one connected region
    const penDoorTiles: { x: number, y: number }[] = [];

    // Process all tiles
    for (let y = 0; y < this.mapData.map.length; y++) {
      for (let x = 0; x < this.mapData.map[y].length; x++) {
        const tile = this.mapData.map[y][x];

        if (tile === 1 && !visited[y][x]) {
          // Wall - find connected region and draw it
          const region = this.floodFillWallRegion(x, y, visited);
          this.drawWallRegion(region, tileSize);
        } else if (tile === 2) {
          // Pen interior
          this.add.rectangle(
            this.mapOffsetX + x * tileSize,
            this.mapOffsetY + y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.wall
          ).setOrigin(0).setAlpha(0.3);
        } else if (tile === 3) {
          // Collect pen door tiles
          penDoorTiles.push({ x, y });
        } else if (tile === 4) {
          // Tunnel
          this.add.rectangle(
            this.mapOffsetX + x * tileSize,
            this.mapOffsetY + y * tileSize,
            tileSize,
            tileSize,
            gameConfig.colors.tunnel
          ).setOrigin(0).setAlpha(0.5);
        }
      }
    }

    // Draw pen door as one connected region
    if (penDoorTiles.length > 0) {
      this.drawPenDoor(penDoorTiles, tileSize);
    }
  }

  private drawPenDoor(tiles: { x: number, y: number }[], tileSize: number): void {
    const offset = gameConfig.map.wallEdgeOffset;
    const adjustedOffset = offset / gameConfig.map.thinWallAdjustment;
    const inset = tileSize * adjustedOffset;
    const wallSize = tileSize - (inset * 2);
    const outlineThickness = gameConfig.map.wallOutlineThickness;
    const barHeight = tileSize * 0.3;

    // Sort tiles by x coordinate to find leftmost and rightmost
    tiles.sort((a, b) => a.x - b.x);
    const leftmost = tiles[0];
    const rightmost = tiles[tiles.length - 1];

    // Extend to fill gaps on left and right sides
    // Start from the left edge of the leftmost tile (before inset)
    const startX = this.mapOffsetX + leftmost.x * tileSize;
    // End at the right edge of the rightmost tile (after inset + wallSize)
    const endX = this.mapOffsetX + (rightmost.x + 1) * tileSize;
    const totalWidth = endX - startX;
    const py = this.mapOffsetY + leftmost.y * tileSize + inset;

    // Draw fill as one continuous bar spanning full width
    this.graphics!.fillStyle(gameConfig.colors.penDoor);
    this.graphics!.fillRect(startX, py, totalWidth, barHeight);

    // Draw outline
    this.graphics!.lineStyle(outlineThickness, gameConfig.colors.wallOutline);
    this.graphics!.beginPath();
    // Top edge
    this.graphics!.moveTo(startX, py);
    this.graphics!.lineTo(endX, py);
    // Bottom edge
    this.graphics!.moveTo(startX, py + barHeight);
    this.graphics!.lineTo(endX, py + barHeight);
    // Left edge
    this.graphics!.moveTo(startX, py);
    this.graphics!.lineTo(startX, py + barHeight);
    // Right edge
    this.graphics!.moveTo(endX, py);
    this.graphics!.lineTo(endX, py + barHeight);
    this.graphics!.strokePath();
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
            this.mapOffsetX + x * tileSize + tileSize / 2,
            this.mapOffsetY + y * tileSize + tileSize / 2,
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
        this.mapOffsetX + x * tileSize + tileSize / 2,
        this.mapOffsetY + y * tileSize + tileSize / 2,
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
    const loc = this.localization;

    if (this.orientation === Orientation.VERTICAL) {
      this.scoreText = this.add.text(this.mapOffsetX + 10, this.mapOffsetY + 10, `${loc.getText('score')}: ${this.score}`, {
        fontSize: '16px',
        color: '#fff'
      }).setScrollFactor(0);

      this.highScoreText = this.add.text(this.mapOffsetX + mapWidth / 2, this.mapOffsetY + 10, `${loc.getText('highScore')}: 0`, {
        fontSize: '16px',
        color: '#fff'
      }).setOrigin(0.5, 0).setScrollFactor(0);

      this.levelText = this.add.text(this.mapOffsetX + mapWidth - 10, this.mapOffsetY + 10, `${loc.getText('level')}: ${this.level}`, {
        fontSize: '16px',
        color: '#fff'
      }).setOrigin(1, 0).setScrollFactor(0);

      this.livesText = this.add.text(this.mapOffsetX + 10, this.mapOffsetY + mapHeight + 10, `${loc.getText('lives')}: ${this.lives}`, {
        fontSize: '16px',
        color: '#fff'
      }).setScrollFactor(0);

      this.powerText = this.add.text(this.mapOffsetX + mapWidth / 2, this.mapOffsetY + mapHeight + 10, `${loc.getText('power')}: ${loc.getText('powerReady')}`, {
        fontSize: '16px',
        color: '#00ff00'
      }).setOrigin(0.5, 0).setScrollFactor(0);
    } else {
      const uiX = this.mapOffsetX + mapWidth + 20;

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

    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}