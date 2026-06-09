import { LogGroup } from '../enums/LogGroup';

/**
 * Logging configuration
 * Set group values to true to enable logging for that group
 * Set to false to disable logging for that group
 */
export const logConfig = {
  /**
   * Groups configuration - enable/disable logging per group
   */
  groups: {
    [LogGroup.ENEMY]: false,
    [LogGroup.PLAYER]: false,
    [LogGroup.GAME]: false,
    [LogGroup.UI]: false,
    [LogGroup.PATHFINDING]: false,
    [LogGroup.POWERUP]: false,
    [LogGroup.MAP]: false,
    [LogGroup.SCENE]: false,
    [LogGroup.INPUT]: false,
    [LogGroup.COLLISION]: false,
    [LogGroup.ANIMATION]: false,
    [LogGroup.SOUND]: false,
    [LogGroup.PRELOAD]: false,
    [LogGroup.MENU]: false,
    [LogGroup.LOCALIZATION]: false,
    [LogGroup.RENDERER]: false,
    [LogGroup.PERFORMANCE]: false,
    [LogGroup.PALETTE]: false,
    [LogGroup.BONUS]: false,
    [LogGroup.DEVELOPER]: false,
    [LogGroup.QUIRK]: false,
    [LogGroup.PROJECTILE]: false,
    [LogGroup.TOUCH]: false
  },

  /**
   * Indentation string for multi-line logs
   * Subsequent lines in multi-line messages will be indented with this string
   */
  indentation: '    ' // 4 spaces
};
