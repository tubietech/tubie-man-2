import { GameStateManager } from '../managers/GameStateManager';

/**
 * Context passed to collision handlers providing access to game systems
 */
export interface ICollisionContext {
  gameState: GameStateManager;
  time: number;
  addScore: (points: number) => void;
  showFloatingScore: (x: number, y: number, score: number) => void;
  showInjuryScore: (x: number, y: number, score: number) => void;
  playSound: (sound: string) => void;
  loseLife: () => void;
}
