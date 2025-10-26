import { Language } from '../../enums/Language';

export const languageFiles = {
  [Language.ENGLISH]: {
    gameTitle: 'FIRE BREATHER',
    gameOver: 'GAME OVER',
    clickToRestart: 'Click to Restart',
    selectDifficulty: 'Select Difficulty:',
    easy: 'EASY',
    medium: 'MEDIUM',
    hard: 'HARD',
    controls: 'Controls: Arrow Keys or WASD\nFire: SPACE\nTouch: Swipe direction',
    score: 'Score',
    highScore: 'Hi-Score',
    lives: 'Lives',
    level: 'Level',
    power: 'Power',
    powerReady: 'Ready',
    powerNone: 'None',
    powerActive: 'Active'
  },
  [Language.SPANISH]: {
    gameTitle: 'LANZA FUEGO',
    gameOver: 'JUEGO TERMINADO',
    clickToRestart: 'Clic para Reiniciar',
    selectDifficulty: 'Seleccionar Dificultad:',
    easy: 'FÁCIL',
    medium: 'MEDIO',
    hard: 'DIFÍCIL',
    controls: 'Controles: Flechas o WASD\nFuego: ESPACIO\nTáctil: Deslizar dirección',
    score: 'Puntos',
    highScore: 'Récord',
    lives: 'Vidas',
    level: 'Nivel',
    power: 'Poder',
    powerReady: 'Listo',
    powerNone: 'Ninguno',
    powerActive: 'Activo'
  },
  [Language.FRENCH]: {
    gameTitle: 'CRACHEUR DE FEU',
    gameOver: 'JEU TERMINÉ',
    clickToRestart: 'Cliquer pour Redémarrer',
    selectDifficulty: 'Sélectionner Difficulté:',
    easy: 'FACILE',
    medium: 'MOYEN',
    hard: 'DIFFICILE',
    controls: 'Contrôles: Flèches ou WASD\nFeu: ESPACE\nTactile: Glisser direction',
    score: 'Score',
    highScore: 'Meilleur',
    lives: 'Vies',
    level: 'Niveau',
    power: 'Pouvoir',
    powerReady: 'Prêt',
    powerNone: 'Aucun',
    powerActive: 'Actif'
  },
  [Language.GERMAN]: {
    gameTitle: 'FEUERATEM',
    gameOver: 'SPIEL VORBEI',
    clickToRestart: 'Klicken zum Neustarten',
    selectDifficulty: 'Schwierigkeit Wählen:',
    easy: 'LEICHT',
    medium: 'MITTEL',
    hard: 'SCHWER',
    controls: 'Steuerung: Pfeile oder WASD\nFeuer: LEERTASTE\nTouch: Richtung wischen',
    score: 'Punkte',
    highScore: 'Rekord',
    lives: 'Leben',
    level: 'Level',
    power: 'Kraft',
    powerReady: 'Bereit',
    powerNone: 'Keine',
    powerActive: 'Aktiv'
  }
};

export type LanguageKey = keyof typeof languageFiles[Language.ENGLISH];