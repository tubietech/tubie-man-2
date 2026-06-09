import { ICoordinate } from '../interfaces/ICoordinate';
import { Logger } from './Logger';
import { LogGroup } from '../enums/LogGroup';

export type Point = [number, number];
export type Polygon = Point[];

/**
 * Find all connected wall sections in a map.
 * Returns an array where each element is an array of coordinates representing one connected wall section.
 *
 * @param map - 2D array representing the game map (1 = wall, 0 = path, etc.)
 * @returns Array of wall sections, where each section is an array of coordinates
 */
export function findConnectedWallSections(map: number[][]): ICoordinate[][] {
  const wallSections: ICoordinate[][] = [];
  const visited: boolean[][] = [];

  // Initialize visited array
  for (let y = 0; y < map.length; y++) {
    visited[y] = new Array(map[y].length).fill(false);
  }

  // Helper function to check if a position is a wall
  const isWall = (x: number, y: number): boolean => {
    if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) {
      return false;
    }
    return map[y][x] === 1; // Assuming 1 represents a wall tile
  };

  // Flood fill to find all tiles in a connected wall section
  const floodFill = (startX: number, startY: number): ICoordinate[] => {
    const section: ICoordinate[] = [];
    const queue: ICoordinate[] = [{ x: startX, y: startY }];
    visited[startY][startX] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      section.push(current);

      // Check all 4 adjacent cells (up, down, left, right)
      const neighbors = [
        { x: current.x, y: current.y - 1 }, // up
        { x: current.x, y: current.y + 1 }, // down
        { x: current.x - 1, y: current.y }, // left
        { x: current.x + 1, y: current.y }  // right
      ];

      for (const neighbor of neighbors) {
        if (isWall(neighbor.x, neighbor.y) && !visited[neighbor.y][neighbor.x]) {
          visited[neighbor.y][neighbor.x] = true;
          queue.push(neighbor);
        }
      }
    }

    return section;
  };

  // Iterate through the entire map to find all wall sections
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (isWall(x, y) && !visited[y][x]) {
        const section = floodFill(x, y);
        wallSections.push(section);
      }
    }
  }

  const wallSectionsLog = [];
  wallSectionsLog.push(`Found ${wallSections.length} connected wall sections`);
  wallSections.forEach((section, index) => {
    wallSectionsLog.push(`Section ${index + 1}: ${section.length} tiles`);
  });
  Logger.logMultiLineStatic(LogGroup.MAP, wallSectionsLog);

  return wallSections;
}

/**
 * Trace the orthogonal outline(s) of a grid-aligned point cloud.
 * Takes an array of cell coordinates (each representing a filled grid cell)
 * and returns an array of polygons representing the outer boundary.
 *
 * Each input coordinate represents a filled unit square at (x,y) to (x+1,y+1).
 * The output polygons are ordered lists of vertices forming closed loops.
 *
 * @param cells - Array of coordinates representing filled grid cells
 * @returns Array of polygons (each polygon is an ordered list of vertex points)
 */
export function traceWallOutline(cells: ICoordinate[]): Polygon[] {
  // Helper: convert point to string key for map/set lookups
  const key = (x: number, y: number): string => `${x},${y}`;
  const parseKey = (s: string): Point => s.split(',').map(Number) as Point;

  // Convert cells to Points and create a set for O(1) membership
  const cellPoints: Point[] = cells.map(c => [c.x, c.y]);
  const filled = new Set<string>(cellPoints.map(([x, y]) => key(x, y)));

  // Map of directed boundary edges: vertexKey -> nextVertexKey
  // Edges are added CCW around each filled cell for sides bordering empty space
  const next = new Map<string, string>();

  // For each filled cell at (x,y), its unit square has corners:
  // (x, y)       - bottom-left
  // (x+1, y)     - bottom-right
  // (x+1, y+1)   - top-right
  // (x, y+1)     - top-left
  for (const [x, y] of cellPoints) {
    // Check neighbor cells (not vertices)
    const hasNorth = filled.has(key(x, y + 1));
    const hasEast = filled.has(key(x + 1, y));
    const hasSouth = filled.has(key(x, y - 1));
    const hasWest = filled.has(key(x - 1, y));

    // Add boundary edges for sides that border empty space (CCW around cell)

    // East side: if no neighbor to the east, add edge from (x+1,y) up to (x+1,y+1)
    if (!hasEast) {
      next.set(key(x + 1, y), key(x + 1, y + 1));
    }

    // North side: if no neighbor to the north, add edge from (x+1,y+1) left to (x,y+1)
    if (!hasNorth) {
      next.set(key(x + 1, y + 1), key(x, y + 1));
    }

    // West side: if no neighbor to the west, add edge from (x,y+1) down to (x,y)
    if (!hasWest) {
      next.set(key(x, y + 1), key(x, y));
    }

    // South side: if no neighbor to the south, add edge from (x,y) right to (x+1,y)
    if (!hasSouth) {
      next.set(key(x, y), key(x + 1, y));
    }
  }

  const polygons: Polygon[] = [];
  const used = new Set<string>();

  // Walk edges to form closed loops
  for (const startKey of Array.from(next.keys())) {
    if (used.has(startKey)) continue;

    const ring: Point[] = [];
    let cur = startKey;
    let iterations = 0;
    const maxIterations = next.size + 1; // Safety limit

    while (iterations < maxIterations) {
      iterations++;

      const nxt = next.get(cur);
      if (!nxt) break; // No next edge found

      // Record this vertex
      ring.push(parseKey(cur));
      used.add(cur);

      cur = nxt;

      // Check if we've closed the loop
      if (cur === startKey) {
        break;
      }

      // Safety: prevent infinite loops
      if (used.has(cur) && cur !== startKey) {
        break;
      }
    }

    if (ring.length > 0) {
      // Simplify by removing collinear points
      const simplified = simplifyOrthogonalPolygon(ring);
      if (simplified.length >= 3) {
        polygons.push(simplified);
      }
    }
  }

  return polygons;
}

/**
 * Remove intermediate vertices that are collinear in axis-aligned polygons.
 * This simplifies the polygon by removing redundant points along straight edges.
 *
 * @param ring - Closed loop as array of vertices (not repeating start at end)
 * @returns Simplified polygon with collinear points removed
 */
function simplifyOrthogonalPolygon(ring: Point[]): Polygon {
  if (ring.length <= 2) return ring.slice();

  const res: Point[] = [];
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const cur = ring[i];
    const next = ring[(i + 1) % n];

    // Check if prev->cur and cur->next are collinear on the same axis
    const isVerticalCollinear = prev[0] === cur[0] && cur[0] === next[0];
    const isHorizontalCollinear = prev[1] === cur[1] && cur[1] === next[1];

    // Only keep the point if it's NOT collinear (i.e., it's a corner)
    if (!isVerticalCollinear && !isHorizontalCollinear) {
      res.push(cur);
    }
  }

  // Ensure we have at least some points
  return res.length > 0 ? res : [ring[0]];
}

/**
 * Apply inset to polygon outline to thin the walls.
 * Moves each edge of the polygon inward by a specified percentage.
 *
 * For orthogonal polygons, this function:
 * 1. Identifies edge directions (horizontal or vertical)
 * 2. Moves each edge perpendicular to its direction by the inset amount
 * 3. Recalculates corner intersections
 *
 * @param outline - Array of vertices forming a closed polygon
 * @param insetFraction - Fraction of tile size to inset (0-1, e.g., 0.1 = 10% inset)
 * @returns New polygon with edges moved inward
 */
export function thinWalls(outline: Polygon, insetFraction: number): Polygon {
  if (outline.length < 3 || insetFraction <= 0) {
    return outline.slice(); // Return copy if no inset needed
  }

  const thinned: Polygon = [];
  const n = outline.length;

  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n];
    const curr = outline[i];
    const next = outline[(i + 1) % n];

    // Calculate vectors for the two edges meeting at this corner
    const prevEdgeX = curr[0] - prev[0];
    const prevEdgeY = curr[1] - prev[1];
    const nextEdgeX = next[0] - curr[0];
    const nextEdgeY = next[1] - curr[1];

    // Normalize edge vectors
    const prevLen = Math.sqrt(prevEdgeX * prevEdgeX + prevEdgeY * prevEdgeY);
    const nextLen = Math.sqrt(nextEdgeX * nextEdgeX + nextEdgeY * nextEdgeY);

    if (prevLen === 0 || nextLen === 0) {
      thinned.push(curr);
      continue;
    }

    const prevDirX = prevEdgeX / prevLen;
    const prevDirY = prevEdgeY / prevLen;
    const nextDirX = nextEdgeX / nextLen;
    const nextDirY = nextEdgeY / nextLen;

    // Calculate perpendicular vectors (rotate 90° counter-clockwise)
    // For orthogonal polygons traced CCW, this points to the left of each edge
    const prevPerpX = -prevDirY;
    const prevPerpY = prevDirX;
    const nextPerpX = -nextDirY;
    const nextPerpY = nextDirX;

    // For both convex and concave corners, we always inset in the same perpendicular direction
    // The key insight: we're moving each edge inward by the same amount
    // The corner position is determined by where the two inset edges intersect
    const prevOffsetX = prevPerpX * insetFraction;
    const prevOffsetY = prevPerpY * insetFraction;
    const nextOffsetX = nextPerpX * insetFraction;
    const nextOffsetY = nextPerpY * insetFraction;

    // The inset edges are the original edges shifted by the offset
    // Incoming edge: from (prev + offset) to (curr + offset)
    // Outgoing edge: from (curr + offset) to (next + offset)

    // We need to find where these two inset edges intersect
    // Incoming edge point: prevOffset + t1 * prevDir
    // Outgoing edge point: currOffset + t2 * nextDir

    // For orthogonal polygons, we can use a simpler approach:
    // The new corner is at the intersection of the two inset edges

    // Line 1 (inset incoming edge): point = prev + prevOffset + t * prevDir
    // Line 2 (inset outgoing edge): point = curr + nextOffset + s * nextDir

    // Actually, for the corner point, we want the intersection of:
    // Line 1: passes through (curr + prevOffset), parallel to prevDir
    // Line 2: passes through (curr + nextOffset), parallel to nextDir

    // For orthogonal edges, this is simpler:
    const p1x = curr[0] + prevOffsetX;
    const p1y = curr[1] + prevOffsetY;
    const p2x = curr[0] + nextOffsetX;
    const p2y = curr[1] + nextOffsetY;

    // Find intersection of the two inset edges
    // Line 1: p1 + t * prevDir
    // Line 2: p2 + s * nextDir

    // Solve: p1 + t * prevDir = p2 + s * nextDir
    // p1x + t * prevDirX = p2x + s * nextDirX
    // p1y + t * prevDirY = p2y + s * nextDirY

    const det = prevDirX * nextDirY - prevDirY * nextDirX;

    if (Math.abs(det) < 0.0001) {
      // Edges are parallel (shouldn't happen for proper orthogonal polygons with corners)
      thinned.push(curr);
      continue;
    }

    // Solve for t
    const dx = p2x - p1x;
    const dy = p2y - p1y;
    const t = (dx * nextDirY - dy * nextDirX) / det;

    // Calculate the new corner position
    const newX = p1x + t * prevDirX;
    const newY = p1y + t * prevDirY;

    thinned.push([newX, newY]);
  }

  return thinned;
}

/**
 * Enforce minimum wall thickness by adjusting parallel edges that are too close.
 * For orthogonal polygons, this checks opposite edges and ensures they maintain
 * a minimum distance. If walls are thinner than the minimum, edges are moved outward.
 *
 * @param outline - Array of vertices forming a closed polygon
 * @param minThickness - Minimum thickness in grid units
 * @returns New polygon with minimum thickness enforced
 */
export function enforceMinimumThickness(outline: Polygon, minThickness: number): Polygon {
  if (outline.length < 4 || minThickness <= 0) {
    return outline.slice();
  }

  const adjusted: Polygon = outline.slice();
  const halfMinThickness = minThickness / 2;

  // For orthogonal polygons, we need to identify parallel edge pairs
  // and ensure the perpendicular distance between them meets the minimum

  // Build edge information
  interface EdgeInfo {
    index: number;
    start: Point;
    end: Point;
    direction: 'horizontal' | 'vertical';
    position: number; // y-coord for horizontal edges, x-coord for vertical edges
  }

  const edges: EdgeInfo[] = [];
  for (let i = 0; i < outline.length; i++) {
    const start = outline[i];
    const end = outline[(i + 1) % outline.length];

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];

    const isHorizontal = Math.abs(dy) < 0.01;
    const isVertical = Math.abs(dx) < 0.01;

    // For degenerate edges (both dx and dy near 0), treat based on position in polygon
    // Edges 0 and 2 are vertical (right and left walls), edges 1 and 3 are horizontal (bottom and top walls)
    if (isHorizontal && isVertical) {
      // Degenerate edge - alternate between vertical and horizontal based on index
      if (i % 2 === 0) {
        edges.push({
          index: i,
          start,
          end,
          direction: 'vertical',
          position: start[0]
        });
      } else {
        edges.push({
          index: i,
          start,
          end,
          direction: 'horizontal',
          position: start[1]
        });
      }
    } else if (isHorizontal) {
      edges.push({
        index: i,
        start,
        end,
        direction: 'horizontal',
        position: start[1] // y-coordinate
      });
    } else if (isVertical) {
      edges.push({
        index: i,
        start,
        end,
        direction: 'vertical',
        position: start[0] // x-coordinate
      });
    }
  }

  // Group horizontal and vertical edges
  const horizontalEdges = edges.filter(e => e.direction === 'horizontal');
  const verticalEdges = edges.filter(e => e.direction === 'vertical');

  // Check horizontal edge pairs (parallel in y)
  for (let i = 0; i < horizontalEdges.length; i++) {
    for (let j = i + 1; j < horizontalEdges.length; j++) {
      const edge1 = horizontalEdges[i];
      const edge2 = horizontalEdges[j];

      // Check if edges overlap in x-direction
      const x1Min = Math.min(edge1.start[0], edge1.end[0]);
      const x1Max = Math.max(edge1.start[0], edge1.end[0]);
      const x2Min = Math.min(edge2.start[0], edge2.end[0]);
      const x2Max = Math.max(edge2.start[0], edge2.end[0]);

      const overlaps = !(x1Max < x2Min || x2Max < x1Min);

      if (overlaps) {
        const distance = Math.abs(edge1.position - edge2.position);

        if (distance < minThickness) {
          // Determine which edge has larger/smaller Y position
          // For CCW polygons, we want to push edges apart, not toward each other
          const minPos = Math.min(edge1.position, edge2.position);
          const maxPos = Math.max(edge1.position, edge2.position);
          const midpoint = (minPos + maxPos) / 2;

          // Push edges apart from midpoint to meet minimum thickness
          const newMinPos = midpoint - halfMinThickness;
          const newMaxPos = midpoint + halfMinThickness;

          // Determine which edge to assign to which position
          const edge1IsMin = edge1.position < edge2.position;
          const newPos1 = edge1IsMin ? newMinPos : newMaxPos;
          const newPos2 = edge1IsMin ? newMaxPos : newMinPos;

          // Update vertices for edge1 (only update Y, preserve X)
          const idx1Start = edge1.index;
          const idx1End = (edge1.index + 1) % outline.length;
          adjusted[idx1Start] = [adjusted[idx1Start][0], newPos1];
          adjusted[idx1End] = [adjusted[idx1End][0], newPos1];

          // Update vertices for edge2 (only update Y, preserve X)
          const idx2Start = edge2.index;
          const idx2End = (edge2.index + 1) % outline.length;
          adjusted[idx2Start] = [adjusted[idx2Start][0], newPos2];
          adjusted[idx2End] = [adjusted[idx2End][0], newPos2];
        }
      }
    }
  }

  // Check vertical edge pairs (parallel in x)
  for (let i = 0; i < verticalEdges.length; i++) {
    for (let j = i + 1; j < verticalEdges.length; j++) {
      const edge1 = verticalEdges[i];
      const edge2 = verticalEdges[j];

      // Check if edges overlap in y-direction
      const y1Min = Math.min(edge1.start[1], edge1.end[1]);
      const y1Max = Math.max(edge1.start[1], edge1.end[1]);
      const y2Min = Math.min(edge2.start[1], edge2.end[1]);
      const y2Max = Math.max(edge2.start[1], edge2.end[1]);

      const overlaps = !(y1Max < y2Min || y2Max < y1Min);

      if (overlaps) {
        const distance = Math.abs(edge1.position - edge2.position);

        if (distance < minThickness) {
          // Determine which edge has larger/smaller X position
          // For CCW polygons, we want to push edges apart, not toward each other
          const minPos = Math.min(edge1.position, edge2.position);
          const maxPos = Math.max(edge1.position, edge2.position);
          const midpoint = (minPos + maxPos) / 2;

          // Push edges apart from midpoint to meet minimum thickness
          const newMinPos = midpoint - halfMinThickness;
          const newMaxPos = midpoint + halfMinThickness;

          // Determine which edge to assign to which position
          const edge1IsMin = edge1.position < edge2.position;
          const newPos1 = edge1IsMin ? newMinPos : newMaxPos;
          const newPos2 = edge1IsMin ? newMaxPos : newMinPos;

          // Update vertices for edge1 (only update X, preserve Y)
          const idx1Start = edge1.index;
          const idx1End = (edge1.index + 1) % outline.length;
          adjusted[idx1Start] = [newPos1, adjusted[idx1Start][1]];
          adjusted[idx1End] = [newPos1, adjusted[idx1End][1]];

          // Update vertices for edge2 (only update X, preserve Y)
          const idx2Start = edge2.index;
          const idx2End = (edge2.index + 1) % outline.length;
          adjusted[idx2Start] = [newPos2, adjusted[idx2Start][1]];
          adjusted[idx2End] = [newPos2, adjusted[idx2End][1]];
        }
      }
    }
  }

  return adjusted;
}

/**
 * Round the corners of an orthogonal polygon outline.
 * Takes a polygon with sharp 90-degree corners and replaces each corner with a rounded arc.
 *
 * For orthogonal (axis-aligned) polygons, this function:
 * 1. Identifies corner vertices (where direction changes)
 * 2. Shortens the edges leading to/from each corner by radius 'r'
 * 3. Inserts arc points to create smooth rounded corners
 *
 * @param outline - Array of vertices forming a closed polygon (points ordered sequentially)
 * @param r - Radius of the rounded corners
 * @param arcSegments - Number of segments to approximate each arc (default: 8)
 * @returns New polygon with rounded corners
 */
export function roundCorners(outline: Polygon, r: number, arcSegments: number = 8): Polygon {
  if (outline.length < 3 || r <= 0) {
    return outline.slice(); // Return copy if no rounding needed
  }

  const rounded: Polygon = [];
  const n = outline.length;

  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n];
    const curr = outline[i];
    const next = outline[(i + 1) % n];

    // Calculate edge vectors
    const prevDx = curr[0] - prev[0];
    const prevDy = curr[1] - prev[1];
    const nextDx = next[0] - curr[0];
    const nextDy = next[1] - curr[1];

    // Normalize edge vectors to get directions
    const prevLen = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
    const nextLen = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

    // Skip if edges are too short or degenerate
    if (prevLen < 2 * r || nextLen < 2 * r || prevLen === 0 || nextLen === 0) {
      rounded.push(curr);
      continue;
    }

    const prevDirX = prevDx / prevLen;
    const prevDirY = prevDy / prevLen;
    const nextDirX = nextDx / nextLen;
    const nextDirY = nextDy / nextLen;

    // Check if this is a corner (direction changes)
    const isCorner = Math.abs(prevDirX - nextDirX) > 0.01 || Math.abs(prevDirY - nextDirY) > 0.01;

    if (!isCorner) {
      // Collinear - keep the point as is
      rounded.push(curr);
      continue;
    }

    // Calculate the point where rounding starts on the incoming edge
    const startX = curr[0] - prevDirX * r;
    const startY = curr[1] - prevDirY * r;

    // Add the start point
    rounded.push([startX, startY]);

    // Calculate perpendicular vectors (rotate 90° counter-clockwise)
    const prevPerpX = -prevDirY;
    const prevPerpY = prevDirX;

    // Determine turn direction using cross product
    const cross = prevDirX * nextDirY - prevDirY * nextDirX;

    // For a convex corner (turning left in CCW polygon), the arc center is offset
    // perpendicular to both edges by distance r, on the "inside" of the corner
    let centerX: number, centerY: number;

    if (Math.abs(cross) < 0.01) {
      // Degenerate case - skip
      rounded.push(curr);
      continue;
    }

    // Calculate arc center: it's at distance r from both the incoming and outgoing edges
    // Start point is on the incoming edge, offset by r
    // The center is offset perpendicular from the start point
    if (cross > 0) {
      // Left turn (convex for CCW polygon) - center is to the right of incoming edge
      centerX = startX + prevPerpX * r;
      centerY = startY + prevPerpY * r;
    } else {
      // Right turn (concave for CCW polygon) - center is to the left of incoming edge
      centerX = startX - prevPerpX * r;
      centerY = startY - prevPerpY * r;
    }

    // Calculate the point where rounding ends on the outgoing edge
    const endX = curr[0] + nextDirX * r;
    const endY = curr[1] + nextDirY * r;

    // Calculate start and end angles for the arc
    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    const endAngle = Math.atan2(endY - centerY, endX - centerX);

    // Calculate sweep angle
    let sweep = endAngle - startAngle;

    // Normalize sweep to be in the correct direction
    if (cross > 0) {
      // Convex corner - sweep should be negative (clockwise) and between 0 and -PI/2
      if (sweep > 0) sweep -= Math.PI * 2;
      // Clamp to 90 degrees
      if (sweep < -Math.PI / 2 - 0.1) sweep += Math.PI * 2;
    } else {
      // Concave corner - sweep should be positive (counter-clockwise) and between 0 and PI/2
      if (sweep < 0) sweep += Math.PI * 2;
      // Clamp to 90 degrees
      if (sweep > Math.PI / 2 + 0.1) sweep -= Math.PI * 2;
    }

    // Generate arc points (excluding start, including end)
    for (let j = 1; j <= arcSegments; j++) {
      const t = j / arcSegments;
      const angle = startAngle + sweep * t;
      const arcX = centerX + Math.cos(angle) * r;
      const arcY = centerY + Math.sin(angle) * r;
      rounded.push([arcX, arcY]);
    }
  }

  return rounded;
}
