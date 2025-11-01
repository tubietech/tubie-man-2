import { gameConfig } from '../config/gameConfig';
import { IMapData } from '../interfaces/IMapData';
import { generateMapHash, getRandomInt } from './utils';
import { BonusPathGenerator } from './BonusPathGenerator';

export class MapGenerator {
  private static readonly MAX_GENERATION_ATTEMPTS = 5;
  private static previousHash: string | null = null;

  /**
   * Generate a complete map with all features
   */
  static generate(width: number, height: number): IMapData {
    let attempts = 0;
    let lastMapData: IMapData | null = null;

    while (attempts < this.MAX_GENERATION_ATTEMPTS) {
      try {
        console.log(`Map generation attempt ${attempts + 1}/${this.MAX_GENERATION_ATTEMPTS}`);

        const mapData = this.attemptGeneration(width, height);
        lastMapData = mapData;

        // Verify connectivity with flood fill
        if (!this.verifyConnectivity(mapData.map, width, height, mapData.penBounds)) {
          throw new Error('Map connectivity check failed - disconnected regions detected');
        }

        // Generate hash for the map
        const hash = generateMapHash(mapData);

        // Check if this map is identical to the previous one
        if (hash === this.previousHash) {
          console.log('Generated map is identical to previous map, regenerating...');
          attempts++;
          continue;
        }

        // Store hash and assign to map data
        this.previousHash = hash;
        mapData.hash = hash;

        console.log('Map generation successful!');
        return mapData;

      } catch (error) {
        attempts++;
        if (attempts >= this.MAX_GENERATION_ATTEMPTS) {
          // Print debug map visualization before failing
          if (lastMapData) {
            console.log('\n=== FAILED MAP LAYOUT ===');
            this.printMapDebug(lastMapData);
            console.log('=========================\n');
          }
          throw new Error(`Map generation failed after ${this.MAX_GENERATION_ATTEMPTS} attempts: ${error}`);
        }
        console.log(`Map generation failed, retrying... (${error})`);
      }
    }

    throw new Error('Map generation failed - should not reach here');
  }

  /**
   * Attempt to generate a valid map
   */
  private static attemptGeneration(width: number, height: number): IMapData {
    const halfWidth = Math.floor(width / 2);

    // Initialize map - all walls initially
    const map: number[][] = [];
    for (let y = 0; y < height; y++) {
      map[y] = new Array(width).fill(1);
    }

    // Calculate pen location (center of map)
    const penWidth = gameConfig.map.enemyPen.width;
    const penHeight = gameConfig.map.enemyPen.height;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const penLeft = centerX - Math.floor(penWidth / 2);
    const penRight = penLeft + penWidth - 1;
    const penTop = centerY - Math.floor(penHeight / 2);
    const penBottom = penTop + penHeight - 1;

    // Create pen interior
    for (let y = penTop; y <= penBottom; y++) {
      for (let x = penLeft; x <= penRight; x++) {
        map[y][x] = 2;
      }
    }

    // Create pen walls (surrounding the pen)
    for (let y = penTop - 1; y <= penBottom + 1; y++) {
      for (let x = penLeft - 1; x <= penRight + 1; x++) {
        if (y === penTop - 1 || y === penBottom + 1 || x === penLeft - 1 || x === penRight + 1) {
          if (map[y][x] !== 2) {
            map[y][x] = 1;
          }
        }
      }
    }

    // Create pen door at top center (using penDoorWidth)
    const doorWidth = gameConfig.map.enemyPen.doorWidth;
    const doorY = penTop - 1;

    // Calculate door starting position (centered, bias right if can't center exactly)
    const doorStartX = centerX - Math.floor(doorWidth / 2);

    // Create door tiles
    for (let i = 0; i < doorWidth; i++) {
      const doorX = doorStartX + i;
      if (doorX >= penLeft - 1 && doorX <= penRight + 1) {
        map[doorY][doorX] = 3;
      }
    }

    // Ensure entire pen is surrounded by a path
    for (let y = penTop - 2; y <= penBottom + 2; y++) {
      for (let x = penLeft - 2; x <= penRight + 2; x++) {
        // Skip the pen interior and pen walls themselves
        if (y >= penTop - 1 && y <= penBottom + 1 && x >= penLeft - 1 && x <= penRight + 1) {
          continue;
        }
        // Create path around the pen
        if (y >= 0 && y < height && x >= 0 && x < width) {
          map[y][x] = 0;
        }
      }
    }

    // Calculate player starting position
    const playerX = Math.floor(width / 2);
    const playerY = height - 1 - gameConfig.player.playerStartingHeight;

    // Create perimeter walls on top, bottom, and left only (before mirroring)
    // The left wall will become walls on both sides after mirroring
    for (let x = 0; x < halfWidth; x++) {
      map[0][x] = 1;
      map[height - 1][x] = 1;
    }
    for (let y = 0; y < height; y++) {
      map[y][0] = 1;
    }

    // Generate maze on left half using DFS
    this.generateMazeWithDFS(map, halfWidth, height, penLeft, penRight, penTop, penBottom, doorStartX, doorY, playerX, playerY);

    // Before mirroring, check for vertical path sections at the center line and split them
    this.preventDoublePaths(map, halfWidth, height, penLeft, penRight, penTop, penBottom);

    // Mirror left half to right half (this will also mirror the left wall to become the right wall)
    this.mirrorMapHorizontally(map, width, height);

    // Complete the top and bottom walls for the right half
    for (let x = halfWidth; x < width; x++) {
      map[0][x] = 1;
      map[height - 1][x] = 1;
    }

    // Ensure player start is a path
    map[playerY][playerX] = 0;

    // Generate tunnels
    const numTunnels = getRandomInt(gameConfig.map.minTunnels, gameConfig.map.maxTunnels);
    const tunnels = this.generateTunnels(map, width, height, numTunnels, penTop, penBottom);

    // Detect and manage dead ends
    const deadEnds = this.findDeadEnds(map, width, height, penLeft, penRight, penTop, penBottom);
    this.manageDeadEnds(map, deadEnds, penLeft, penRight, penTop, penBottom);

    // Find remaining dead ends after management
    const finalDeadEnds = this.findDeadEnds(map, width, height, penLeft, penRight, penTop, penBottom);

    // Place powerups
    const powerups = this.placePowerups(map, width, height, finalDeadEnds, penLeft, penRight, penTop, penBottom);

    const mapData: IMapData = {
      map,
      tunnels,
      penCenter: { x: centerX, y: centerY },
      penDoor: { x: doorStartX, y: doorY },
      penBounds: {
        minX: penLeft,
        maxX: penRight,
        minY: penTop,
        maxY: penBottom
      },
      playerStart: { x: playerX, y: playerY },
      powerPellets,
      bonusPath: [],
      hash: '' // Will be populated by generate() method
    };

    // Generate bonus path if there are tunnels
    if (tunnels.length > 0) {
      const entryTunnelIndex = 0; // Use first tunnel by default
      mapData.bonusPath = BonusPathGenerator.generateBonusPath(mapData, entryTunnelIndex);
    }

    return mapData;
  }

  /**
   * Generate maze using Depth-First Search algorithm
   */
  private static generateMazeWithDFS(
    map: number[][],
    halfWidth: number,
    height: number,
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number,
    doorX: number,
    doorY: number,
    playerX: number,
    playerY: number
  ): void {
    // Start from player position
    const startX = Math.floor(halfWidth / 2);
    const startY = playerY;

    // Make starting position a path
    map[startY][startX] = 0;

    // DFS stack
    const stack: { x: number, y: number }[] = [{ x: startX, y: startY }];
    const visited: Set<string> = new Set([`${startX},${startY}`]);

    const directions = [
      { dx: 0, dy: -2 }, // up
      { dx: 0, dy: 2 },  // down
      { dx: -2, dy: 0 }, // left
      { dx: 2, dy: 0 }   // right
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];

      // Shuffle directions for randomness
      const shuffled = [...directions].sort(() => Math.random() - 0.5);
      let moved = false;

      for (const dir of shuffled) {
        const newX = current.x + dir.dx;
        const newY = current.y + dir.dy;
        const key = `${newX},${newY}`;

        // Check bounds (only for left half, but include the center column)
        if (newX < 1 || newX > halfWidth || newY < 1 || newY >= height - 1) {
          continue;
        }

        // Skip if already visited
        if (visited.has(key)) {
          continue;
        }

        // Skip if in or too close to pen area
        if (this.isInOrNearPen(newX, newY, penLeft, penRight, penTop, penBottom)) {
          continue;
        }

        // Valid move - carve path
        const wallX = current.x + dir.dx / 2;
        const wallY = current.y + dir.dy / 2;

        // Don't overwrite pen structures
        if (!this.isInOrNearPen(wallX, wallY, penLeft, penRight, penTop, penBottom)) {
          map[wallY][wallX] = 0;
        }

        if (!this.isInOrNearPen(newX, newY, penLeft, penRight, penTop, penBottom)) {
          map[newY][newX] = 0;
        }

        visited.add(key);
        stack.push({ x: newX, y: newY });
        moved = true;
        break;
      }

      if (!moved) {
        stack.pop();
      }
    }

    // Ensure path connects to door
    this.ensurePathToDoor(map, doorX, doorY, halfWidth);
  }

  /**
   * Check if a position is in or near the pen
   */
  private static isInOrNearPen(
    x: number,
    y: number,
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): boolean {
    return x >= penLeft - 2 && x <= penRight + 2 && y >= penTop - 2 && y <= penBottom + 2;
  }

  /**
   * Ensure there's a path connecting to the pen door
   */
  private static ensurePathToDoor(map: number[][], doorX: number, doorY: number, halfWidth: number): void {
    // The door is at the top of the pen, ensure path above it
    if (doorY - 1 >= 1 && doorX < halfWidth) {
      map[doorY - 1][doorX] = 0;
    }

    // Ensure connection from door to main maze
    let y = doorY - 2;
    while (y >= 1 && map[y][doorX] === 1) {
      map[y][doorX] = 0;
      y--;
    }
  }

  /**
   * Prevent double-wide paths at the center line by splitting vertical path sections
   */
  private static preventDoublePaths(
    map: number[][],
    halfWidth: number,
    height: number,
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): void {
    // Check the rightmost column of the left half (x = halfWidth - 1)
    // When mirrored, this column will be adjacent to its mirror at x = width - 1 - (halfWidth - 1)
    const checkX = halfWidth - 1;

    // Find vertical path segments at checkX
    let y = 1;
    while (y < height - 1) {
      // Skip pen area
      if (y >= penTop - 2 && y <= penBottom + 2) {
        y++;
        continue;
      }

      // Check if this is the start of a vertical path segment
      const isPath = map[y][checkX] === 0 || map[y][checkX] === 5;

      if (!isPath) {
        y++;
        continue;
      }

      // Find the extent of this vertical path segment
      let segmentStart = y;
      let segmentEnd = y;

      while (segmentEnd + 1 < height - 1 &&
             (map[segmentEnd + 1][checkX] === 0 || map[segmentEnd + 1][checkX] === 5) &&
             !(segmentEnd + 1 >= penTop - 2 && segmentEnd + 1 <= penBottom + 2)) {
        segmentEnd++;
      }

      // If this is a vertical segment (more than 1 tile), break it up
      if (segmentEnd > segmentStart) {
        // Place walls at alternating positions to prevent 2-wide corridors when mirrored
        for (let segY = segmentStart; segY <= segmentEnd; segY += 2) {
          // Only place wall if not a powerup
          if (map[segY][checkX] !== 5) {
            map[segY][checkX] = 1;
          }
        }
      }

      // Move past this segment
      y = segmentEnd + 1;
    }
  }

  /**
   * Mirror the left half of the map to the right half
   */
  private static mirrorMapHorizontally(map: number[][], width: number, height: number): void {
    const halfWidth = Math.floor(width / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < halfWidth; x++) {
        const mirrorX = width - 1 - x;

        // Skip if mirroring would write to the same position (center column on odd-width maps)
        if (x === mirrorX) {
          continue;
        }

        // Don't mirror pen interior or door (they're in the center)
        const tile = map[y][x];
        if (tile !== 2 && tile !== 3) {
          map[y][mirrorX] = tile;
        }
      }
    }
  }

  /**
   * Generate tunnels with constraints
   */
  private static generateTunnels(
    map: number[][],
    width: number,
    height: number,
    count: number,
    penTop: number,
    penBottom: number
  ): { x: number, y: number, targetX: number, targetY: number }[] {
    const tunnels: { x: number, y: number, targetX: number, targetY: number }[] = [];
    const usedYValues: Set<number> = new Set();

    let attempts = 0;
    const maxAttempts = 100;

    while (tunnels.length < count * 2 && attempts < maxAttempts) {
      attempts++;

      // Random y position
      const y = 2 + Math.floor(Math.random() * (height - 4));

      // Skip if too close to pen
      if (y >= penTop - 2 && y <= penBottom + 2) {
        continue;
      }

      // Check if y is too close to existing tunnels
      let tooClose = false;
      for (const usedY of usedYValues) {
        if (Math.abs(y - usedY) <= 1) {
          tooClose = true;
          break;
        }
      }

      if (tooClose) {
        continue;
      }

      // Check if there are paths near both edges
      const hasLeftPath = map[y][1] === 0 || map[y - 1]?.[1] === 0 || map[y + 1]?.[1] === 0;
      const hasRightPath = map[y][width - 2] === 0 || map[y - 1]?.[width - 2] === 0 || map[y + 1]?.[width - 2] === 0;

      if (!hasLeftPath || !hasRightPath) {
        continue;
      }

      // Create tunnel
      map[y][0] = 4;
      map[y][width - 1] = 4;

      // Ensure paths lead to tunnels
      if (map[y][1] === 1) map[y][1] = 0;
      if (map[y][width - 2] === 1) map[y][width - 2] = 0;

      usedYValues.add(y);

      // Add both tunnel ends
      tunnels.push({
        x: 0,
        y: y,
        targetX: width - 1,
        targetY: y
      });

      tunnels.push({
        x: width - 1,
        y: y,
        targetX: 0,
        targetY: y
      });
    }

    return tunnels;
  }

  /**
   * Find all dead ends in the map
   */
  private static findDeadEnds(
    map: number[][],
    width: number,
    height: number,
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): { x: number, y: number }[] {
    const deadEnds: { x: number, y: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Skip if not a path
        if (map[y][x] !== 0) {
          continue;
        }

        // Skip area around pen and door
        if (x >= penLeft - 2 && x <= penRight + 2 && y >= penTop - 3 && y <= penBottom + 1) {
          continue;
        }

        // Count walkable neighbors
        let walkableCount = 0;
        if (map[y - 1][x] === 0 || map[y - 1][x] === 3 || map[y - 1][x] === 4) walkableCount++;
        if (map[y + 1][x] === 0 || map[y + 1][x] === 3 || map[y + 1][x] === 4) walkableCount++;
        if (map[y][x - 1] === 0 || map[y][x - 1] === 3 || map[y][x - 1] === 4) walkableCount++;
        if (map[y][x + 1] === 0 || map[y][x + 1] === 3 || map[y][x + 1] === 4) walkableCount++;

        // Dead end has exactly 1 connection
        if (walkableCount === 1) {
          deadEnds.push({ x, y });
        }
      }
    }

    return deadEnds;
  }

  /**
   * Manage dead ends - ensure no more than maxDeadEndsPerHalf per half
   */
  private static manageDeadEnds(
    map: number[][],
    deadEnds: { x: number, y: number }[],
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): void {
    const width = map[0].length;
    const halfWidth = Math.floor(width / 2);
    const maxPerHalf = gameConfig.map.maxDeadEndsPerHalf;

    // Separate dead ends by half
    const leftDeadEnds = deadEnds.filter(de => de.x < halfWidth);
    const rightDeadEnds = deadEnds.filter(de => de.x >= halfWidth);

    // Remove excess dead ends from left half
    while (leftDeadEnds.length > maxPerHalf) {
      const index = Math.floor(Math.random() * leftDeadEnds.length);
      const deadEnd = leftDeadEnds[index];

      this.removeDeadEnd(map, deadEnd.x, deadEnd.y, penLeft, penRight, penTop, penBottom);
      leftDeadEnds.splice(index, 1);
    }

    // Remove excess dead ends from right half
    while (rightDeadEnds.length > maxPerHalf) {
      const index = Math.floor(Math.random() * rightDeadEnds.length);
      const deadEnd = rightDeadEnds[index];

      this.removeDeadEnd(map, deadEnd.x, deadEnd.y, penLeft, penRight, penTop, penBottom);
      rightDeadEnds.splice(index, 1);
    }
  }

  /**
   * Remove a dead end by opening up one of the surrounding walls
   */
  private static removeDeadEnd(
    map: number[][],
    x: number,
    y: number,
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): void {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    // Shuffle directions
    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    for (const dir of shuffled) {
      const newX = x + dir.dx;
      const newY = y + dir.dy;

      // Check if it's a wall
      if (map[newY]?.[newX] === 1) {
        // Don't carve through pen or outer walls
        if (this.isInOrNearPen(newX, newY, penLeft, penRight, penTop, penBottom)) {
          continue;
        }
        if (newX <= 0 || newX >= map[0].length - 1 || newY <= 0 || newY >= map.length - 1) {
          continue;
        }

        // Carve through the wall
        map[newY][newX] = 0;

        // Try to connect further
        const nextX = newX + dir.dx;
        const nextY = newY + dir.dy;
        if (map[nextY]?.[nextX] === 1 &&
            !this.isInOrNearPen(nextX, nextY, penLeft, penRight, penTop, penBottom) &&
            nextX > 0 && nextX < map[0].length - 1 && nextY > 0 && nextY < map.length - 1) {
          map[nextY][nextX] = 0;
        }

        return;
      }
    }
  }

  /**
   * Place powerups in corners and dead ends
   */
  private static placePowerups(
    map: number[][],
    width: number,
    height: number,
    deadEnds: { x: number, y: number }[],
    penLeft: number,
    penRight: number,
    penTop: number,
    penBottom: number
  ): { x: number, y: number }[] {
    const powerups: { x: number, y: number }[] = [];

    // Find corners (far 4 corners of the map)
    const corners = [
      { x: 1, y: 1 },
      { x: width - 2, y: 1 },
      { x: 1, y: height - 2 },
      { x: width - 2, y: height - 2 }
    ];

    // Find nearest path to each corner
    for (const corner of corners) {
      const nearestPath = this.findNearestPath(map, corner.x, corner.y, width, height);
      if (nearestPath) {
        powerups.push(nearestPath);
        map[nearestPath.y][nearestPath.x] = 5;
      }
    }

    // Place powerups in dead ends (if needed to meet minimum)
    const minPowerups = gameConfig.map.powerup.min;
    const maxPowerups = gameConfig.map.powerup.max;

    for (const deadEnd of deadEnds) {
      if (powerups.length >= maxPowerups) {
        break;
      }

      // Check if not already marked
      if (map[deadEnd.y][deadEnd.x] === 0) {
        powerups.push(deadEnd);
        map[deadEnd.y][deadEnd.x] = 5;
      }
    }

    // Verify we have enough
    if (powerups.length < minPowerups) {
      throw new Error(`Not enough powerups: ${powerups.length} < ${minPowerups}`);
    }

    return powerups;
  }

  /**
   * Find nearest path tile to a given position
   */
  private static findNearestPath(
    map: number[][],
    startX: number,
    startY: number,
    width: number,
    height: number
  ): { x: number, y: number } | null {
    const maxSearch = 10;

    for (let radius = 0; radius <= maxSearch; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== radius) continue;

          const x = startX + dx;
          const y = startY + dy;

          if (x >= 0 && x < width && y >= 0 && y < height) {
            if (map[y][x] === 0) {
              return { x, y };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Verify all paths are connected using flood fill
   */
  private static verifyConnectivity(
    map: number[][],
    width: number,
    height: number,
    penBounds: { minX: number, maxX: number, minY: number, maxY: number }
  ): boolean {
    // Create visited array
    const visited: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      visited[y] = new Array(width).fill(false);
    }

    // Find starting point (any walkable tile outside pen)
    let startX = -1;
    let startY = -1;

    for (let y = 1; y < height - 1 && startX === -1; y++) {
      for (let x = 1; x < width - 1 && startX === -1; x++) {
        const isWalkable = map[y][x] === 0 || map[y][x] === 3 || map[y][x] === 4 || map[y][x] === 5;
        const isInPen = (x >= penBounds.minX && x <= penBounds.maxX &&
                        y >= penBounds.minY && y <= penBounds.maxY);

        if (isWalkable && !isInPen) {
          startX = x;
          startY = y;
        }
      }
    }

    if (startX === -1) {
      console.log('No starting point found for flood fill');
      return false;
    }

    // Flood fill
    const stack: { x: number, y: number }[] = [{ x: startX, y: startY }];
    let visitedCount = 0;

    while (stack.length > 0) {
      const pos = stack.pop()!;

      if (visited[pos.y][pos.x]) continue;

      visited[pos.y][pos.x] = true;
      visitedCount++;

      // Check neighbors
      const neighbors = [
        { x: pos.x - 1, y: pos.y },
        { x: pos.x + 1, y: pos.y },
        { x: pos.x, y: pos.y - 1 },
        { x: pos.x, y: pos.y + 1 }
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          if (!visited[n.y][n.x]) {
            const isWalkable = map[n.y][n.x] === 0 || map[n.y][n.x] === 3 ||
                              map[n.y][n.x] === 4 || map[n.y][n.x] === 5;
            const isInPen = (n.x >= penBounds.minX && n.x <= penBounds.maxX &&
                            n.y >= penBounds.minY && n.y <= penBounds.maxY);

            if (isWalkable && !isInPen) {
              stack.push(n);
            }
          }
        }
      }
    }

    // Count total walkable tiles (excluding pen) and check for unreachable PATH tiles
    let totalWalkable = 0;
    let totalPaths = 0;
    const unreachablePaths: { x: number, y: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isWalkable = map[y][x] === 0 || map[y][x] === 3 || map[y][x] === 4 || map[y][x] === 5;
        const isPath = map[y][x] === 0; // PATH tiles where pellets spawn
        const isInPen = (x >= penBounds.minX && x <= penBounds.maxX &&
                        y >= penBounds.minY && y <= penBounds.maxY);

        if (isWalkable && !isInPen) {
          totalWalkable++;
        }

        // Track unreachable PATH tiles specifically (these would have isolated pellets)
        if (isPath && !isInPen) {
          totalPaths++;
          if (!visited[y][x]) {
            unreachablePaths.push({ x, y });
          }
        }
      }
    }

    console.log(`Flood fill: visited ${visitedCount} / ${totalWalkable} walkable tiles`);

    // Check if any PATH tiles are unreachable (these would create isolated pellets)
    if (unreachablePaths.length > 0) {
      console.log(`CONNECTIVITY FAILED: ${unreachablePaths.length} unreachable PATH tiles detected (would create isolated/surrounded pellets)`);
      console.log(`Unreachable PATH positions:`, unreachablePaths.slice(0, 10)); // Show first 10
      return false;
    }

    console.log(`All ${totalPaths} PATH tiles are reachable - no isolated pellets`);

    // All walkable tiles should be visited
    return visitedCount === totalWalkable;
  }

  /**
   * Print a visual representation of the map for debugging
   * Legend:
   * '-' = wall
   * ' ' = path
   * '$' = tunnel
   * '*' = powerup
   * '#' = pen door
   * '@' = player start
   * 'X' = pen interior
   */
  private static printMapDebug(mapData: IMapData): void {
    const map = mapData.map;
    const playerStart = mapData.playerStart;
    const doorPos = mapData.penDoor;
    const powerupSet = new Set(mapData.powerups.map(p => `${p.x},${p.y}`));

    for (let y = 0; y < map.length; y++) {
      let row = '';
      for (let x = 0; x < map[y].length; x++) {
        // Check for special positions first
        if (x === playerStart.x && y === playerStart.y) {
          row += '@';
        } else if (x === doorPos.x && y === doorPos.y) {
          row += '#';
        } else if (powerupSet.has(`${x},${y}`)) {
          row += '*';
        } else {
          // Use tile type
          const tile = map[y][x];
          switch (tile) {
            case 0: // path
              row += ' ';
              break;
            case 1: // wall
              row += '-';
              break;
            case 2: // pen interior
              row += 'X';
              break;
            case 3: // pen door (should be caught above, but fallback)
              row += '#';
              break;
            case 4: // tunnel
              row += '$';
              break;
            case 5: // powerup (should be caught above, but fallback)
              row += '*';
              break;
            default:
              row += '?';
          }
        }
      }
      console.log(row);
    }

    // Print legend
    console.log('\nLegend:');
    console.log('  - = wall');
    console.log('  (space) = path');
    console.log('  $ = tunnel');
    console.log('  * = powerup');
    console.log('  # = pen door');
    console.log('  @ = player start');
    console.log('  X = pen interior');
  }
}
