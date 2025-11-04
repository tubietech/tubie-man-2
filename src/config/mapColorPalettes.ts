/**
 * Color palettes for map walls
 * Each palette defines the fill color and outline color for walls
 */

export interface IMapColorPalette {
  wall: number;
  wallOutline: number;
}

/**
 * Default theme used for levels 1 & 2
 * Tubie Tech Theme - featuring the signature Tubie-Man colors
 */
export const defaultPalette: IMapColorPalette = {
  wall: 0x243763,
  wallOutline: 0xff6e31
};

/**
 * Collection of color palettes for map walls
 * Used for levels 3+ with random selection every 2 levels
 * The default palette is included in this array so it can appear in the rotation
 */
const randomPalettes: IMapColorPalette[] = [
  // Dark Green/Gold
  {
    wall: 0x1a4d2e,
    wallOutline: 0xffd166
  },
  // Red / White
  {
    wall: 0x00ff00,
    wallOutline: 0xffffff
  },
  // Indigo/Soft Yellow
  {
    wall: 0x3d3d94,
    wallOutline: 0xf4d35e
  },
  // Cyan/Magenta
  {
    wall: 0x00ffff,
    wallOutline: 0xff00ff
  },
  // Dark Blue/Light Blue
  {
    wall: 0x000080,
    wallOutline: 0x87ceeb
  },
  // Dark Orange/Purple
  {
    wall: 0xff8c00,
    wallOutline: 0x9370db
  },
  // Teal/Pale Orange
  {
    wall: 0x32cd32,
    wallOutline: 0xffb347
  },
  // Dar
  {
    wall: 0x6a1b9a,
    wallOutline: 0xff4081
  },
  // Forest Green/Pale Orange
  {
    wall: 0x2e8b57,
    wallOutline: 0xffb347
  },
  // Dark Slate Gray/Orange
  {
    wall: 0x2f4f4f,
    wallOutline: 0xffa500
  },
  // Brown/Red Orange
  {
    wall: 0x5c4033,
    wallOutline: 0xff4500
  },
  // Cobalt Blue/Coral
  {
    wall: 0x0b3d91,
    wallOutline: 0xff7f50
  }
];

/**
 * Complete palette array including the default theme
 * This allows the default theme to be selected in later level rotations
 */
export const mapColorPalettes: IMapColorPalette[] = [
  defaultPalette,
  ...randomPalettes
];

/**
 * Get a random palette index that's different from the previous one
 * @param previousIndex The index of the previously used palette (-1 if none)
 * @returns A random palette index different from previousIndex
 */
export function getRandomPaletteIndex(previousIndex: number): number {
  if (mapColorPalettes.length <= 1) {
    return 0;
  }

  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * mapColorPalettes.length);
  } while (newIndex === previousIndex);

  return newIndex;
}
