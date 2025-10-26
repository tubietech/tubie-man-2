class Game extends Phaser.Game {
    constructor() {
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            scene: [BootScene, MainScene],
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            }
        };

        super(config);
    }
}

export default Game;