import { GameStateManager } from '../managers/GameStateManager';
import { SoundEffect } from '../utils/AudioManager';

/**
 * Context passed to collision handlers providing access to game systems
 */
export interface ICollisionContext {
  gameState: GameStateManager;
  time: number;
  addScore: (points: number) => void;
  showFloatingScore: (x: number, y: number, score: number) => void;
  showInjuryScore: (x: number, y: number, score: number) => void;
  playSound: (sound: SoundEffect) => void;
  loseLife: () => void;
}
