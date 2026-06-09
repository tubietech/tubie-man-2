import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';
import { ICell } from '../interfaces/ICell';
import { IPenData } from '../interfaces/IPenData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { ITunnel } from '../interfaces/ITunnel';
import { Direction } from '../enums/Direction';
import { MapTile } from '../enums/MapTile';
import { MapValue } from '../enums/MapValue';
import { getRandomInt, shuffleArray, getRandomArrayElement, generateMapHash } from './utils';
import { getRandomPreloadedMap } from './preloadedMaps';
import { BonusPathGenerator } from './BonusPathGenerator';
import { Logger } from './Logger';
import { LogGroup } from '../enums/LogGroup';

export class MapGeneratorV2 {
  private static cells: ICell[] = [];
  private static tallRows: { [key: number]: number } = {};
  private static narrowCols: { [key: number]: number } = {};
  private static previousHash: string | null = null;

  /**
   * Generate a complete map with all features
   * Falls back to preloaded maps if generation fails
   * Note: Preloaded maps should be loaded during MenuScene for best performance
   */
  static async generate(width: number, height: number): Promise<IMapData> {
    const logger = new Logger(LogGroup.MAP);
    let attempts = 0;

    while (attempts < gameConfig.map.generation.maxGenerationAttempts) {
      try {
        logger.log(`Map generation attempt ${attempts + 1}/${gameConfig.map.generation.maxGenerationAttempts}`);

        const mapData = this.attemptGeneration(width, height);

        // Generate hash for the map
        const hash = generateMapHash(mapData);

        // Check if this map is identical to the previous one
        if (hash === this.previousHash) {
          logger.log('Generated map is identical to previous map, regenerating...');
          attempts++;
          continue;
        }

        // Store hash and assign to map data
        this.previousHash = hash;
        mapData.hash = hash;

        logger.log('Map generation successful!');
        return mapData;

      } catch (error) {
        attempts++;
        if (attempts >= gameConfig.map.generation.maxGenerationAttempts) {
          logger.error(`Map generation failed after ${gameConfig.map.generation.maxGenerationAttempts} attempts: ${error}`);

          // Try to use a preloaded map as fallback
          logger.log('Attempting to use preloaded map as fallback...');
          const preloadedMap = getRandomPreloadedMap();

          if (preloadedMap) {
            logger.log(`✓ Using preloaded map (hash: ${preloadedMap.hash}) as fallback`);
            this.previousHash = preloadedMap.hash;
            return preloadedMap;
          }

          // No preloaded maps available, throw error
          throw new Error(`Map generation failed after ${gameConfig.map.generation.maxGenerationAttempts} attempts and no preloaded maps available: ${error}`);
        }
        logger.log(`Map generation failed, retrying... (${error})`);
      }
    }

    throw new Error('Map generation failed - should not reach here');
  }

  /**
   * Attempt to generate a valid map using cell-based algorithm
   */
  private static attemptGeneration(width: number, height: number): IMapData {
    // Reset state
    this.cells = [];
    this.tallRows = {};
    this.narrowCols = {};

    // Generate the cell grid and convert to tiles
    this.genRandom();
    const tiles = this.getTiles();

    // Convert tiles string to 2D number array
    const map = this.tilesToMap(tiles, width, height);

    // Find pen, door, tunnels, and powerups
    const penData = this.findPenData(map, width, height);
    const tunnels = this.findTunnels(map, width, height);
    const powerups = this.findPowerups(map, width, height);

    // Set player start position
    const playerX = Math.floor(width / 2);
    const playerY = height - 1 - gameConfig.player.playerStartingHeight;

    const mapData: IMapData = {
      map,
      tunnels,
      penCenter: penData.penCenter,
      penDoor: penData.penDoor,
      penBounds: penData.penBounds,
      playerStart: { x: playerX, y: playerY },
      powerPellets: powerups,
      bonusPath: [],
      hash: '' // Will be populated by generate() method
    };

    // Generate bonus path if there are tunnels
    if (tunnels.length > 0) {
      const entryTunnelIndex = 0;
      mapData.bonusPath = BonusPathGenerator.generateBonusPath(mapData, entryTunnelIndex);
    }

    if (this.hasDeadEnds(map, mapData.tunnels.map(t => t.location)))
      throw new Error('Map contains pellet dead ends');

    return mapData;
  }

  /**
   * Check whether any pellet tile (PATH or POWERUP) has only one walkable neighbour,
   * which would make it an unnavigable dead end for enemies.
   * TUNNEL, EMPTY, PEN_INTERIOR, and PEN_DOOR tiles are excluded — they either have
   * no pellets or are handled separately.
   */
  private static hasDeadEnds(map: number[][], tunnelLocations: ICoordinate[]): boolean {
    const height = map.length;
    const width = map[0].length;
    const tunnelSet = new Set(tunnelLocations.map(t => `${t.x},${t.y}`));

    const isWalkable = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || y >= height || x >= width) return false;
      const v = map[y][x];
      return v === MapValue.PATH || v === MapValue.PEN_INTERIOR || v === MapValue.PEN_DOOR ||
             v === MapValue.TUNNEL || v === MapValue.POWERUP || v === MapValue.EMPTY;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = map[y][x];
        if (v !== MapValue.PATH && v !== MapValue.POWERUP) continue;
        // Tunnel tiles wrap around — skip them, they are never true dead ends
        if (tunnelSet.has(`${x},${y}`)) continue;

        const walkableNeighbours =
          (isWalkable(x - 1, y) ? 1 : 0) +
          (isWalkable(x + 1, y) ? 1 : 0) +
          (isWalkable(x, y - 1) ? 1 : 0) +
          (isWalkable(x, y + 1) ? 1 : 0);

        if (walkableNeighbours <= 1) return true;
      }
    }

    return false;
  }

  /**
   * Rotate direction functions
   */
  private static rotateAboutFace(dir: Direction): Direction {
    return (dir + 2) % 4;
  }

  /**
   * Initialize cell grid
   */
  private static reset(): void {
    const rows = gameConfig.map.generation.gridRows;
    const cols = gameConfig.map.generation.gridCols;

    // Initialize cells
    this.cells = [];
    for (let i = 0; i < rows * cols; i++) {
      this.cells[i] = {
        x: i % cols,
        y: Math.floor(i / cols),
        filled: false,
        connect: [false, false, false, false],
        next: [],
        no: -1,
        group: -1
      };
    }

    // Allow each cell to refer to surrounding cells by direction
    for (let i = 0; i < rows * cols; i++) {
      const c = this.cells[i];
      if (c.x > 0) c.next[Direction.LEFT] = this.cells[i - 1];
      if (c.x < cols - 1) c.next[Direction.RIGHT] = this.cells[i + 1];
      if (c.y > 0) c.next[Direction.UP] = this.cells[i - cols];
      if (c.y < rows - 1) c.next[Direction.DOWN] = this.cells[i + cols];
    }

    // Define the enemy pen square (center of grid)
    let i = 3 * cols;
    let c = this.cells[i];
    c.filled = true;
    c.connect[Direction.LEFT] = c.connect[Direction.RIGHT] = c.connect[Direction.DOWN] = true;

    i++;
    c = this.cells[i];
    c.filled = true;
    c.connect[Direction.LEFT] = c.connect[Direction.DOWN] = true;

    i += cols - 1;
    c = this.cells[i];
    c.filled = true;
    c.connect[Direction.LEFT] = c.connect[Direction.UP] = c.connect[Direction.RIGHT] = true;

    i++;
    c = this.cells[i];
    c.filled = true;
    c.connect[Direction.UP] = c.connect[Direction.LEFT] = true;
  }

  /**
   * Generate random maze structure
   */
  private static genRandom(): void {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    const getLeftMostEmptyCells = (): ICell[] => {
      const leftCells: ICell[] = [];
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const c = this.cells[x + y * cols];
          if (!c.filled) {
            leftCells.push(c);
          }
        }
        if (leftCells.length > 0) {
          break;
        }
      }
      return leftCells;
    };

    const isOpenCell = (cell: ICell, i: Direction, prevDir: Direction, size: number): boolean => {
      // Prevent wall from going through starting position
      if (cell.y === 6 && cell.x === 0 && i === Direction.DOWN ||
          cell.y === 7 && cell.x === 0 && i === Direction.UP) {
        return false;
      }

      // Prevent long straight pieces of length 3
      if (size === 2 && (i === prevDir || this.rotateAboutFace(i) === prevDir)) {
        return false;
      }

      // Examine an adjacent empty cell
      if (cell.next[i] && !cell.next[i]!.filled) {
        // Only open if the cell to the left of it is filled
        if (cell.next[i]!.next[Direction.LEFT] && !cell.next[i]!.next[Direction.LEFT]!.filled) {
          return false;
        }
        return true;
      }

      return false;
    };

    const getOpenCells = (cell: ICell, prevDir: Direction, size: number): { openCells: Direction[], numOpenCells: number } => {
      const openCells: Direction[] = [];
      let numOpenCells = 0;
      for (let i = 0; i < 4; i++) {
        if (isOpenCell(cell, i as Direction, prevDir, size)) {
          openCells.push(i as Direction);
          numOpenCells++;
        }
      }
      return { openCells, numOpenCells };
    };

    const connectCell = (cell: ICell, dir: Direction): void => {
      cell.connect[dir] = true;
      cell.next[dir]!.connect[this.rotateAboutFace(dir)] = true;
      if (cell.x === 0 && dir === Direction.RIGHT) {
        cell.connect[Direction.LEFT] = true;
      }
    };

    const gen = (): void => {
      let numFilled = 0;
      let numGroups: number;

      const probStopGrowingAtSize = [0, 0, 0.10, 0.5, 0.75, 1];

      // Single cell counts
      const singleCount: { [key: number]: number } = {};
      singleCount[0] = singleCount[rows - 1] = 0;
      const probTopAndBotSingleCellJoin = 0.35;

      // Long pieces tracking
      let longPieces = 0;
      const maxLongPieces = 1;
      const probExtendAtSize2 = 1;
      const probExtendAtSize3or4 = 0.5;

      const fillCell = (cell: ICell): void => {
        cell.filled = true;
        cell.no = numFilled++;
        cell.group = numGroups;
      };

      for (numGroups = 0; ; numGroups++) {
        // Find all the leftmost empty cells
        const openCells = getLeftMostEmptyCells();
        const numOpenCells = openCells.length;

        if (numOpenCells === 0) {
          break;
        }

        // Choose random cell and fill it
        const firstCell = openCells[getRandomInt(0, numOpenCells - 1)];
        let cell = firstCell;
        fillCell(cell);

        // Randomly allow one single-cell piece on top or bottom
        if (cell.x < cols - 1 && (cell.y in singleCount) && Math.random() <= probTopAndBotSingleCellJoin) {
          if (singleCount[cell.y] === 0) {
            cell.connect[cell.y === 0 ? Direction.UP : Direction.DOWN] = true;
            singleCount[cell.y]++;
            continue;
          }
        }

        let size = 1;

        if (cell.x === cols - 1) {
          // Right edge - don't grow it
          cell.connect[Direction.RIGHT] = true;
          cell.isRaiseHeightCandidate = true;
        } else {
          // Grow the piece up to 5 cells
          let dir: Direction = Direction.UP;
          let newCell: ICell | undefined;

          while (size < 5) {
            let stop = false;

            if (size === 2) {
              // Try to turn horizontal 2-cell into 4-cell "L"
              const c = firstCell;
              if (c.x > 0 && c.connect[Direction.RIGHT] && c.next[Direction.RIGHT] && c.next[Direction.RIGHT]!.next[Direction.RIGHT]) {
                if (longPieces < maxLongPieces && Math.random() <= probExtendAtSize2) {
                  const c2 = c.next[Direction.RIGHT]!.next[Direction.RIGHT]!;
                  const dirs: { [key: number]: boolean } = {};

                  if (isOpenCell(c2, Direction.UP, dir, size)) {
                    dirs[Direction.UP] = true;
                  }
                  if (isOpenCell(c2, Direction.DOWN, dir, size)) {
                    dirs[Direction.DOWN] = true;
                  }

                  let selectedDir: Direction | undefined;
                  if (dirs[Direction.UP] && dirs[Direction.DOWN]) {
                    selectedDir = [Direction.UP, Direction.DOWN][getRandomInt(0, 1)];
                  } else if (dirs[Direction.UP]) {
                    selectedDir = Direction.UP;
                  } else if (dirs[Direction.DOWN]) {
                    selectedDir = Direction.DOWN;
                  }

                  if (selectedDir !== undefined) {
                    connectCell(c2, Direction.LEFT);
                    fillCell(c2);
                    connectCell(c2, selectedDir);
                    fillCell(c2.next[selectedDir]!);
                    longPieces++;
                    size += 2;
                    stop = true;
                  }
                }
              }
            }

            if (!stop) {
              // Find available open adjacent cells
              let result = getOpenCells(cell, dir, size);
              let openCells = result.openCells;
              let numOpenCells = result.numOpenCells;

              // If no open cells and size is 2, use last cell as new center
              if (numOpenCells === 0 && size === 2 && newCell) {
                cell = newCell;
                result = getOpenCells(cell, dir, size);
                openCells = result.openCells;
                numOpenCells = result.numOpenCells;
              }

              if (numOpenCells === 0) {
                stop = true;
              } else {
                // Choose random direction to grow
                dir = openCells[getRandomInt(0, numOpenCells - 1)];
                newCell = cell.next[dir];

                connectCell(cell, dir);
                fillCell(newCell!);
                size++;

                // Don't let center pieces grow past 3 cells
                if (firstCell.x === 0 && size === 3) {
                  stop = true;
                }

                // Probability to stop growing
                if (Math.random() <= probStopGrowingAtSize[size]) {
                  stop = true;
                }
              }
            }

            // Close the piece
            if (stop) {
              if (size === 2) {
                // Vertical 2-cell at right edge
                const c = firstCell;
                if (c.x === cols - 1) {
                  const topCell = c.connect[Direction.UP] ? c.next[Direction.UP]! : c;
                  topCell.connect[Direction.RIGHT] = true;
                  topCell.next[Direction.DOWN]!.connect[Direction.RIGHT] = true;
                }
              } else if (size === 3 || size === 4) {
                // Try to extend with long leg
                if (longPieces < maxLongPieces && firstCell.x > 0 && Math.random() <= probExtendAtSize3or4) {
                  const dirs: Direction[] = [];
                  for (let i = 0; i < 4; i++) {
                    if (cell.connect[i] && isOpenCell(cell.next[i]!, i as Direction, dir, size)) {
                      dirs.push(i as Direction);
                    }
                  }
                  if (dirs.length > 0) {
                    const selectedDir = dirs[getRandomInt(0, dirs.length - 1)];
                    const c = cell.next[selectedDir]!;
                    connectCell(c, selectedDir);
                    fillCell(c.next[selectedDir]!);
                    longPieces++;
                  }
                }
              }
              break;
            }
          }
        }
      }

      this.setResizeCandidates();
    };

    // Try to generate valid map
    let genCount = 0;
    while (true) {
      this.reset();
      gen();
      genCount++;

      if (!this.isDesirable()) {
        if (genCount > 100) {
          throw new Error('Could not generate desirable map structure');
        }
        continue;
      }

      this.setUpScaleCoords();
      this.joinWalls();

      if (!this.createTunnels()) {
        if (genCount > 100) {
          throw new Error('Could not create tunnels');
        }
        continue;
      }

      break;
    }
  }

  /**
   * Set which cells can be resized
   */
  private static setResizeCandidates(): void {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    for (let i = 0; i < rows * cols; i++) {
      const c = this.cells[i];
      const q = c.connect;

      // Flexible height candidates
      if ((c.x === 0 || !q[Direction.LEFT]) &&
          (c.x === cols - 1 || !q[Direction.RIGHT]) &&
          q[Direction.UP] !== q[Direction.DOWN]) {
        c.isRaiseHeightCandidate = true;
      }

      // Two horizontal cells
      const c2 = c.next[Direction.RIGHT];
      if (c2) {
        const q2 = c2.connect;
        if ((c.x === 0 || !q[Direction.LEFT]) && !q[Direction.UP] && !q[Direction.DOWN] &&
            (c2.x === cols - 1 || !q2[Direction.RIGHT]) && !q2[Direction.UP] && !q2[Direction.DOWN]) {
          c.isRaiseHeightCandidate = c2.isRaiseHeightCandidate = true;
        }
      }

      // Flexible width candidates
      if (c.x === cols - 1 && q[Direction.RIGHT]) {
        c.isShrinkWidthCandidate = true;
      }

      if ((c.y === 0 || !q[Direction.UP]) &&
          (c.y === rows - 1 || !q[Direction.DOWN]) &&
          q[Direction.LEFT] !== q[Direction.RIGHT]) {
        c.isShrinkWidthCandidate = true;
      }
    }
  }

  /**
   * Check if cell is center of cross
   */
  private static cellIsCrossCenter(c: ICell): boolean {
    return c.connect[Direction.UP] && c.connect[Direction.RIGHT] &&
           c.connect[Direction.DOWN] && c.connect[Direction.LEFT];
  }

  /**
   * Choose which columns should be narrow
   */
  private static chooseNarrowCols(): boolean {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    const canShrinkWidth = (coord: ICoordinate): boolean => {
      if (coord.y === rows - 1) {
        return true;
      }

      // Get right-hand-side bound
      let x0: number;
      let c: ICell, c2: ICell;
      for (x0 = coord.x; x0 < cols; x0++) {
        c = this.cells[x0 + coord.y * cols];
        c2 = c.next[Direction.DOWN]!;
        if ((!c.connect[Direction.RIGHT] || this.cellIsCrossCenter(c)) &&
            (!c2.connect[Direction.RIGHT] || this.cellIsCrossCenter(c2))) {
          break;
        }
      }

      // Build candidates
      const candidates: ICell[] = [];
      for (c2 = this.cells[x0 + coord.y * cols].next[Direction.DOWN]!; c2; c2 = c2.next[Direction.LEFT]!) {
        if (c2.isShrinkWidthCandidate) {
          candidates.push(c2);
        }

        if ((!c2.connect[Direction.LEFT] || this.cellIsCrossCenter(c2)) &&
            (!c2.next[Direction.UP]!.connect[Direction.LEFT] || this.cellIsCrossCenter(c2.next[Direction.UP]!))) {
          break;
        }
      }

      shuffleArray(candidates);

      for (const candidate of candidates) {
        if (canShrinkWidth({ x: candidate.x, y: candidate.y })) {
          candidate.shrinkWidth = true;
          this.narrowCols[candidate.y] = candidate.x;
          return true;
        }
      }

      return false;
    };

    for (let x = cols - 1; x >= 0; x--) {
      const c = this.cells[x];
      if (c.isShrinkWidthCandidate && canShrinkWidth({ x, y: 0 })) {
        c.shrinkWidth = true;
        this.narrowCols[c.y] = c.x;
        return true;
      }
    }

    return false;
  }

  /**
   * Choose which rows should be tall
   */
  private static chooseTallRows(): boolean {
    const cols = gameConfig.map.generation.gridCols;

    const canRaiseHeight = (coord: ICoordinate): boolean => {
      if (coord.x === cols - 1) {
        return true;
      }

      let y0: number;
      let c: ICell, c2: ICell;

      for (y0 = coord.y; y0 >= 0; y0--) {
        c = this.cells[coord.x + y0 * cols];
        c2 = c.next[Direction.RIGHT]!;
        if ((!c.connect[Direction.UP] || this.cellIsCrossCenter(c)) &&
            (!c2.connect[Direction.UP] || this.cellIsCrossCenter(c2))) {
          break;
        }
      }

      // Safety check: ensure y0 is valid
      if (y0 < 0) {
        return false;
      }

      const candidates: ICell[] = [];
      for (c2 = this.cells[coord.x + y0 * cols].next[Direction.RIGHT]!; c2; c2 = c2.next[Direction.DOWN]!) {
        if (c2.isRaiseHeightCandidate) {
          candidates.push(c2);
        }

        if ((!c2.connect[Direction.DOWN] || this.cellIsCrossCenter(c2)) &&
            (!c2.next[Direction.LEFT]!.connect[Direction.DOWN] || this.cellIsCrossCenter(c2.next[Direction.LEFT]!))) {
          break;
        }
      }

      shuffleArray(candidates);

      for (const candidate of candidates) {
        if (canRaiseHeight({ x: candidate.x, y: candidate.y })) {
          candidate.raiseHeight = true;
          this.tallRows[candidate.x] = candidate.y;
          return true;
        }
      }

      return false;
    };

    // From top left, examine cells until hitting enemy pen
    for (let y = 0; y < 3; y++) {
      const c = this.cells[y * cols];
      if (c.isRaiseHeightCandidate && canRaiseHeight({ x: 0, y })) {
        c.raiseHeight = true;
        this.tallRows[c.x] = c.y;
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the generated structure is desirable
   */
  private static isDesirable(): boolean {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    // Ensure solid top right corner
    let c = this.cells[4];
    if (c.connect[Direction.UP] || c.connect[Direction.RIGHT]) {
      return false;
    }

    // Ensure solid bottom right corner
    c = this.cells[rows * cols - 1];
    if (c.connect[Direction.DOWN] || c.connect[Direction.RIGHT]) {
      return false;
    }

    // Check for stacked 2-cell pieces
    const isHori = (x: number, y: number): boolean => {
      const q1 = this.cells[x + y * cols].connect;
      const q2 = this.cells[x + 1 + y * cols].connect;
      return !q1[Direction.UP] && !q1[Direction.DOWN] && (x === 0 || !q1[Direction.LEFT]) && q1[Direction.RIGHT] &&
             !q2[Direction.UP] && !q2[Direction.DOWN] && q2[Direction.LEFT] && !q2[Direction.RIGHT];
    };

    const isVert = (x: number, y: number): boolean => {
      const q1 = this.cells[x + y * cols].connect;
      const q2 = this.cells[x + (y + 1) * cols].connect;
      if (x === cols - 1) {
        return !q1[Direction.LEFT] && !q1[Direction.UP] && !q1[Direction.DOWN] &&
               !q2[Direction.LEFT] && !q2[Direction.UP] && !q2[Direction.DOWN];
      }
      return !q1[Direction.LEFT] && !q1[Direction.RIGHT] && !q1[Direction.UP] && q1[Direction.DOWN] &&
             !q2[Direction.LEFT] && !q2[Direction.RIGHT] && q2[Direction.UP] && !q2[Direction.DOWN];
    };

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        if ((isHori(x, y) && isHori(x, y + 1)) || (isVert(x, y) && isVert(x + 1, y))) {
          if (x === 0) {
            return false;
          }

          // Join the four cells to create a square
          const g = this.cells[x + y * cols].group;
          this.cells[x + y * cols].connect[Direction.DOWN] = true;
          this.cells[x + y * cols].connect[Direction.RIGHT] = true;

          this.cells[x + 1 + y * cols].connect[Direction.DOWN] = true;
          this.cells[x + 1 + y * cols].connect[Direction.LEFT] = true;
          this.cells[x + 1 + y * cols].group = g;

          this.cells[x + (y + 1) * cols].connect[Direction.UP] = true;
          this.cells[x + (y + 1) * cols].connect[Direction.RIGHT] = true;
          this.cells[x + (y + 1) * cols].group = g;

          this.cells[x + 1 + (y + 1) * cols].connect[Direction.UP] = true;
          this.cells[x + 1 + (y + 1) * cols].connect[Direction.LEFT] = true;
          this.cells[x + 1 + (y + 1) * cols].group = g;
        }
      }
    }

    if (!this.chooseTallRows()) {
      return false;
    }

    if (!this.chooseNarrowCols()) {
      return false;
    }

    return true;
  }

  /**
   * Set final coordinates for upscaling
   */
  private static setUpScaleCoords(): void {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    for (let i = 0; i < rows * cols; i++) {
      const c = this.cells[i];
      c.final_x = c.x * 3;
      if (this.narrowCols[c.y] !== undefined && this.narrowCols[c.y] < c.x) {
        c.final_x--;
      }
      c.final_y = c.y * 3;
      if (this.tallRows[c.x] !== undefined && this.tallRows[c.x] < c.y) {
        c.final_y++;
      }
      c.final_w = c.shrinkWidth ? 2 : 3;
      c.final_h = c.raiseHeight ? 4 : 3;
    }
  }

  /**
   * Join walls to boundaries
   */
  private static joinWalls(): void {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    // Join to top boundary
    for (let x = 0; x < cols; x++) {
      const c = this.cells[x];
      if (!c.connect[Direction.LEFT] && !c.connect[Direction.RIGHT] && !c.connect[Direction.UP] &&
          (!c.connect[Direction.DOWN] || !c.next[Direction.DOWN]!.connect[Direction.DOWN])) {
        if ((!c.next[Direction.LEFT] || !c.next[Direction.LEFT]!.connect[Direction.UP]) &&
            (c.next[Direction.RIGHT] && !c.next[Direction.RIGHT]!.connect[Direction.UP])) {
          if (!(c.next[Direction.DOWN] && c.next[Direction.DOWN]!.connect[Direction.RIGHT] &&
                c.next[Direction.DOWN]!.next[Direction.RIGHT]!.connect[Direction.RIGHT])) {
            if (Math.random() <= 0.25) {
              c.connect[Direction.UP] = true;
            }
          }
        }
      }
    }

    // Join to bottom boundary
    for (let x = 0; x < cols; x++) {
      const c = this.cells[x + (rows - 1) * cols];
      if (!c.connect[Direction.LEFT] && !c.connect[Direction.RIGHT] && !c.connect[Direction.DOWN] &&
          (!c.connect[Direction.UP] || !c.next[Direction.UP]!.connect[Direction.UP])) {
        if ((!c.next[Direction.LEFT] || !c.next[Direction.LEFT]!.connect[Direction.DOWN]) &&
            (c.next[Direction.RIGHT] && !c.next[Direction.RIGHT]!.connect[Direction.DOWN])) {
          if (!(c.next[Direction.UP] && c.next[Direction.UP]!.connect[Direction.RIGHT] &&
                c.next[Direction.UP]!.next[Direction.RIGHT]!.connect[Direction.RIGHT])) {
            if (Math.random() <= 0.25) {
              c.connect[Direction.DOWN] = true;
            }
          }
        }
      }
    }

    // Join to right boundary
    for (let y = 1; y < rows - 1; y++) {
      const c = this.cells[cols - 1 + y * cols];
      if (c.raiseHeight) {
        continue;
      }
      if (!c.connect[Direction.RIGHT] && !c.connect[Direction.UP] && !c.connect[Direction.DOWN] &&
          !c.next[Direction.UP]!.connect[Direction.RIGHT] && !c.next[Direction.DOWN]!.connect[Direction.RIGHT]) {
        if (c.connect[Direction.LEFT]) {
          const c2 = c.next[Direction.LEFT]!;
          if (!c2.connect[Direction.UP] && !c2.connect[Direction.DOWN] && !c2.connect[Direction.LEFT]) {
            if (Math.random() <= 0.5) {
              c.connect[Direction.RIGHT] = true;
            }
          }
        }
      }
    }
  }

  /**
   * Create tunnels in the map
   */
  private static createTunnels(): boolean {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;

    // Find tunnel candidates
    const [
      voidTunnelCells,
      topVoidTunnelCells,
      botVoidTunnelCells,
      singleDeadEndCells,
      topSingleDeadEndCells,
      botSingleDeadEndCells,
      edgeTunnelCells,
      topEdgeTunnelCells,
      botEdgeTunnelCells,
      doubleDeadEndCells
    ]: ICell[][] = Array.from({ length: 10 }, () => []);

    for (let y = 0; y < rows; y++) {
      const c = this.cells[cols - 1 + y * cols];
      if (c.connect[Direction.UP]) {
        continue;
      }

      if (c.y > 1 && c.y < rows - 2) {
        edgeTunnelCells.push(c);
        if (c.y <= 2) topEdgeTunnelCells.push(c);
        else if (c.y >= 5) botEdgeTunnelCells.push(c);
      }

      const upDead = !c.next[Direction.UP] || c.next[Direction.UP]!.connect[Direction.RIGHT];
      const downDead = !c.next[Direction.DOWN] || c.next[Direction.DOWN]!.connect[Direction.RIGHT];

      if (c.connect[Direction.RIGHT]) {
        if (upDead) {
          voidTunnelCells.push(c);
          if (c.y <= 2) topVoidTunnelCells.push(c);
          else if (c.y >= 6) botVoidTunnelCells.push(c);
        }
      } else {
        if (c.connect[Direction.DOWN]) {
          continue;
        }
        if (upDead !== downDead) {
          if (!c.raiseHeight && y < rows - 1 && !c.next[Direction.LEFT]!.connect[Direction.LEFT]) {
            singleDeadEndCells.push(c);
            c.singleDeadEndDir = upDead ? Direction.UP : Direction.DOWN;
            const offset = upDead ? 1 : 0;
            if (c.y <= 1 + offset) topSingleDeadEndCells.push(c);
            else if (c.y >= 5 + offset) botSingleDeadEndCells.push(c);
          }
        } else if (upDead && downDead) {
          if (y > 0 && y < rows - 1) {
            if (c.next[Direction.LEFT]!.connect[Direction.UP] && c.next[Direction.LEFT]!.connect[Direction.DOWN]) {
              if (c.y >= 2 && c.y <= 5) {
                doubleDeadEndCells.push(c);
              }
            }
          }
        }
      }
    }

    // Choose tunnels
    const minTunnels = gameConfig.map.minTunnels;
    const maxTunnels = gameConfig.map.maxTunnels;
    const numTunnelsDesired = getRandomInt(minTunnels, maxTunnels);

    const selectSingleDeadEnd = (c: ICell): void => {
      c.connect[Direction.RIGHT] = true;
      if (c.singleDeadEndDir === Direction.UP) {
        c.topTunnel = true;
      } else {
        c.next[Direction.DOWN]!.topTunnel = true;
      }
    };

    if (numTunnelsDesired === 1) {
      let c = getRandomArrayElement(voidTunnelCells);
      if (c) {
        c.topTunnel = true;
      } else if (c = getRandomArrayElement(singleDeadEndCells)) {
        selectSingleDeadEnd(c);
      } else if (c = getRandomArrayElement(edgeTunnelCells)) {
        c.topTunnel = true;
      } else {
        return false;
      }
    } else if (numTunnelsDesired === 2) {
      let c = getRandomArrayElement(doubleDeadEndCells);
      if (c) {
        c.connect[Direction.RIGHT] = true;
        c.topTunnel = true;
        c.next[Direction.DOWN]!.topTunnel = true;
      } else {
        let numCreated = 0;

        // Top tunnel
        c = getRandomArrayElement(topVoidTunnelCells);
        if (c) {
          c.topTunnel = true;
          numCreated++;
        } else if (c = getRandomArrayElement(topSingleDeadEndCells)) {
          selectSingleDeadEnd(c);
          numCreated++;
        } else if (c = getRandomArrayElement(topEdgeTunnelCells)) {
          c.topTunnel = true;
          numCreated++;
        }

        // Bottom tunnel
        c = getRandomArrayElement(botVoidTunnelCells);
        if (c) {
          c.topTunnel = true;
          numCreated++;
        } else if (c = getRandomArrayElement(botSingleDeadEndCells)) {
          selectSingleDeadEnd(c);
          numCreated++;
        } else if (c = getRandomArrayElement(botEdgeTunnelCells)) {
          c.topTunnel = true;
          numCreated++;
        }

        if (numCreated === 0) {
          return false;
        }
      }
    }

    // Check for straight-through tunnels
    for (let y = 0; y < rows; y++) {
      let c: ICell | undefined = this.cells[cols - 1 + y * cols];
      if (c.topTunnel) {
        let exit = true;
        const topy = c.final_y!;
        while (c!.next[Direction.LEFT]) {
          c = c!.next[Direction.LEFT];
          if (!c!.connect[Direction.UP] && c!.final_y === topy) {
            continue;
          } else {
            exit = false;
            break;
          }
        }
        if (exit) {
          return false;
        }
      }
    }

    // Clear unused void tunnels
    const replaceGroup = (oldg: number, newg: number): void => {
      for (let i = 0; i < rows * cols; i++) {
        const c = this.cells[i];
        if (c.group === oldg) {
          c.group = newg;
        }
      }
    };

    for (const c of voidTunnelCells) {
      if (!c.topTunnel) {
        replaceGroup(c.group, c.next[Direction.UP]!.group);
        c.connect[Direction.UP] = true;
        c.next[Direction.UP]!.connect[Direction.DOWN] = true;
      }
    }

    return true;
  }

  /**
   * Convert cell grid to tile string
   */
  private static getTiles(): string {
    const cols = gameConfig.map.generation.gridCols;
    const rows = gameConfig.map.generation.gridRows;
    const subrows = rows * 3 + 1 + 1; // Base grid + 1 for proper spacing
    const subcols = cols * 3 - 1 + 2;
    const midcols = subcols - 2;
    const fullcols = (subcols - 2) * 2;

    const tiles: string[] = new Array(subrows * fullcols).fill(MapTile.WALL);
    const tileCells: (ICell | undefined)[] = new Array(subrows * subcols).fill(undefined);

    const setTile = (coord: ICoordinate, v: string): void => {
      if (coord.x < 0 || coord.x > subcols - 1 || coord.y < 0 || coord.y > subrows - 1) return;
      const x = coord.x - 2;
      tiles[midcols + x + coord.y * fullcols] = v;
      tiles[midcols - 1 - x + coord.y * fullcols] = v;
    };

    const getTile = (coord: ICoordinate): string | undefined => {
      if (coord.x < 0 || coord.x > subcols - 1 || coord.y < 0 || coord.y > subrows - 1) return undefined;
      const x = coord.x - 2;
      return tiles[midcols + x + coord.y * fullcols];
    };

    const setTileCell = (x: number, y: number, cell: ICell): void => {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return;
      x -= 2;
      tileCells[x + y * subcols] = cell;
    };

    const getTileCell = (x: number, y: number): ICell | undefined => {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return undefined;
      x -= 2;
      return tileCells[x + y * subcols];
    };

    // Set tile cells
    for (let i = 0; i < rows * cols; i++) {
      const c = this.cells[i];
      for (let x0 = 0; x0 < c.final_w!; x0++) {
        for (let y0 = 0; y0 < c.final_h!; y0++) {
          setTileCell(c.final_x! + x0, c.final_y! + y0, c);
        }
      }
    }

    // Set path tiles
    for (let y = 0; y < subrows; y++) {
      for (let x = 0; x < subcols; x++) {
        const c = getTileCell(x, y);
        const cl = getTileCell(x - 1, y);
        const cu = getTileCell(x, y - 1);

        if (c) {
          if ((cl && c.group !== cl.group) ||
              (cu && c.group !== cu.group) ||
              (!cu && !c.connect[Direction.UP])) {
            setTile({ x, y }, MapTile.PATH);
          }
        } else {
          if ((cl && (!cl.connect[Direction.RIGHT] || getTile({ x: x - 1, y }) === MapTile.PATH)) ||
              (cu && (!cu.connect[Direction.DOWN] || getTile({ x, y: y - 1 }) === MapTile.PATH))) {
            setTile({ x, y }, MapTile.PATH);
          }
        }

        // Corner connections
        if (getTile({ x: x - 1, y }) === MapTile.PATH && getTile({ x, y: y - 1 }) === MapTile.PATH && getTile({ x: x - 1, y: y - 1 }) === MapTile.WALL) {
          setTile({ x, y }, MapTile.PATH);
        }
      }
    }

    // Extend tunnels
    for (let c: ICell | undefined = this.cells[cols - 1]; c; c = c.next[Direction.DOWN]) {
      if (c.topTunnel) {
        const y = c.final_y!;
        setTile({ x: subcols - 1, y }, MapTile.PATH);
        setTile({ x: subcols - 2, y }, MapTile.PATH);
      }
    }

    // Fill in walls
    for (let y = 0; y < subrows; y++) {
      for (let x = 0; x < subcols; x++) {
        if (getTile({ x, y }) !== MapTile.PATH &&
            (getTile({ x: x - 1, y }) === MapTile.PATH || getTile({ x, y: y - 1 }) === MapTile.PATH ||
             getTile({ x: x + 1, y }) === MapTile.PATH || getTile({ x, y: y + 1 }) === MapTile.PATH ||
             getTile({ x: x - 1, y: y - 1 }) === MapTile.PATH || getTile({ x: x + 1, y: y - 1 }) === MapTile.PATH ||
             getTile({ x: x + 1, y: y + 1 }) === MapTile.PATH || getTile({ x: x - 1, y: y + 1 }) === MapTile.PATH)) {
          setTile({ x, y }, MapTile.WALL_VERTICAL);
        }
      }
    }

    const penDoorX = gameConfig.map.enemyPen.location.x + Math.floor(gameConfig.map.enemyPen.width / 2) - Math.floor(gameConfig.map.enemyPen.doorWidth / 2);
    const penDoorY = gameConfig.map.enemyPen.location.y - 8;

    Logger.logStatic(LogGroup.MAP, `PenDoorX: ${penDoorX}, PenDoorY: ${penDoorY}`);

    // Create enemy pen door
    setTile({ x: 2, y: 11 }, MapTile.PEN_DOOR);

    // Set powerups (energizers)
    const getTopEnergizerRange = (): { miny: number, maxy: number } | null => {
      let miny: number = 0;
      let maxy = subrows / 2;
      const x = subcols - 2;

      for (let y = 2; y < maxy; y++) {
        if (getTile({ x, y }) === MapTile.PATH && getTile({ x, y: y + 1 }) === MapTile.PATH) {
          miny = y + 1;
          break;
        }
      }

      if (miny === 0) return null;

      maxy = Math.min(maxy, miny + 7);
      for (let y = miny + 1; y < maxy; y++) {
        if (getTile({ x: x - 1, y }) === MapTile.PATH) {
          maxy = y - 1;
          break;
        }
      }
      return { miny, maxy };
    };

    const getBotEnergizerRange = (): { miny: number, maxy: number } | null => {
      let miny = subrows / 2;
      let maxy: number = 0;
      const x = subcols - 2;

      for (let y = subrows - 3; y >= miny; y--) {
        if (getTile({ x, y }) === MapTile.PATH && getTile({ x, y: y + 1 }) === MapTile.PATH) {
          maxy = y;
          break;
        }
      }

      if (maxy === 0) return null;

      miny = Math.max(miny, maxy - 7);
      for (let y = maxy - 1; y > miny; y--) {
        if (getTile({ x: x - 1, y }) === MapTile.PATH) {
          miny = y + 1;
          break;
        }
      }
      return { miny, maxy };
    };

    const x = subcols - 2;
    const topRange = getTopEnergizerRange();
    if (topRange) {
      const y = getRandomInt(topRange.miny, topRange.maxy);
      setTile({ x, y }, MapTile.POWERUP);
    }

    const botRange = getBotEnergizerRange();
    if (botRange) {
      const y = getRandomInt(botRange.miny, botRange.maxy);
      setTile({ x, y }, MapTile.POWERUP);
    }

    // Erase pellets in tunnels
    const eraseUntilIntersection = (startX: number, startY: number): void => {
      let x = startX;
      let y = startY;

      while (true) {
        const adj: ICoordinate[] = [];
        if (getTile({ x: x - 1, y }) === MapTile.PATH) adj.push({ x: x - 1, y });
        if (getTile({ x: x + 1, y }) === MapTile.PATH) adj.push({ x: x + 1, y });
        if (getTile({ x, y: y - 1 }) === MapTile.PATH) adj.push({ x, y: y - 1 });
        if (getTile({ x, y: y + 1 }) === MapTile.PATH) adj.push({ x, y: y + 1 });

        if (adj.length === 1) {
          setTile({ x, y }, MapTile.EMPTY);
          x = adj[0].x;
          y = adj[0].y;
        } else {
          break;
        }
      }
    };

    const tunnelX = subcols - 1;
    for (let y = 0; y < subrows; y++) {
      if (getTile({ x: tunnelX, y }) === MapTile.PATH) {
        eraseUntilIntersection(tunnelX, y);
      }
    }

    // Erase pellets on starting position
    setTile({ x: 1, y: subrows - gameConfig.player.playerStartingHeight }, MapTile.EMPTY);

    // Erase pellets around enemy pen
    const penConfig = gameConfig.map.enemyPen;
    const penTop = subrows - penConfig.location.y;
    const penBottom = penTop + penConfig.height * 2;
    const penLeft = penConfig.location.x;
    const penRight = penLeft + penConfig.width;

    // Erase pellets horizontally (top and bottom edges)
    for (let i = penLeft; i < penLeft + penConfig.width + 1; i++) {
      // Bottom of enemy pen
      let y = penBottom;
      setTile({ x: i, y }, MapTile.EMPTY);
      let j = 1;
      while (getTile({ x: i, y: y + j }) === MapTile.PATH &&
             getTile({ x: i - 1, y: y + j }) === MapTile.WALL_VERTICAL &&
             getTile({ x: i + 1, y: y + j }) === MapTile.WALL_VERTICAL) {
        setTile({ x: i, y: y + j }, MapTile.EMPTY);
        j++;
      }

      // Top of enemy pen
      y = penTop;
      setTile({ x: i, y }, MapTile.EMPTY);
      j = 1;
      while (getTile({ x: i, y: y - j }) === MapTile.PATH &&
             getTile({ x: i - 1, y: y - j }) === MapTile.WALL_VERTICAL &&
             getTile({ x: i + 1, y: y - j }) === MapTile.WALL_VERTICAL) {
        setTile({ x: i, y: y - j }, MapTile.EMPTY);
        j++;
      }
    }

    // Side of enemy pen (right edge)
    for (let i = 0; i < penConfig.height * 2; i++) {
      const y = penBottom - i;
      setTile({ x: penRight, y }, MapTile.EMPTY);
      let j = 1;
      while (getTile({ x: penRight + j, y }) === MapTile.PATH &&
             getTile({ x: penRight + j, y: y - 1 }) === MapTile.WALL_VERTICAL &&
             getTile({ x: penRight + j, y: y + 1 }) === MapTile.WALL_VERTICAL) {
        setTile({ x: penRight + j, y }, MapTile.EMPTY);
        j++;
      }
    }

    // Add wall border on top and bottom
    const emptyLine = MapTile.WALL.repeat(fullcols);
    return emptyLine + tiles.join('') + emptyLine;
  }

  /**
   * Convert tile string to 2D map array
   */
  private static tilesToMap(tiles: string, width: number, height: number): number[][] {
    const map: number[][] = [];

    for (let y = 0; y < height; y++) {
      map[y] = new Array(width).fill(MapValue.WALL);
      for (let x = 0; x < width; x++) {
        const idx = x + y * width;
        if (idx < tiles.length) {
          const tile = tiles[idx];
          if (tile === MapTile.PATH || tile === MapTile.POWERUP) {
            map[y][x] = MapValue.PATH;
          } else if (tile === MapTile.EMPTY) {
            map[y][x] = MapValue.EMPTY;
          } else if (tile === MapTile.PEN_DOOR) {
            map[y][x] = MapValue.PEN_DOOR;
          } else if (tile === MapTile.WALL_VERTICAL || tile === MapTile.WALL) {
            map[y][x] = MapValue.WALL;
          }
        }
      }
    }

    return map;
  }

  /**
   * Find pen data in the generated map
   */
  private static findPenData(map: number[][], width: number, height: number): IPenData {
    // Find the pen door
    let doorX = -1;
    let doorY = -1;

    for (let y = 0; y < height && doorY === -1; y++) {
      for (let x = 0; x < width && doorX === -1; x++) {
        if (map[y][x] === MapValue.PEN_DOOR) {
          doorX = x;
          doorY = y;  // Keep door at found position
        }
      }
    }

    // If no door found, create one in the center
    if (doorX === -1) {
      doorX = Math.floor(width / 2);
      doorY = Math.floor(height / 2) - 2;
      map[doorY][doorX] = MapValue.PEN_DOOR;
    }

    // Create pen area around door
    const penWidth = gameConfig.map.enemyPen.width;
    const penHeight = gameConfig.map.enemyPen.height;
    const penLeft = doorX - Math.floor(penWidth / 2) + 1;
    const penRight = penLeft + penWidth - 1;
    const penTop = doorY + 1;  // Interior starts 2 rows below door
    const penBottom = penTop + penHeight - 1;

    // Mark pen interior
    for (let y = penTop; y <= penBottom && y < height; y++) {
      for (let x = penLeft; x <= penRight && x < width; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          map[y][x] = MapValue.PEN_INTERIOR;
        }
      }
    }

    const centerX = Math.floor((penLeft + penRight) / 2);
    const centerY = Math.floor((penTop + penBottom) / 2);

    return {
      penCenter: { x: centerX, y: centerY },
      penDoor: { x: doorX, y: doorY },
      penBounds: {
        minX: penLeft,
        maxX: penRight,
        minY: penTop,
        maxY: penBottom
      }
    };
  }

  /**
   * Find tunnels in the map (edges where paths wrap)
   */
  private static findTunnels(map: number[][], width: number, height: number): ITunnel[] {
    const tunnels: ITunnel[] = [];

    for (let y = 1; y < height - 1; y++) {
      // Check if both edges are walkable (either PATH or EMPTY tiles can be tunnels)
      const leftIsWalkable = map[y][0] === MapValue.PATH || map[y][0] === MapValue.EMPTY;
      const rightIsWalkable = map[y][width - 1] === MapValue.PATH || map[y][width - 1] === MapValue.EMPTY;

      if (leftIsWalkable && rightIsWalkable) {
        // Mark as tunnel
        map[y][0] = MapValue.TUNNEL;
        map[y][width - 1] = MapValue.TUNNEL;

        // Add tunnel entries
        tunnels.push({
          location: { x: 0, y },
          target: { x: width - 1, y }
        });
        tunnels.push({
          location: { x: width - 1, y },
          target: { x: 0, y }
        });
      }
    }

    return tunnels;
  }

  /**
   * Find powerup locations
   */
  private static findPowerups(map: number[][], width: number, height: number): ICoordinate[] {
    const powerups: ICoordinate[] = [];

    // Look for 'o' markers (converted during tile processing)
    // Since we don't preserve 'o' vs '.' in tilesToMap, we need to find good spots
    // Place in corners and some dead ends

    const corners: ICoordinate[] = [
      { x: 1, y: 1 },
      { x: width - 2, y: 1 },
      { x: 1, y: height - 2 },
      { x: width - 2, y: height - 2 }
    ];

    for (const corner of corners) {
      const nearestPath = this.findNearestPath(map, corner.x, corner.y, width, height);
      if (nearestPath && powerups.length < gameConfig.map.powerup.max) {
        powerups.push(nearestPath);
        map[nearestPath.y][nearestPath.x] = MapValue.POWERUP;
      }
    }

    // Add more if needed
    while (powerups.length < gameConfig.map.powerup.min) {
      const x = getRandomInt(1, width - 2);
      const y = getRandomInt(1, height - 2);

      if (map[y][x] === MapValue.PATH) {
        powerups.push({ x, y });
        map[y][x] = MapValue.POWERUP;
      }
    }

    return powerups;
  }

  /**
   * Find nearest path tile to a position
   */
  private static findNearestPath(
    map: number[][],
    startX: number,
    startY: number,
    width: number,
    height: number
  ): ICoordinate | null {
    const maxSearch = 10;

    for (let radius = 0; radius <= maxSearch; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== radius) continue;

          const x = startX + dx;
          const y = startY + dy;

          if (x >= 0 && x < width && y >= 0 && y < height) {
            if (map[y][x] === MapValue.PATH) {
              return { x, y };
            }
          }
        }
      }
    }

    return null;
  }
}
