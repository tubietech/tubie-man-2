import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { gameConfig } from '../config/gameConfig';

export default function FireBreatherGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<Orientation>(Orientation.HORIZONTAL);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  
  useEffect(() => {
    const updateOrientation = () => {
      const isVertical = window.innerWidth < window.innerHeight;
      setOrientation(isVertical ? Orientation.VERTICAL : Orientation.HORIZONTAL);
    };
    
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);
  
  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    const mapWidth = gameConfig.map.width * gameConfig.map.tileSize;
    const mapHeight = gameConfig.map.height * gameConfig.map.tileSize;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: mapWidth,
      height: mapHeight,
      parent: gameRef.current,
      backgroundColor: '#000000',
      scene: [MenuScene, GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      input: {
        gamepad: true
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: mapWidth,
        height: mapHeight
      }
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    game.events.once('ready', () => {
      const menuScene = game.scene.getScene('MenuScene') as MenuScene;
      if (menuScene) {
        menuScene.orientation = orientation;
      }
    });

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  // Handle orientation changes and resize
  useEffect(() => {
    if (!phaserGameRef.current) return;

    const handleResize = () => {
      const game = phaserGameRef.current;
      if (!game) return;

      const mapWidth = gameConfig.map.width * gameConfig.map.tileSize;
      const mapHeight = gameConfig.map.height * gameConfig.map.tileSize;
      const isVertical = window.innerWidth < window.innerHeight;

      // Calculate scale to fill screen
      let scale: number;
      if (isVertical) {
        // In vertical layout, scale to fill width
        scale = window.innerWidth / mapWidth;
      } else {
        // In horizontal layout, scale to fill height
        scale = window.innerHeight / mapHeight;
      }

      const newWidth = mapWidth * scale;
      const newHeight = mapHeight * scale;

      game.scale.resize(newWidth, newHeight);

      // Update orientation in active scenes
      const activeScenes = game.scene.getScenes(true);
      activeScenes.forEach(scene => {
        if (scene instanceof MenuScene || scene instanceof GameScene) {
          scene.orientation = isVertical ? Orientation.VERTICAL : Orientation.HORIZONTAL;
          if (scene.scale && scene.scale.emit) {
            scene.scale.emit('resize', scene.scale.gameSize, scene.scale.baseSize, scene.scale.displaySize, scene.scale.previousWidth, scene.scale.previousHeight);
          }
        }
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [orientation]);
  
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div ref={gameRef} className="max-w-full max-h-full" />
    </div>
  );
}