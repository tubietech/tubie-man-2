export const gameConfig = {
  player: {
    speed: { easy: 70, medium: 90, hard: 110 },
    fireBreathDuration: 1500, // Halved from 3000
    fireBreathCooldown: 1000,
    fireBreathRange: 3,
    projectile: {
      speed: 350, // Pixels per second
      maxDistance: 10, // Maximum distance in tiles
      spriteScale: 15.0, // Scale for projectile sprite (make it much more visible)
      animationFrameRate: 20, // Frame rate for projectile animation
      count: 3, // Number of projectiles fired in a row
    },
    startLives: 3,
    playerStartingHeight: 7, // Player starts 7 rows above bottom of map
    animationFrameRate: 15,
    spriteScale: 2,
  },
  enemy: {
    speed: { easy: 70, medium: 95, hard: 120 },
    scaredDuration: 5000,
    types: ['blinky', 'pinky', 'inky', 'clyde'],
    respawnDelay: 2000
  },
  map: {
    width: 28,
    height: 31,
    tileSize: 10,
    pellet: {
      score: 10,
      size: 0.2, // Pellet radius as fraction of tile size (tileSize / 5 = 0.2)
      eatDistance: 0.3, // Distance from pellet center (as fraction of tile size) to eat it
    },
    powerup: {
      score: 50,
      scale: 1.7, // Scale powerup sprite relative to tile size (0-1)
      min: 4,
      max: 6,
    },
    enemyScore: 200,
    minTunnels: 1,
    maxTunnels: 2,
    tunnelCooldown: 500, // Milliseconds to wait before allowing re-entry to a tunnel
    fillIterations: 3,
    maxDeadEndsPerHalf: 2,
    wallRadius: 4, // Corner radius for wall tiles
    wallEdgeOffset: 0.6, // Inset walls by 60% from tile edges (0-1 scale)
    wallOutlineThickness: 3,
    thinWallAdjustment: 1.5,
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
    wallOutline: 0xffa500, // Orange outline for walls
    pellet: 0xffb897,
    powerup: 0xffffff,
    player: 0xffff00,
    fire: 0xff4500,
    blinky: 0xff0000,
    pinky: 0xffb8ff,
    inky: 0x00ffff,
    clyde: 0xffb851,
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