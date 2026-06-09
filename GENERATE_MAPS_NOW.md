# Generate Maps - Quick Reference

## Easiest Method

Run this command:

```bash
npm run generate:maps
```

This will generate 10 unique maps and save them to `src/resources/maps/`.

---

## Alternative: Browser Console Method

If you prefer to generate maps in the browser:

1. **Start dev server**: `npm run dev`
2. **Open browser console** (F12)
3. **Paste and run this code:**

```javascript
(async function generateAndSaveMaps() {
  const { MapGeneratorV2 } = await import('/src/utils/MapGeneratorV2.ts');
  const { gameConfig } = await import('/src/config/gameConfig.ts');

  console.log('Starting map generation...');
  const hashes = new Set();

  for (let i = 0; i < 10; i++) {
    console.log(`\nGenerating map ${i}...`);
    let mapData, attempts = 0;

    while (attempts < 50) {
      try {
        mapData = await MapGeneratorV2.generate(gameConfig.map.width, gameConfig.map.height);
        if (!hashes.has(mapData.hash)) {
          hashes.add(mapData.hash);
          break;
        }
        console.log(`  Duplicate hash, regenerating...`);
        attempts++;
      } catch (error) {
        console.error(`  Error:`, error);
        attempts++;
      }
    }

    if (!mapData) {
      console.error(`Failed to generate map ${i}`);
      continue;
    }

    // Download the file
    const json = JSON.stringify(mapData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map${i}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`✓ Downloaded map${i}.json (hash: ${mapData.hash})`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✓ All maps generated!');
  console.log('Move the files from Downloads to src/resources/maps/');
})();
```

4. **Move downloaded files** from your Downloads folder to `src/resources/maps/`

---

**Recommendation:** Use the command-line method (`npm run generate:maps`) - it's much simpler!
