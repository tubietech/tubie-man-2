# Preloaded Maps Guide

This game uses a map generation system with preloaded map fallbacks. This guide explains how to generate the preloaded maps.

## Why Preloaded Maps?

The game generates maps dynamically at runtime. However, if generation fails after 10 attempts, the game will fall back to using one of 10 pre-generated maps stored as JSON files. This ensures the game always has a playable map available.

## How to Generate Preloaded Maps

### Simple Command-Line Method (Recommended)

Just run this single command:

```bash
npm run generate:maps
```

That's it! The script will:
- Generate 10 unique maps
- Check for duplicates automatically
- Save them to `src/resources/maps/`
- Show progress and statistics

## Files Involved

- `scripts/generateMaps.ts` - Command-line map generator
- `src/utils/preloadedMaps.ts` - Loads preloaded maps at runtime
- `src/resources/maps/` - Directory containing the 10 preloaded map files
- `src/utils/MapGeneratorV2.ts` - Main generator with fallback logic

For more details, see the README in `src/resources/maps/`
