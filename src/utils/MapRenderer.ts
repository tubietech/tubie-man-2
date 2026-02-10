import Phaser from 'phaser';
import { IMapData } from '../interfaces/IMapData';
import { IPelletData } from '../interfaces/IPelletData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { gameConfig } from '../config/gameConfig';
import { IMapColorPalette } from '../config/mapColorPalettes';
import { findConnectedWallSections, traceWallOutline, thinWalls, enforceMinimumThickness, roundCorners } from './renderUtils';
import { LogGroup } from '../enums/LogGroup';
import { Logger } from './Logger';

export class MapRenderer {
  private scene: Phaser.Scene;
  private mapData: IMapData;
  private graphics: Phaser.GameObjects.Graphics;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private tileSize: number;
  private colorPalette: IMapColorPalette;
  private mapTexture: Phaser.GameObjects.Image | null = null;
  private static textureCounter: number = 0;
  private logger: Logger;
  private wallSections: ICoordinate[][] = [];
  private penDoorTiles: ICoordinate[] = [];
  

  constructor(
    scene: Phaser.Scene,
    mapData: IMapData,
    graphics: Phaser.GameObjects.Graphics,
    mapOffsetX: number,
    mapOffsetY: number,
    tileSize: number,
    colorPalette: IMapColorPalette
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.graphics = graphics;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;
    this.tileSize = tileSize;
    this.colorPalette = colorPalette;
    
    this.logger = new Logger(LogGroup.RENDERER);
  }

  /**
   * Draw a wall region using the new optimized polygon approach.
   * Pipeline: outline tracing → wall thinning → thickness enforcement → corner rounding → rendering
   * This provides better performance and visual quality than tile-based rendering.
   */
  private drawWallRegion(region: ICoordinate[]): void {


    if (region.length === 0) return;

    const radius = gameConfig.map.wallRadius;
    const arcSegments = 8; // Number of segments per rounded corner

    this.logger.log(`Drawing wall region with ${region.length} tiles using polygon approach`);

    // Step 1: Trace the outline of the wall region
    const outlines = traceWallOutline(region);

    if (outlines.length === 0) {
      this.logger.warn('No outlines traced for wall region');
      return;
    }

    // Step 2: For each outline (can have multiple if there are holes)
    for (const outline of outlines) {
      // Step 3: Thin the walls by applying inset
      const insetFraction = gameConfig.map.wallEdgeOffset;
      const thinnedOutline = thinWalls(outline, insetFraction);

      // Step 4: Enforce minimum wall thickness (prevents over-thinning)
      const minThickness = gameConfig.map.minimumWallThickness;
      const thicknessEnforcedOutline = enforceMinimumThickness(thinnedOutline, minThickness);

      // Step 5: Round the corners (radius is in grid units)
      const radiusInGridUnits = radius / this.tileSize;
      const roundedOutline = roundCorners(thicknessEnforcedOutline, radiusInGridUnits, arcSegments);

      // Step 6: Convert from grid coordinates to screen coordinates
      const points: Phaser.Geom.Point[] = [];
      for (const [x, y] of roundedOutline) {
        const screenX = this.mapOffsetX + x * this.tileSize;
        const screenY = this.mapOffsetY + y * this.tileSize;
        points.push(new Phaser.Geom.Point(screenX, screenY));
      }

      // Step 7: Draw the filled polygon
      this.graphics.fillStyle(this.colorPalette.wall);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.graphics.lineTo(points[i].x, points[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Step 8: Draw the outline
      this.graphics.lineStyle(gameConfig.map.wallOutlineThickness, this.colorPalette.wallOutline);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.graphics.lineTo(points[i].x, points[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    }
  }

  private drawPenDoor(tiles: ICoordinate[]): void {
    const offset = gameConfig.map.wallEdgeOffset;
    const inset = this.tileSize * offset;
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
    this.graphics.fillStyle(gameConfig.map.colors.penDoor);
    this.graphics.fillRect(startX, py, totalWidth, barHeight);

    // Draw outline
    this.graphics.lineStyle(outlineThickness, this.colorPalette.wallOutline);
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
    this.logger.log('Starting optimized wall rendering');

    // Step 1: Find all connected wall sections in the map
    this.wallSections = findConnectedWallSections(this.mapData.map);
    this.logger.log(`Found ${this.wallSections.length} wall sections`);

    // Step 2: Draw each wall section using the polygon approach
    for (const section of this.wallSections) {
      this.drawWallRegion(section);
    }

    // Collect pen door tiles to draw as one connected region
    this.penDoorTiles = [];
    const rectangles: Phaser.GameObjects.Rectangle[] = [];

    // Process non-wall tiles
    for (let y = 0; y < this.mapData.map.length; y++) {
      for (let x = 0; x < this.mapData.map[y].length; x++) {
        const tile = this.mapData.map[y][x];

        if (tile === 2) {
          // Pen interior
          const rect = this.scene.add.rectangle(
            this.mapOffsetX + x * this.tileSize,
            this.mapOffsetY + y * this.tileSize,
            this.tileSize,
            this.tileSize,
            this.colorPalette.wall
          ).setOrigin(0).setAlpha(0.3);
          rectangles.push(rect);
        } else if (tile === 3) {
          // Collect pen door tiles
          this.penDoorTiles.push({ x, y });
        } else if (tile === 4) {
          // Tunnel
          const rect = this.scene.add.rectangle(
            this.mapOffsetX + x * this.tileSize,
            this.mapOffsetY + y * this.tileSize,
            this.tileSize,
            this.tileSize,
            gameConfig.map.colors.tunnel
          ).setOrigin(0).setAlpha(0.5);
          rectangles.push(rect);
        }
      }
    }

    // Draw pen door as one connected region
    if (this.penDoorTiles.length > 0) {
      this.drawPenDoor(this.penDoorTiles);
    }

    // Generate texture from the graphics object for reuse
    this.generateMapTexture();

    return rectangles;
  }

  /**
   * Generate a texture from the drawn graphics for optimal performance.
   * This converts the graphics into a single reusable texture.
   */
  private generateMapTexture(): void {
    // Create unique texture key
    const textureKey = `map_texture_${MapRenderer.textureCounter++}`;

    // Calculate canvas dimensions (full viewport)
    const canvasWidth = this.scene.cameras.main.width;
    const canvasHeight = this.scene.cameras.main.height;

    // Pre-create the texture to avoid lazy initialization warning
    // This tells WebGL the exact format and size upfront
    if (!this.scene.textures.exists(textureKey)) {
      this.scene.textures.createCanvas(textureKey, canvasWidth, canvasHeight);
    }

    // Generate texture from graphics capturing the entire canvas including offsets
    this.graphics.generateTexture(textureKey, canvasWidth, canvasHeight);

    // Create image from texture at position (0, 0) since texture includes offsets
    this.mapTexture = this.scene.add.image(0, 0, textureKey);
    this.mapTexture.setOrigin(0, 0);
    this.mapTexture.setDepth(-1000); // Put behind everything else with very low depth
    this.mapTexture.setVisible(true); // Ensure it's visible

    // Clear the graphics object now that we have the texture
    this.graphics.clear();

    this.logger.log(`Generated map texture: ${textureKey} (${canvasWidth}x${canvasHeight})`);
  }

  /**
   * Destroy the map texture when no longer needed
   */
  public destroy(): void {
    if (this.mapTexture) {
      const textureKey = this.mapTexture.texture.key;
      this.mapTexture.destroy();
      this.mapTexture = null;

      // Destroy the texture from the texture manager
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }
    }
  }

  /**
   * Redraw walls with a different color palette, replacing the existing map texture.
   * Uses cached wall sections from the initial drawMap() call.
   */
  redrawWalls(palette: IMapColorPalette): void {
    // Destroy the old texture
    if (this.mapTexture) {
      const textureKey = this.mapTexture.texture.key;
      this.mapTexture.destroy();
      this.mapTexture = null;
      if (this.scene.textures.exists(textureKey))
        this.scene.textures.remove(textureKey);
    }

    // Temporarily swap palette and redraw walls
    const originalPalette = this.colorPalette;
    this.colorPalette = palette;

    for (const section of this.wallSections)
      this.drawWallRegion(section);

    if (this.penDoorTiles.length > 0)
      this.drawPenDoor(this.penDoorTiles);

    // Generate new texture from the redrawn graphics
    this.generateMapTexture();

    // Restore original palette
    this.colorPalette = originalPalette;
  }

  createPellets(): IPelletData {
    const pellets: (Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite)[][] = [];
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
            gameConfig.map.colors.pellet
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
