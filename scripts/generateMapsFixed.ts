#!/usr/bin/env tsx

/**
 * Command-line script to generate preloaded maps
 * Run with: npm run generate:maps:node
 *
 * This version mocks browser globals to avoid Phaser errors
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock browser globals before importing Phaser-dependent modules
(global as any).window = {
  cordova: undefined,
  ejecta: undefined,
  location: { protocol: 'https:' }
};
(global as any).document = {
  createElement: () => ({ style: {} }),
  documentElement: { style: {} }
};
(global as any).navigator = {
  userAgent: 'node.js',
  platform: 'node'
};

// Import the map generator and config
import { MapGeneratorV2 } from '../src/utils/MapGeneratorV2';
import { gameConfig } from '../src/config/gameConfig';
import type { IMapData } from '../src/interfaces/IMapData';

const OUTPUT_DIR = path.join(__dirname, '../src/resources/maps');
const NUM_MAPS = 10;

/**
 * Main function to generate and save maps
 */
async function generateMaps(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         Preloaded Maps Generator                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`🎯 Target: ${NUM_MAPS} unique maps\n`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✓ Created output directory\n');
  }

  const generatedHashes = new Set<string>();
  const successfulMaps: number[] = [];
  const failedMaps: number[] = [];

  for (let i = 0; i < NUM_MAPS; i++) {
    console.log(`\n━━━ Generating map ${i} ━━━`);

    let attempts = 0;
    let mapData: IMapData | null = null;

    // Keep generating until we get a unique map
    while (attempts < 50) {
      try {
        mapData = await MapGeneratorV2.generate(
          gameConfig.map.width,
          gameConfig.map.height
        );

        // Check if we already generated this map
        if (generatedHashes.has(mapData.hash)) {
          console.log(`  ⚠ Duplicate hash detected, regenerating... (attempt ${attempts + 1})`);
          attempts++;
          continue;
        }

        break;
      } catch (error) {
        console.error(`  ✗ Generation failed (attempt ${attempts + 1}):`, error instanceof Error ? error.message : error);
        attempts++;
      }
    }

    if (!mapData) {
      console.error(`  ✗ Failed to generate map ${i} after ${attempts} attempts`);
      failedMaps.push(i);
      continue;
    }

    // Add hash to set
    generatedHashes.add(mapData.hash);

    // Save to file
    const filename = `map${i}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(mapData, null, 2), 'utf-8');
      console.log(`  ✓ Saved ${filename}`);
      console.log(`  📊 Hash: ${mapData.hash}`);
      console.log(`  🎮 Dimensions: ${gameConfig.map.width}x${gameConfig.map.height}`);
      console.log(`  🔴 Powerups: ${mapData.powerPellets.length}`);
      console.log(`  🚪 Tunnels: ${mapData.tunnels.length / 2}`);
      console.log(`  🍒 Bonus Path: ${mapData.bonusPath.length} tiles`);
      successfulMaps.push(i);
    } catch (error) {
      console.error(`  ✗ Failed to save ${filename}:`, error instanceof Error ? error.message : error);
      failedMaps.push(i);
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                   Generation Complete                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`✓ Successfully generated: ${successfulMaps.length}/${NUM_MAPS} maps`);

  if (failedMaps.length > 0) {
    console.log(`✗ Failed to generate: ${failedMaps.length} maps (${failedMaps.join(', ')})`);
  }

  console.log(`📁 Maps saved to: ${OUTPUT_DIR}`);
  console.log(`🔒 Unique hashes: ${generatedHashes.size}`);

  if (successfulMaps.length === NUM_MAPS) {
    console.log('\n🎉 All maps generated successfully!');
  } else {
    console.log('\n⚠ Some maps failed to generate. You may want to run this script again.');
  }
}

// Run the generator
generateMaps()
  .then(() => {
    console.log('\n✓ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  });
