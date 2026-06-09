#!/usr/bin/env tsx

/**
 * Script to split all-maps.json into individual map files
 * Run with: tsx scripts/splitMaps.ts <path-to-all-maps.json>
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../src/resources/maps');

async function splitMaps(inputFile: string): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              Map Splitter Utility                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Read input file
  if (!fs.existsSync(inputFile)) {
    console.error(`✗ Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Reading: ${inputFile}`);
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✓ Created output directory\n');
  }

  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  let successCount = 0;
  let errorCount = 0;

  // Split and save each map
  for (const [filename, mapData] of Object.entries(data)) {
    try {
      const outputPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2), 'utf-8');
      console.log(`✓ Saved ${filename}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to save ${filename}:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  Split Complete                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`✓ Successfully saved: ${successCount} maps`);
  if (errorCount > 0) {
    console.log(`✗ Failed to save: ${errorCount} maps`);
  }
  console.log(`📁 Maps saved to: ${OUTPUT_DIR}`);
}

// Get input file from command line arguments
const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: tsx scripts/splitMaps.ts <path-to-all-maps.json>');
  process.exit(1);
}

splitMaps(inputFile)
  .then(() => {
    console.log('\n✓ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  });
