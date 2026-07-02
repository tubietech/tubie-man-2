export const gameConfig = {
  player: {
    speed: { easy: 60, medium: 75, hard: 90 },
    powerup: {
      v2: {
        duration: { easy: 10000, medium: 7000, hard: 3000 }, // Duration window for firing multiple projectiles (ms)
        fireRateDelay: { easy: 300, medium: 700, hard: 1200 }, // Minimum time between projectile fires (ms) by difficulty
      },
      projectile: {
        speed: 450, // Pixels per second
        maxDistance: 10, // Maximum distance in tiles
        spriteScale: 15.0, // Scale for projectile sprite (make it much more visible)
        animationFrameRate: 25, // Frame rate for projectile animation
      }
    },
    startLives: { easy: 4, medium: 3, hard: 3 },
    playerStartingHeight: 7, // Player starts 7 rows above bottom of map
    animationFrameRate: 18,
    spriteScale: 2,
    deathAnimation: {
      spinCount: 4, // Number of 360-degree spins
      spinDuration: 1000, // Duration of each spin in milliseconds
    },
    invulnerabilityDuration: 2000, // Duration of invulnerability after losing a life (ms)
    injuryComboResetTime: 10000, // Time before injury combo resets (ms)
  },
  enemy: {
    animationFrameRate: 3,
    speed: { easy: 53, medium: 70, hard: 90 },
    injuredSpeed: { easy: 200, medium: 200, hard: 200 }, // Speed when injured and fleeing to pen
    scaredSpeed: { easy: 45, medium: 55, hard: 65 }, // Speed when scared and fleeing from player
    countPerLevel: {
      1: 3,  // Level 1: Pokey, Pricky, Stingy
      2: 3,  // Level 2: Pokey, Pricky, Stingy
      3: 4   // Level 3+: All four enemies (Doc appears)
    },
    respawnDelay: { easy: 10000, medium: 5000, hard: 3500 }, // Time to pause in pen before respawning (ms)
    releaseDelay: { easy: 5000, medium: 3000, hard: 1500 }, // Delay between enemy releases (ms)
    spriteScale: 1.8,//2.1, // Scale multiplier for enemy sprites
    injuredSpriteScale: 2.75, // Scale multiplier for injured enemy sprites
    injuryScores: [100, 200, 500, 700], // Points per combo: 1st, 2nd, 3rd, 4th+
    injuryScoreDisplay: {
      visibleDuration: 750, // Time score is fully visible (ms)
      fadeDuration: 750, // Time for score to fade out (ms)
      spriteScale: 0.15, // Scale for score sprite
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
        loopDuration: 10000, // How long Pokey stays stuck in loop (ms)
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
        sterileModeSpeedMultiplier: { easy: 1, medium: 1.2, hard: 1.5 }  // Speed multiplier in Sterile Mode by difficulty
      },
      doc: {
        thinkingSpeed: { easy: 15, medium: 20, hard: 30 }, // Doc's slow speed when thinking during a chase
        thinkingDuration: { min: 2000, max: 5000 } // Random pause duration range (ms)
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
      scale: 2.2, // Scale bonus sprite relative to tile size
      speed: { easy: 25, medium: 50, hard: 100 }, // Pixels per second by difficulty
      appearancesPerLevel: 2,
      firstAppearance: { min: 60, max: 75 }, // Dots eaten before first appearance
      secondAppearance: { min: 170, max: 180 }, // Dots eaten before second appearance
      penCircles: 2, // Number of times to circle the pen
      scoreDisplay: {
        visibleDuration: 750, // Time score is fully visible (ms)
        fadeDuration: 750, // Time for score to fade out (ms)
        spriteScale: 0.15, // Scale for score sprite (same as player)
      },
    },
    minTunnels: 1,
    maxTunnels: 2,
    tunnelCooldown: 500, // Milliseconds to wait before allowing re-entry to a tunnel
    wallRadius: 8, // Corner radius for wall tiles
    wallEdgeOffset: 0.48, // Inset walls by 48% from tile edges (0-1 scale). This value should not exceed o.5, as single thickness walls will dissappear
    minimumWallThickness: 0.3, // Minimum thickness for walls in grid units (prevents over-thinning)
    wallOutlineThickness: 2,
    winFlash: {
      count: 3,          // Number of times the walls flash
      duration: 750,    // Duration of each flash in ms (one full cycle: flash on + flash off)
      wallColor: 0x000000,       // Flash fill color (black)
      outlineColor: 0xffffff,    // Flash outline color (white)
    },
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
    },
    colors: {
      pellet: 0xffb897,
      penDoor: 0xff8800,
      tunnel: 0x000000,
      getReadyText: 0xffa500, // Bright orange for "Get Ready!" text
      getReadyOutline: 0xffffff, // White outline for "Get Ready!" text
    }
  },
  controls: {
    keyboard: {
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      fire: 'SPACE',
      continue: 'ENTER',
      pause: 'ESC',
      mute: 'M'
    },
    gamepad: {
      // Standard gamepad button mapping (Xbox/PlayStation layout)
      // 0=A/X, 1=B/Circle, 2=X/Square, 3=Y/Triangle
      // 4=LB/L1, 5=RB/R1, 6=LT/L2, 7=RT/R2
      // 8=Select/Share, 9=Start/Options
      // 10=L3, 11=R3, 12=DPad Up, 13=DPad Down, 14=DPad Left, 15=DPad Right
      fire: 0,        // A/X button
      pause: 8,       // Select/Share button
      continue: 0,    // A/X button
      up: 12,         // DPad Up
      down: 13,       // DPad Down
      left: 14,       // DPad Left
      right: 15,       // DPad Right
      mute: 1         // B/Circle button
    },
    // Button name mappings for display
    gamepadButtonNames: {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'SELECT',
      9: 'START',
      10: 'L3',
      11: 'R3',
      12: 'D-UP',
      13: 'D-DOWN',
      14: 'D-LEFT',
      15: 'D-RIGHT'
    }
  },
  touchControls: {
    minMargin: 80,              // Minimum pixel margin to place controls beside the map
    maxSize: 160,               // Maximum joystick diameter in pixels
    bgColor: 0x000000,
    bgAlpha: 0.3,
    buttonBorderColor: 0xffa500, // Orange border, matches game style
    // Joystick knob
    knobRadiusRatio: 0.30,       // Knob radius as fraction of joystick base radius
    knobColor: 0x2121ff,         // Blue, matches walls/pause button
    knobAlpha: 0.7,
    knobActiveColor: 0x6262ff,   // Brighter blue when dragging
    knobActiveAlpha: 0.9,
    joystickSizeRatio: 0.8,       // Joystick base radius as fraction of available space (matches fire button)
    joystickDeadzone: 0.15,      // Fraction of radius — no direction inside this zone
    // Fire button
    fireColor: 0xff4500,         // Fire red
    fireAlpha: 0.6,
    fireActiveColor: 0xff6b35,
    fireActiveAlpha: 0.9,
    fireDisabledAlpha: 0.18,     // Dimmed when no powerup
    fireSizeRatio: 0.8,          // Fire button radius as fraction of joystick size
    swipeThreshold: 20,          // Minimum pixel distance to register a swipe direction
  },
  collision: {
    playerEnemyRadius: 0.75,     // Collision radius as fraction of tileSize
    playerScaredEnemyRadius: 0.35, // Reduced collision radius when enemy is scared
    projectileEnemyRadius: 0.75, // Collision radius as fraction of tileSize
    playerBonusRadius: 0.75,     // Collision radius as fraction of tileSize
  },
  ui: {
    minTopMargin: 90,    // Minimum pixels above the map for score/high score/lives
    minBottomMargin: 80, // Minimum pixels below the map for level/power HUD in portrait mode
    colors: {
      powerupReady: 0x2fb7a1,
      powerupActive: 0xffa500,
      gameUiLabel: 0xffffff,
      gameUiValue: 0xffff00, // Color for score/lives/level values (yellow)
      developerIndicator: 0xffff00, // Yellow asterisk for developer mode indicator
    },
  },
  window: {
    widthModifier: 0.99, // Percentage of viewport width (0-1)
    heightModifier: 0.99, // Percentage of viewport height (0-1)
  },
  developer: {
    // Konami code: Up, Up, Down, Down, Left, Right, Left, Right, B, A
    konamiCode: ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'],
    keys: {
      toggleEnemyAI: 'Q',      // Toggle enemy AI on/off
      clearPellets: 'Z',       // Clear all pellets from screen
      killPlayer: 'K',         // Kill the player
      activatePowerup: 'P',    // Activate player powerup
      reloadBrowser: 'R'         // Forces the browser to reload
    }
  },
  scores: {
    highScoreKey: 'tubie-man-high-score',
    maxEntries: 10,
    defaultName: 'AAA',
    characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-+=*!@#$%&?'
  },
  levelStart: {
    getReadyDelay: 4250, // Duration to show "Get Ready!" text (ms)
    getReadyOutlineThickness: 4
  },
  logging: {
    enabled: true // Global flag to enable/disable all logging
  },
  menu: {
    font: {
      title: 'PressStart2P',
      button: 'PressStart2P',
      label: 'PressStart2P',
    },
    colors: {
      buttonNormal: 0x2b2b2b,
      buttonHighlight: 0x636363,
      buttonBorder: 0x243763,
      buttonText: 0xffffff,
      buttonSelectedText: 0xff6e31,
      titleText: 0xff6e31,
      bodyText: 0xaaaaaa,
      labelText: 0xffffff,
      buttonGroupUnselectedBackground: 0x222222,
      pauseMenuColor: 0x000000,
      pauseMenuAlpha: 0.75,
      toggleValueBackground1: 0x004400, // Dark green for ON state
      toggleValueBackground2: 0x440000, // Dark red for OFF state,
      toggleValueBackground3: 0xffa500,
      toggleValueBackground4: 0x6262ff,
      toggleBorder1: 0x00ff00, // Bright green border for ON state
      toggleBorder2: 0xff0000, // Bright red border for OFF state
      toggleBorder3: 0xffa500,
      toggleBorder4: 0x2121ff,
      sliderGradient: {
        start: 0xff0000, // Red at minimum value
        mid: 0xffff00,   // Yellow at midpoint
        end: 0x00ff00    // Green at maximum value
      },
      mapsLoadedText: 0x2fb7a1,
      mapsFailedText: 0xffaa00,
    },
    layout: {
      spacing: 30,
      buttonWidth: 275,
      buttonHeight: 60,
      buttonGroupSpacing: 10,
      buttonCornerRadius: 15,
      buttonGroupCornerRadius: 8,
      padding: 20,
      borderThickness: 4,
      selectedBorderThickness: 5
    },
    animation: {
      focusScale: 1.1,
      transitionDuration: 200,
      chaseSpeed: 50 // Pixels per second for chase animation
    },
    fontSize: {
      title: '48px',
      button: '20px',
      copyright: '10px'
    }
  },
  audio: {
    // Background music track mappings (keys must match audio file keys in PreloadScene)
    tracks: {
      menu: 'music_menu',
      game: 'music_game',
      gameOver: 'music_gameOver',
      victory: 'music_victory',
      getReady: 'music_getReady'
    },
    // Sound effect mappings (keys must match audio file keys in PreloadScene)
    effects: {
      pelletEat: 'sfx_pellet',
      powerupCollect: 'sfx_powerup',
      enemyHit: 'sfx_enemyHit',
      enemyReturn: 'sfx_enemyReturn',
      playerDeath: 'sfx_death',
      bonusCollect: 'sfx_bonus',
      levelComplete: 'sfx_levelComplete',
      menuSelect: 'sfx_menuSelect',
      menuNavigate: 'sfx_menuNavigate'
    },
  }
};