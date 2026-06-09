import { IMapData } from '../interfaces/IMapData';
import { ICoordinate } from '../interfaces/ICoordinate';
import { MapValue } from '../enums/MapValue';

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

export class Pathfinder {
  /**
   * Find a path from start to goal using A* algorithm
   * Returns array of coordinates from start to goal, or empty array if no path exists
   */
  static findPath(
    mapData: IMapData,
    start: ICoordinate,
    goal: ICoordinate,
    allowPenEntry: boolean = false
  ): ICoordinate[] {
    const openList: PathNode[] = [];
    const closedList: Set<string> = new Set();

    // Create start node
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, goal),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openList[currentIndex];

      // Check if we reached the goal
      if (current.x === goal.x && current.y === goal.y) {
        return this.reconstructPath(current);
      }

      // Move current from open to closed
      openList.splice(currentIndex, 1);
      closedList.add(`${current.x},${current.y}`);

      // Check all neighbors
      const neighbors = this.getNeighbors(current, mapData, allowPenEntry);

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;

        // Skip if already evaluated
        if (closedList.has(key)) {
          continue;
        }

        const tentativeG = current.g + 1;

        // Check if neighbor is in open list
        const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          // Add new node to open list
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.heuristic(neighbor, goal),
            f: 0,
            parent: current
          };
          newNode.f = newNode.g + newNode.h;
          openList.push(newNode);
        } else if (tentativeG < existingNode.g) {
          // Update existing node with better path
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Manhattan distance heuristic
   */
  private static heuristic(a: ICoordinate, b: ICoordinate): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Get valid neighboring tiles
   */
  private static getNeighbors(
    node: PathNode,
    mapData: IMapData,
    allowPenEntry: boolean
  ): ICoordinate[] {
    const neighbors: ICoordinate[] = [];
    const directions = [
      { x: 0, y: -1 }, // UP
      { x: 0, y: 1 },  // DOWN
      { x: -1, y: 0 }, // LEFT
      { x: 1, y: 0 }   // RIGHT
    ];

    for (const dir of directions) {
      const x = node.x + dir.x;
      const y = node.y + dir.y;

      if (this.isWalkable(x, y, mapData, allowPenEntry)) {
        neighbors.push({ x, y });
      }
    }

    return neighbors;
  }

  /**
   * Check if a tile is walkable
   */
  private static isWalkable(
    x: number,
    y: number,
    mapData: IMapData,
    allowPenEntry: boolean
  ): boolean {
    // Check bounds
    if (y < 0 || y >= mapData.map.length || x < 0 || x >= mapData.map[0].length) {
      return false;
    }

    const tile = mapData.map[y][x];

    // Walls are not walkable
    if (tile === MapValue.WALL) {
      return false;
    }

    // If pen entry is allowed, all non-wall tiles are walkable
    if (allowPenEntry) {
      return true;
    }

    // Otherwise, pen interior and door are not walkable
    if (tile === MapValue.PEN_INTERIOR || tile === MapValue.PEN_DOOR) {
      return false;
    }

    return true;
  }

  /**
   * Reconstruct path from goal node back to start
   */
  private static reconstructPath(node: PathNode): ICoordinate[] {
    const path: ICoordinate[] = [];
    let current: PathNode | null = node;

    while (current !== null) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }
}
