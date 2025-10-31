import Phaser from 'phaser';
import { IMapData } from '../interfaces/IMapData';
import { IPelletData } from '../interfaces/IPelletData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { gameConfig } from '../config/gameConfig';
import { isWall, drawCorner } from './utils';

export class MapRenderer {
  private scene: Phaser.Scene;
  private mapData: IMapData;
  private graphics: Phaser.GameObjects.Graphics;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private tileSize: number;

  constructor(
    scene: Phaser.Scene,
    mapData: IMapData,
    graphics: Phaser.GameObjects.Graphics,
    mapOffsetX: number,
    mapOffsetY: number,
    tileSize: number
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.graphics = graphics;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.tileSize = tileSize;
  }

  private floodFillWallRegion(startX: number, startY: number, visited: boolean[][]): ICoordinate[] {
    const region: ICoordinate[] = [];
    const queue: ICoordinate[] = [{ x: startX, y: startY }];
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
        if (isWall(neighbor, this.mapData.map) && !visited[neighbor.y][neighbor.x]) {
          visited[neighbor.y][neighbor.x] = true;
          queue.push(neighbor);
        }
      }
    }

    return region;
  }

  private drawWallRegion(region: ICoordinate[]): void {
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

    const inset = this.tileSize * adjustedOffset;
    const outlineThickness = gameConfig.map.wallOutlineThickness;
    const wallSize = this.tileSize - (inset * 2);
    // Use the configured radius directly - it can be larger than wallSize/2 for larger corners
    const radius = gameConfig.map.wallRadius;

    // STEP 1: Draw the fill - extend rectangles to bridge gaps with adjacent walls
    // BUT avoid extending into concave corners
    this.graphics.fillStyle(gameConfig.colors.wall);
    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * this.tileSize + inset;
      const py = this.mapOffsetY + tile.y * this.tileSize + inset;

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
      this.graphics.fillRect(px, py, wallSize, wallSize);

      // Extend upward - draw full width or partial width depending on concave corners
      // Use a fixed overlap amount that works regardless of thin wall adjustment
      const overlap = Math.max(2, inset * 0.5); // At least 2px or 20% of inset

      if (hasWallAbove) {
        if (!topLeftConcave && !topRightConcave) {
          // No concave corners - extend full width
          this.graphics.fillRect(px, py - inset, wallSize, inset);
        } else if (topLeftConcave && !topRightConcave) {
          // Left concave corner - extend from slightly before center to avoid gap
          this.graphics.fillRect(px + wallSize / 2 - overlap, py - inset, wallSize / 2 + overlap, inset);
        } else if (!topLeftConcave && topRightConcave) {
          // Right concave corner - extend from left to slightly past center
          this.graphics.fillRect(px, py - inset, wallSize / 2 + overlap, inset);
        }
        // If both concave, don't extend
      }

      // Extend downward
      if (hasWallBelow) {
        if (!bottomLeftConcave && !bottomRightConcave) {
          this.graphics.fillRect(px, py + wallSize, wallSize, inset);
        } else if (bottomLeftConcave && !bottomRightConcave) {
          this.graphics.fillRect(px + wallSize / 2 - overlap, py + wallSize, wallSize / 2 + overlap, inset);
        } else if (!bottomLeftConcave && bottomRightConcave) {
          this.graphics.fillRect(px, py + wallSize, wallSize / 2 + overlap, inset);
        }
      }

      // Extend leftward
      if (hasWallLeft) {
        if (!topLeftConcave && !bottomLeftConcave) {
          this.graphics.fillRect(px - inset, py, inset, wallSize);
        } else if (topLeftConcave && !bottomLeftConcave) {
          this.graphics.fillRect(px - inset, py + wallSize / 2 - overlap, inset, wallSize / 2 + overlap);
        } else if (!topLeftConcave && bottomLeftConcave) {
          this.graphics.fillRect(px - inset, py, inset, wallSize / 2 + overlap);
        }
      }

      // Extend rightward
      if (hasWallRight) {
        if (!topRightConcave && !bottomRightConcave) {
          this.graphics.fillRect(px + wallSize, py, inset, wallSize);
        } else if (topRightConcave && !bottomRightConcave) {
          this.graphics.fillRect(px + wallSize, py + wallSize / 2 - overlap, inset, wallSize / 2 + overlap);
        } else if (!topRightConcave && bottomRightConcave) {
          this.graphics.fillRect(px + wallSize, py, inset, wallSize / 2 + overlap);
        }
      }

      // Fill corner squares for non-concave corners (where diagonal exists)
      if (hasWallAbove && hasWallLeft && hasWallTopLeft) {
        this.graphics.fillRect(px - inset, py - inset, inset, inset);
      }
      if (hasWallAbove && hasWallRight && hasWallTopRight) {
        this.graphics.fillRect(px + wallSize, py - inset, inset, inset);
      }
      if (hasWallBelow && hasWallLeft && hasWallBottomLeft) {
        this.graphics.fillRect(px - inset, py + wallSize, inset, inset);
      }
      if (hasWallBelow && hasWallRight && hasWallBottomRight) {
        this.graphics.fillRect(px + wallSize, py + wallSize, inset, inset);
      }
    }

    // STEP 2: Draw the outlines - on all perimeter edges (exterior and concave)
    this.graphics.lineStyle(outlineThickness, gameConfig.colors.wallOutline);

    // Collect all perimeter edge segments
    const horizontalEdges: { x1: number, x2: number, y: number }[] = [];
    const verticalEdges: { y1: number, y2: number, x: number }[] = [];

    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * this.tileSize + inset;
      const py = this.mapOffsetY + tile.y * this.tileSize + inset;

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
      this.graphics.beginPath();
      for (const edge of horizontalEdges) {
        this.graphics.moveTo(edge.x1, edge.y);
        this.graphics.lineTo(edge.x2, edge.y);
      }
      this.graphics.strokePath();
    }

    // Draw all vertical edges in one pass
    if (verticalEdges.length > 0) {
      this.graphics.beginPath();
      for (const edge of verticalEdges) {
        this.graphics.moveTo(edge.x, edge.y1);
        this.graphics.lineTo(edge.x, edge.y2);
      }
      this.graphics.strokePath();
    }

    // STEP 3: Draw corner arcs (both exterior and concave)
    for (const tile of region) {
      const px = this.mapOffsetX + tile.x * this.tileSize + inset;
      const py = this.mapOffsetY + tile.y * this.tileSize + inset;

      const hasWallAbove = regionSet.has(`${tile.x},${tile.y - 1}`);
      const hasWallBelow = regionSet.has(`${tile.x},${tile.y + 1}`);
      const hasWallLeft = regionSet.has(`${tile.x - 1},${tile.y}`);
      const hasWallRight = regionSet.has(`${tile.x + 1},${tile.y}`);

      // Exterior corners (convex)
      if (!hasWallAbove && !hasWallLeft) {
        drawCorner(this.graphics, px + radius, py + radius, radius, 180, 270);
      }

      if (!hasWallAbove && !hasWallRight) {
        drawCorner(this.graphics, px + wallSize - radius, py + radius, radius, 270, 360);
      }

      if (!hasWallBelow && !hasWallLeft) {
        drawCorner(this.graphics, px + radius, py + wallSize - radius, radius, 90, 180);
      }

      if (!hasWallBelow && !hasWallRight) {
        drawCorner(this.graphics, px + wallSize - radius, py + wallSize - radius, radius, 0, 90);
      }

      // Concave corners are handled by the straight edge segments added above
      // No rounded arcs needed for concave corners - they form sharp right angles
    }
  }

  private drawPenDoor(tiles: ICoordinate[]): void {
    const offset = gameConfig.map.wallEdgeOffset;
    const adjustedOffset = offset / gameConfig.map.thinWallAdjustment;
    const inset = this.tileSize * adjustedOffset;
    const outlineThickness = gameConfig.map.wallOutlineThickness;
    const barHeight = this.tileSize * 0.3;

    // Sort tiles by x coordinate to find leftmost and rightmost
    tiles.sort((a, b) => a.x - b.x);
    const leftmost = tiles[0];
    const rightmost = tiles[tiles.length - 1];

    // Extend to fill gaps on left and right sides
    // Start from the left edge of the leftmost tile (before inset)
    const startX = this.mapOffsetX + leftmost.x * this.tileSize;
    // End at the right edge of the rightmost tile (after inset + wallSize)
    const endX = this.mapOffsetX + (rightmost.x + 1) * this.tileSize;
    const totalWidth = endX - startX;
    const py = this.mapOffsetY + leftmost.y * this.tileSize + inset;

    // Draw fill as one continuous bar spanning full width
    this.graphics.fillStyle(gameConfig.colors.penDoor);
    this.graphics.fillRect(startX, py, totalWidth, barHeight);

    // Draw outline
    this.graphics.lineStyle(outlineThickness, gameConfig.colors.wallOutline);
    this.graphics.beginPath();
    // Top edge
    this.graphics.moveTo(startX, py);
    this.graphics.lineTo(endX, py);
    // Bottom edge
    this.graphics.moveTo(startX, py + barHeight);
    this.graphics.lineTo(endX, py + barHeight);
    // Left edge
    this.graphics.moveTo(startX, py);
    this.graphics.lineTo(startX, py + barHeight);
    // Right edge
    this.graphics.moveTo(endX, py);
    this.graphics.lineTo(endX, py + barHeight);
    this.graphics.strokePath();
  }

  drawMap(): Phaser.GameObjects.Rectangle[] {
    // Create visited array for flood fill
    const visited: boolean[][] = [];
    for (let y = 0; y < this.mapData.map.length; y++) {
      visited[y] = new Array(this.mapData.map[y].length).fill(false);
    }

    // Collect pen door tiles to draw as one connected region
    const penDoorTiles: ICoordinate[] = [];
    const rectangles: Phaser.GameObjects.Rectangle[] = [];

    // Process all tiles
    for (let y = 0; y < this.mapData.map.length; y++) {
      for (let x = 0; x < this.mapData.map[y].length; x++) {
        const tile = this.mapData.map[y][x];

        if (tile === 1 && !visited[y][x]) {
          // Wall - find connected region and draw it
          const region = this.floodFillWallRegion(x, y, visited);
          this.drawWallRegion(region);
        } else if (tile === 2) {
          // Pen interior
          const rect = this.scene.add.rectangle(
            this.mapOffsetX + x * this.tileSize,
            this.mapOffsetY + y * this.tileSize,
            this.tileSize,
            this.tileSize,
            gameConfig.colors.wall
          ).setOrigin(0).setAlpha(0.3);
          rectangles.push(rect);
        } else if (tile === 3) {
          // Collect pen door tiles
          penDoorTiles.push({ x, y });
        } else if (tile === 4) {
          // Tunnel
          const rect = this.scene.add.rectangle(
            this.mapOffsetX + x * this.tileSize,
            this.mapOffsetY + y * this.tileSize,
            this.tileSize,
            this.tileSize,
            gameConfig.colors.tunnel
          ).setOrigin(0).setAlpha(0.5);
          rectangles.push(rect);
        }
      }
    }

    // Draw pen door as one connected region
    if (penDoorTiles.length > 0) {
      this.drawPenDoor(penDoorTiles);
    }

    return rectangles;
  }

  createPellets(): IPelletData {
    const pellets: Phaser.GameObjects.Arc[][] = [];
    const powerups: Phaser.GameObjects.Sprite[] = [];
    const doorStartX = this.mapData.penDoor.x;
    const doorY = this.mapData.penDoor.y;
    const doorWidth = gameConfig.map.enemyPen.doorWidth;

    for (let y = 0; y < this.mapData.map.length; y++) {
      pellets[y] = [];
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

          const pellet = this.scene.add.circle(
            this.mapOffsetX + x * this.tileSize + this.tileSize / 2,
            this.mapOffsetY + y * this.tileSize + this.tileSize / 2,
            this.tileSize * gameConfig.map.pellet.size,
            gameConfig.colors.pellet
          );
          pellets[y][x] = pellet;
        }
      }
    }

    // Add powerups from map data
    for (const powerPelletPos of this.mapData.powerPellets) {
      const x = powerPelletPos.x;
      const y = powerPelletPos.y;

      // Remove regular pellet if it exists
      if (pellets[y]?.[x]) {
        pellets[y][x].destroy();
      }

      // Create powerup sprite
      const powerup = this.scene.add.sprite(
        this.mapOffsetX + x * this.tileSize + this.tileSize / 2,
        this.mapOffsetY + y * this.tileSize + this.tileSize / 2,
        'atlas',
        'powerup.png'
      );

      // Scale sprite based on config value
      const targetSize = this.tileSize * gameConfig.map.powerup.scale;
      const spriteScale = targetSize / powerup.width;
      powerup.setScale(spriteScale);

      powerups.push(powerup);

      if (!pellets[y]) {
        pellets[y] = [];
      }
      pellets[y][x] = powerup;
    }

    return { pellets, powerups };
  }
}
