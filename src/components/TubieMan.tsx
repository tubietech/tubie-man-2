import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { PreloadScene } from '../scenes/PreloadScene';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { gameConfig } from '../config/gameConfig';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

export default function FireBreatherGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<Orientation>(Orientation.HORIZONTAL);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const updateOrientation = () => {
      const isVertical = window.innerWidth < window.innerHeight;
      Logger.logStatic(LogGroup.GAME, `Orientation change detected. Screen Dimensions: width: ${window.innerWidth}, height: ${window.innerHeight}.\n\t\t New orientation: ${isVertical ? 'VERTICAL' : 'HORIZONTAL'}`);
      setOrientation(isVertical ? Orientation.VERTICAL : Orientation.HORIZONTAL);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);

    return () => window.removeEventListener('resize', updateOrientation);
  }, [orientation]);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    // Calculate optimal dimensions based on viewport
    // Use config modifiers to ensure it scales well on all screens
    const targetWidth = Math.floor(window.innerWidth * gameConfig.window.widthModifier);
    const targetHeight = Math.floor(window.innerHeight * gameConfig.window.heightModifier);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: targetWidth,
      height: targetHeight,
      parent: "phaser-container",
      backgroundColor: '#000000',
      scene: [PreloadScene, MenuScene, GameScene],
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
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: targetWidth,
        height: targetHeight
      },
      fps: {
        target: 120,
        forceSetTimeOut: false
      }
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    game.events.once('ready', () => {
      const menuScene = game.scene.getScene('MenuScene') as MenuScene;
      if (menuScene) {
        Logger.logStatic(LogGroup.GAME, `Setting initial orientation for MenuScene: ${orientation}`);
        menuScene.setOrientation(orientation);
      }
    });

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [orientation]);

  // Handle orientation changes
  useEffect(() => {
    if (!phaserGameRef.current) return;

    const updateOrientation = () => {
      const game = phaserGameRef.current;
      if (!game) return;

      const isVertical = window.innerWidth < window.innerHeight;

      // Update orientation in active scenes
      const activeScenes = game.scene.getScenes(true);
      activeScenes.forEach(scene => {
        if (scene instanceof MenuScene || scene instanceof GameScene) {
          scene.orientation = isVertical ? Orientation.VERTICAL : Orientation.HORIZONTAL;
        }
      });
    };

    updateOrientation();
  }, [orientation]);
  
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      <div id="phaser-container" ref={gameRef} style={{ width: '100%', height: '100%', display: 'flex'}}>
      </div>
    </div>
  );
}