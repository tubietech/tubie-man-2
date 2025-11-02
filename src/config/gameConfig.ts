export const gameConfig = {
  player: {
    speed: { easy: 70, medium: 90, hard: 110 },
    fireBreathDuration: 1500, // Halved from 3000
    fireBreathCooldown: 1000,
    fireBreathRange: 3,
    projectile: {
      speed: 250, // Pixels per second
      maxDistance: 10, // Maximum distance in tiles
      spriteScale: 15.0, // Scale for projectile sprite (make it much more visible)
      animationFrameRate: 20, // Frame rate for projectile animation
      count: 3, // Number of projectiles fired in a row
    },
    startLives: 3,
    playerStartingHeight: 7, // Player starts 7 rows above bottom of map
    animationFrameRate: 15,
    spriteScale: 2,
    deathAnimation: {
      spinCount: 2, // Number of 360-degree spins
      spinDuration: 500, // Duration of each spin in milliseconds
    },
    invulnerabilityDuration: 2000, // Duration of invulnerability after losing a life (ms)
    injuryComboResetTime: 10000, // Time before injury combo resets (ms)
  },
  enemy: {
    speed: { easy: 70, medium: 95, hard: 120 },
    injuredSpeed: { easy: 110, medium: 140, hard: 180 }, // Speed when injured and fleeing to pen
    scaredDuration: 5000,
    types: ['pokey', 'pricky', 'stingy', 'doc'],
    countPerLevel: {
      1: 3,  // Level 1: Pokey, Pricky, Stingy
      2: 4   // Level 2+: All four enemies (Doc appears)
    },
    respawnDelay: 2000, // Time to pause in pen before respawning (ms)
    releaseDelay: { easy: 3000, medium: 2500, hard: 1500 }, // Delay between enemy releases (ms)
    injuryScore: {
      base: 100,        // Base points for injuring enemy
      increment: 100,   // Points increase per combo
      max: 400          // Maximum points per injury
    },
    quirks: {
      // Time range for quirk triggers (in milliseconds)
      // Quirks happen less frequently at higher difficulties
      triggerTime: {
        easy: { min: 5000, max: 10000 },    // 5-10 seconds
        medium: { min: 8000, max: 15000 },   // 8-15 seconds
        hard: { min: 12000, max: 20000 }     // 12-20 seconds
      },
      pokey: {
        loopDuration: 2000, // How long Pokey stays stuck in loop (ms)
        loopRadius: 2       // Radius of the loop pattern
      },
      pricky: {
        panicDuration: 1500,   // How long Pricky runs straight when panicked (ms)
        wallPauseDuration: 1000, // How long Pricky pauses after hitting wall (ms)
        fleeChance: 0.3,       // Chance to flee from player (0-1)
        wanderChance: 0.3,     // Chance to wander randomly (0-1)
        // Chase chance is implied: 1 - fleeChance - wanderChance
      },
      stingy: {
        sterileModeThreshold: 20,  // Pellets remaining to trigger Sterile Mode
        sterileModeSpeedMultiplier: { easy: 1.2, medium: 1.5, hard: 1.8 }  // Speed multiplier in Sterile Mode by difficulty
      },
      doc: {
        pauseTime: { min: 1000, max: 3000 } // Random pause duration range (ms)
      }
    }
  },
  map: {
    width: 28,
    height: 31,
    tileSize: 10,
    pellet: {
      score: 10,
      size: 0.135, // Pellet radius as fraction of tile size 
      eatDistance: 0.3, // Distance from pellet center (as fraction of tile size) to eat it
    },
    powerup: {
      score: 50,
      scale: 1.7, // Scale powerup sprite relative to tile size (0-1)
      min: 4,
      max: 6,
    },
    bonus: {
      sprites: [
        'gtube.png', 'ephemeral_pump.png', 'oppossum_uni_pump.png', 'opossum_pump.png', 'tt_charger.png',
        'ephemeral_bag.png', 'food_bottle.png', 'y_extension.png', 'enfit_wrench.png', 'pump_holder.png', 'straightnen_pump.png'
      ],
      scores: [100, 200, 300, 500, 700, 800, 1000, 1600, 2000, 3000, 5000],
      defaultScore: 5000, // Score for level 12+
      scale: 1.9, // Scale bonus sprite relative to tile size
      speed: { easy: 60, medium: 100, hard: 140 }, // Pixels per second by difficulty
      appearancesPerLevel: 2,
      firstAppearance: { min: 60, max: 75 }, // Dots eaten before first appearance
      secondAppearance: { min: 170, max: 180 }, // Dots eaten before second appearance
      penCircles: 2, // Number of times to circle the pen
    },
    enemyScore: 200,
    minTunnels: 1,
    maxTunnels: 2,
    tunnelCooldown: 500, // Milliseconds to wait before allowing re-entry to a tunnel
    fillIterations: 3,
    maxDeadEndsPerHalf: 2,
    wallRadius: 8, // Corner radius for wall tiles
    wallEdgeOffset: 0.48, // Inset walls by 48% from tile edges (0-1 scale). This value should not exceed o.5, as single thickness walls will dissappear
    minimumWallThickness: 0.3, // Minimum thickness for walls in grid units (prevents over-thinning)
    wallOutlineThickness: 2,
    generation: {
      maxGenerationAttempts: 10,
      gridRows: 9,
      gridCols: 5
    },
    enemyPen: {
      location: { x: 0, y: 19 }, // Top-left corner position from bottom of subrows
      width: 6,
      height: 3,
      doorWidth: 2
    }
  },
  colors: {
    wall: 0x2121ff,
    wallOutline: 0xffa500,
    pellet: 0xffb897,
    powerup: 0xffffff,
    player: 0xffff00,
    fire: 0xff4500,
    pokey: 0xff0000,
    pricky: 0xffb8ff,
    stingy: 0x00ffff,
    doc: 0xffb851,
    penDoor: 0xff8800,
    tunnel: 0x00ff00
  },
  controls: {
    keyboard: {
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      fire: 'SPACE'
    },
    gamepad: {
      fire: 0
    }
  },
  window: {
    widthModifier: 0.99, // Percentage of viewport width (0-1)
    heightModifier: 0.99, // Percentage of viewport height (0-1)
  }
};