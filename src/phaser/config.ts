export const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: function() {
      // Load assets here
    },
    create: function() {
      // Initialize game objects here
    },
    update: function() {
      // Game loop logic here
    }
  }
};