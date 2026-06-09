# Pre-Generated Maps

This directory contains pre-generated map files that serve as fallbacks when real-time map generation fails.

## How to Generate Maps

### Method 1: Using the Browser-Based Generator (Recommended)

1. Add the MapPreGenerator component to your app temporarily:
   ```tsx
   // In src/App.tsx or create a new route
   import { MapPreGenerator } from './utils/MapPreGenerator';

   // In your component:
   <MapPreGenerator />
   ```

2. Navigate to the component in your browser
3. Click "Generate 10 Maps"
4. Wait for all files to download (map0.json through map9.json)
5. Move the downloaded files to this directory (`src/resources/maps/`)

### Method 2: Using Console (Alternative)

1. Run the game in development mode: `npm run dev`
2. Open the browser console
3. Paste and run the generation code (see scripts/generateMaps.mjs for the code)
4. Download the generated files
5. Move them to this directory

## File Format

Each map file (map0.json through map9.json) contains a complete IMapData object with:
- 2D map array
- Tunnel locations
- Enemy pen data
- Player start position
- Powerup positions
- Unique hash for the map layout

## Usage

These maps are automatically loaded as fallbacks by MapGeneratorV2 when real-time generation fails after the maximum number of attempts.
