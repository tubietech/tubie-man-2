export const gameConfig = {
  player: {
    speed: { easy: 80, medium: 150, hard: 200 },
    fireBreathDuration: 3000,
    fireBreathCooldown: 1000,
    fireBreathRange: 3,
    startLives: 3,
    playerStartingHeight: 7, // Player starts 7 rows above bottom of map
    animationFrameRate: 15,
    spriteScale: 1.5
  },
  enemy: {
    speed: { easy: 80, medium: 120, hard: 180 },
    scaredDuration: 5000,
    types: ['blinky', 'pinky', 'inky', 'clyde'],
    respawnDelay: 2000
  },
  map: {
    width: 28,
    height: 31,
    tileSize: 10,
    pelletScore: 10,
    powerupScore: 50,
    enemyScore: 200,
    minTunnels: 1,
    maxTunnels: 2,
    tunnelCooldown: 500, // Milliseconds to wait before allowing re-entry to a tunnel
    fillIterations: 3,
    minPowerups: 4,
    maxPowerups: 6,
    maxDeadEndsPerHalf: 2,
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
  }
};