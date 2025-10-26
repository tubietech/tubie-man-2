import React, { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../phaser/config';

const GameCanvas: React.FC = () => {
  useEffect(() => {
    const game = new Phaser.Game(GameConfig);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id="game-container" />;
};

export default GameCanvas;