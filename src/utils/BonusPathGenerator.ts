import { ICoordinate } from '../interfaces/ICoordinate';
import { IMapData } from '../interfaces/IMapData';
import { ITunnel } from '../interfaces/ITunnel';
import { MapValue } from '../enums/MapValue';
import { gameConfig } from '../config/gameConfig';

/**
 * Generates the path for the bonus entity to follow
 */
export class BonusPathGenerator {
  /**
   * Generate bonus path: entry tunnel -> pen top-left corner -> circle pen -> exit tunnel
   */
  static generateBonusPath(mapData: IMapData, entryTunnelIndex: number): ICoordinate[] {
    const path: ICoordinate[] = [];
    const entryTunnel = mapData.tunnels[entryTunnelIndex];
    const exitTunnel = mapData.tunnels[entryTunnelIndex + 1] || mapData.tunnels[0]; // Linked tunnel

    // Calculate pen top-left corner (2 tiles away from pen bounds)
    const penTopLeft: ICoordinate = {
      x: mapData.penBounds.minX - 2,
      y: mapData.penBounds.minY - 2
    };

    // Start at entry tunnel
    path.push({ x: entryTunnel.location.x, y: entryTunnel.location.y });

    // Find path from tunnel to pen top-left corner
    const pathToPen = this.findPath(
      mapData.map,
      entryTunnel.location,
      penTopLeft,
      mapData.penBounds
    );
    path.push(...pathToPen);

    // Add pen circling path
    const penCirclePath = this.generatePenCirclePath(mapData, gameConfig.map.bonus.penCircles);
    path.push(...penCirclePath);

    // Find path from pen top-left corner to exit tunnel
    const pathToExit = this.findPath(
      mapData.map,
      penTopLeft,
      exitTunnel.location,
      mapData.penBounds
    );
    path.push(...pathToExit);

    // End at exit tunnel
    path.push({ x: exitTunnel.location.x, y: exitTunnel.location.y });

    return path;
  }

  /**
   * Generate path that circles around the pen
   */
  private static generatePenCirclePath(mapData: IMapData, circles: number): ICoordinate[] {
    const path: ICoordinate[] = [];
    const { minX, maxX, minY, maxY } = mapData.penBounds;

    // Define the rectangle around the pen (one tile away from pen walls)
    const pathMinX = minX - 2;
    const pathMaxX = maxX + 2;
    const pathMinY = minY - 2;
    const pathMaxY = maxY + 2;

    // Circle the pen clockwise
    for (let i = 0; i < circles; i++) {
      // Top side (left to right)
      for (let x = pathMinX; x <= pathMaxX; x++) {
        path.push({ x, y: pathMinY });
      }
      // Right side (top to bottom)
      for (let y = pathMinY + 1; y <= pathMaxY; y++) {
        path.push({ x: pathMaxX, y });
      }
      // Bottom side (right to left)
      for (let x = pathMaxX - 1; x >= pathMinX; x--) {
        path.push({ x, y: pathMaxY });
      }
      // Left side (bottom to top)
      for (let y = pathMaxY - 1; y > pathMinY; y--) {
        path.push({ x: pathMinX, y });
      }
    }

    return path;
  }

  /**
   * Find shortest path using BFS (Breadth-First Search)
   */
  private static findPath(
    map: number[][],
    start: ICoordinate,
    goal: ICoordinate,
    penBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): ICoordinate[] {
    const queue: { pos: ICoordinate; path: ICoordinate[] }[] = [{ pos: start, path: [] }];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }  // left
    ];

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      // Check if we reached the goal
      if (pos.x === goal.x && pos.y === goal.y) {
        return path;
      }

      // Explore neighbors
      for (const dir of directions) {
        const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
        const key = `${newPos.x},${newPos.y}`;

        if (visited.has(key)) {
          continue;
        }

        // Check if position is walkable
        if (!this.isWalkable(map, newPos, penBounds)) {
          continue;
        }

        visited.add(key);
        queue.push({
          pos: newPos,
          path: [...path, newPos]
        });
      }
    }

    // No path found, return empty
    console.warn('[BONUS PATH] No path found!');
    return [];
  }

  /**
   * Check if a position is walkable (for bonus entity)
   */
  private static isWalkable(
    map: number[][],
    pos: ICoordinate,
    penBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): boolean {
    // Check bounds
    if (pos.y < 0 || pos.y >= map.length || pos.x < 0 || pos.x >= map[0].length) {
      return false;
    }

    const tile = map[pos.y][pos.x];

    // Can walk on paths, tunnels, pen door, and around the pen
    const isInPen = pos.x >= penBounds.minX && pos.x <= penBounds.maxX &&
                    pos.y >= penBounds.minY && pos.y <= penBounds.maxY;

    return tile === MapValue.PATH ||
           tile === MapValue.TUNNEL ||
           tile === MapValue.PEN_DOOR ||
           tile === MapValue.POWERUP ||
           isInPen;
  }
}
