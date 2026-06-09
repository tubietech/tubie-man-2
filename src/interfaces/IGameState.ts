import { Difficulty } from '../enums/Difficulty';

export interface IGameState {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  difficulty: Difficulty;
  isPaused: boolean;
  isGameOver: boolean;
  isGetReady: boolean;
  pelletsEaten: number;
  injuryComboCount: number;
  lastInjuryTime: number;
}

export interface IGameStateCallbacks {
  onScoreChanged?: (score: number, highScore: number) => void;
  onLivesChanged?: (lives: number) => void;
  onLevelChanged?: (level: number) => void;
  onGameStateChanged?: (state: 'playing' | 'paused' | 'gameOver' | 'getReady') => void;
}
