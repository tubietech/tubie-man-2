# Seeded Random Number Generator Usage

## Overview

The game now uses a deterministic random number generator (RNG) that allows for reproducible game sessions. This is essential for validating high scores on a server by replaying the exact same game with the same random events.

## How It Works

All random number generation in the game uses a **Linear Congruential Generator (LCG)** with a seed value. The same seed will always produce the same sequence of random numbers, making games reproducible.

### Automatic Seeding

By default, the game generates a seed based on the current timestamp when the first random number is requested. This ensures each game is different.

### Manual Seeding (for Replay/Validation)

You can set a specific seed to reproduce a game session using the `Random` class:

```typescript
import { Random } from './utils/Random';
// or
import { Random } from './utils/utils';

// At the start of a game session

// Set a specific seed (e.g., received from server)
Random.setSeed(12345);

// Get the current seed (e.g., to send to server with score)
const currentSeed = Random.getSeed();
console.log('Game seed:', currentSeed);

// Reset the sequence to replay from the same seed
Random.reset();
```

## Server-Side Validation Example

### Client Side (submitting score):
```typescript
import { Random } from './utils/Random';

function submitScore(score: number, level: number) {
  const seed = Random.getSeed();

  // Submit to server
  fetch('/api/submit-score', {
    method: 'POST',
    body: JSON.stringify({
      score,
      level,
      seed,
      // other game data...
    })
  });
}
```

### Server Side (validating score):
```typescript
import { Random } from './utils/Random';

// Replay the game with the provided seed
function validateScore(submission) {
  const { score, level, seed } = submission;

  // Set the same seed to reproduce the game
  Random.setSeed(seed);

  // Simulate/replay the game
  const replayResult = simulateGame(level);

  // Verify the score matches
  return replayResult.score === score;
}
```

## Random Functions

The `Random` class provides these static methods:

### Direct Access (Recommended):
```typescript
import { Random } from './utils/Random';

Random.getInt(1, 100);           // Random integer 1-100 (inclusive)
Random.getFloat(0.0, 1.0);       // Random float 0.0-1.0
Random.getArrayElement(array);   // Get random element from array
Random.shuffleArray(array);      // Shuffle array in place
Random.setSeed(12345);           // Set seed for deterministic randomness
Random.getSeed();                // Get current seed
Random.reset();                  // Reset to beginning of sequence
```

### Legacy Functions (Still Supported):
```typescript
import { getRandomInt, getRandomFloat, getRandomArrayElement, shuffleArray } from './utils/utils';

getRandomInt(1, 100);            // Uses Random.getInt() internally
getRandomFloat(0.0, 1.0);        // Uses Random.getFloat() internally
getRandomArrayElement(array);    // Uses Random.getArrayElement() internally
shuffleArray(array);             // Uses Random.shuffleArray() internally
```

## Game Elements Using Seeded Random

The following game elements are deterministic with a seed:

- Map generation (tunnel placement, dead-end management)
- Enemy movement patterns
- Bonus appearance timing
- Enemy quirk timing
- Powerup placement
- Any other randomized game behavior

## Important Notes

1. **Seed Value Range**: Seeds are 32-bit integers (0 to 2^32-1)
2. **Determinism**: The same seed + same player inputs = same game outcome
3. **Reset**: Call `Random.reset()` to replay from the beginning of the sequence
4. **State**: The RNG state persists across the entire game session
5. **Singleton**: The Random class uses a singleton pattern - there's only one instance across the entire application

## Example: Testing Determinism

```typescript
import { Random } from './utils/Random';

// Test that same seed produces same sequence

// First run
Random.setSeed(42);
const sequence1 = [
  Random.getInt(1, 100),
  Random.getInt(1, 100),
  Random.getInt(1, 100)
];

// Reset and run again
Random.setSeed(42);
const sequence2 = [
  Random.getInt(1, 100),
  Random.getInt(1, 100),
  Random.getInt(1, 100)
];

// These will be identical
console.log(sequence1); // e.g., [73, 45, 92]
console.log(sequence2); // e.g., [73, 45, 92]
```

## Integration with Game Lifecycle

Consider setting the seed at appropriate times:

```typescript
// In GameScene.ts init() or create()
import { Random } from '../utils/Random';

// Option 1: New seed for each game
Random.setSeed(Date.now());

// Option 2: Use seed from server/URL for replay
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed');
if (seed) {
  Random.setSeed(parseInt(seed));
} else {
  Random.setSeed(Date.now());
}

// Option 3: Reset for new level (if you want same seed across levels)
Random.reset();

// Option 4: Get seed to display/save
console.log('Game Seed:', Random.getSeed());
```

## Architecture

```
Random.ts (new file)
├── SeededRandom (private singleton)
│   ├── seed management
│   ├── LCG algorithm
│   └── state tracking
└── Random (public static class)
    ├── getInt()
    ├── getFloat()
    ├── getArrayElement()
    ├── shuffleArray()
    ├── setSeed()
    ├── getSeed()
    └── reset()

utils.ts
└── Re-exports Random class
└── Provides legacy function wrappers
    ├── getRandomInt() → Random.getInt()
    ├── getRandomFloat() → Random.getFloat()
    ├── getRandomArrayElement() → Random.getArrayElement()
    └── shuffleArray() → Random.shuffleArray()
```
