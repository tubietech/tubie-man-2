import { gameConfig } from '../config/gameConfig';
import { Logger } from './Logger';
import { LogGroup } from '../enums/LogGroup';
import { IKeyBinding } from '../ui/elements/UIKeyBindingSetting';
import Phaser from 'phaser';

/**
 * Interface for all persisted game settings
 */
export interface IGameSettings {
  controls: {
    keyboard: {
      fire: IKeyBinding;
      continue: IKeyBinding;
      pause: IKeyBinding;
      up: IKeyBinding;
      down: IKeyBinding;
      left: IKeyBinding;
      right: IKeyBinding;
    };
  };
}

/**
 * Manages game settings persistence using browser localStorage.
 * Provides defaults from gameConfig and persists user changes.
 */
export class SettingsManager {
  private static readonly STORAGE_KEY = 'tubie-man-settings';
  private static instance: SettingsManager | null = null;
  private settings: IGameSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Get the singleton instance of SettingsManager
   */
  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Get the default settings from gameConfig
   */
  private getDefaultSettings(): IGameSettings {
    return {
      controls: {
        keyboard: {
          fire: { type: 'keyboard', key: gameConfig.controls.keyboard.fire },
          continue: { type: 'keyboard', key: gameConfig.controls.keyboard.continue },
          pause: { type: 'keyboard', key: gameConfig.controls.keyboard.pause },
          up: { type: 'keyboard', key: gameConfig.controls.keyboard.up },
          down: { type: 'keyboard', key: gameConfig.controls.keyboard.down },
          left: { type: 'keyboard', key: gameConfig.controls.keyboard.left },
          right: { type: 'keyboard', key: gameConfig.controls.keyboard.right }
        }
      }
    };
  }

  /**
   * Load settings from localStorage, falling back to defaults
   */
  private loadSettings(): IGameSettings {
    try {
      const stored = localStorage.getItem(SettingsManager.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<IGameSettings>;
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to load settings: ${error}`);
    }
    return this.getDefaultSettings();
  }

  /**
   * Merge loaded settings with defaults to handle missing fields
   */
  private mergeWithDefaults(loaded: Partial<IGameSettings>): IGameSettings {
    const defaults = this.getDefaultSettings();

    return {
      controls: {
        keyboard: {
          fire: loaded.controls?.keyboard?.fire ?? defaults.controls.keyboard.fire,
          continue: loaded.controls?.keyboard?.continue ?? defaults.controls.keyboard.continue,
          pause: loaded.controls?.keyboard?.pause ?? defaults.controls.keyboard.pause,
          up: loaded.controls?.keyboard?.up ?? defaults.controls.keyboard.up,
          down: loaded.controls?.keyboard?.down ?? defaults.controls.keyboard.down,
          left: loaded.controls?.keyboard?.left ?? defaults.controls.keyboard.left,
          right: loaded.controls?.keyboard?.right ?? defaults.controls.keyboard.right
        }
      }
    };
  }

  /**
   * Save current settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SettingsManager.STORAGE_KEY, JSON.stringify(this.settings));
      Logger.logStatic(LogGroup.GAME, 'Settings saved');
    } catch (error) {
      Logger.errorStatic(LogGroup.GAME, `Failed to save settings: ${error}`);
    }
  }

  /**
   * Get all settings
   */
  getSettings(): IGameSettings {
    return this.settings;
  }

  // ============== Fire ==============
  getFireBinding(): IKeyBinding {
    return this.settings.controls.keyboard.fire;
  }

  setFireBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.fire = binding;
    this.saveSettings();
  }

  getFireKeyCode(): number {
    return this.getKeyCode(this.getFireBinding(), Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  isFireGamepad(): boolean {
    return this.getFireBinding().type === 'gamepad';
  }

  getFireGamepadButton(): number {
    const binding = this.getFireBinding();
    if (binding.type === 'gamepad' && binding.button !== undefined) {
      return binding.button;
    }
    return gameConfig.controls.gamepad.fire;
  }

  // ============== Continue ==============
  getContinueBinding(): IKeyBinding {
    return this.settings.controls.keyboard.continue;
  }

  setContinueBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.continue = binding;
    this.saveSettings();
  }

  getContinueKeyCode(): number {
    return this.getKeyCode(this.getContinueBinding(), Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  // ============== Pause ==============
  getPauseBinding(): IKeyBinding {
    return this.settings.controls.keyboard.pause;
  }

  setPauseBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.pause = binding;
    this.saveSettings();
  }

  getPauseKeyCode(): number {
    return this.getKeyCode(this.getPauseBinding(), Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // ============== Movement ==============
  getUpBinding(): IKeyBinding {
    return this.settings.controls.keyboard.up;
  }

  setUpBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.up = binding;
    this.saveSettings();
  }

  getUpKeyCode(): number {
    return this.getKeyCode(this.getUpBinding(), Phaser.Input.Keyboard.KeyCodes.W);
  }

  getDownBinding(): IKeyBinding {
    return this.settings.controls.keyboard.down;
  }

  setDownBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.down = binding;
    this.saveSettings();
  }

  getDownKeyCode(): number {
    return this.getKeyCode(this.getDownBinding(), Phaser.Input.Keyboard.KeyCodes.S);
  }

  getLeftBinding(): IKeyBinding {
    return this.settings.controls.keyboard.left;
  }

  setLeftBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.left = binding;
    this.saveSettings();
  }

  getLeftKeyCode(): number {
    return this.getKeyCode(this.getLeftBinding(), Phaser.Input.Keyboard.KeyCodes.A);
  }

  getRightBinding(): IKeyBinding {
    return this.settings.controls.keyboard.right;
  }

  setRightBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.right = binding;
    this.saveSettings();
  }

  getRightKeyCode(): number {
    return this.getKeyCode(this.getRightBinding(), Phaser.Input.Keyboard.KeyCodes.D);
  }

  // ============== Helper Methods ==============

  /**
   * Get the Phaser key code for a binding with a fallback
   */
  private getKeyCode(binding: IKeyBinding, fallback: number): number {
    if (binding.type === 'keyboard' && binding.key) {
      return this.keyNameToKeyCode(binding.key);
    }
    return fallback;
  }

  /**
   * Convert a key name string to Phaser KeyCode
   */
  private keyNameToKeyCode(keyName: string): number {
    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

    // Handle special cases
    const specialKeys: { [key: string]: number } = {
      'SPACE': KeyCodes.SPACE,
      'ENTER': KeyCodes.ENTER,
      'ESC': KeyCodes.ESC,
      'TAB': KeyCodes.TAB,
      'BACKSPACE': KeyCodes.BACKSPACE,
      'DELETE': KeyCodes.DELETE,
      'UP': KeyCodes.UP,
      'DOWN': KeyCodes.DOWN,
      'LEFT': KeyCodes.LEFT,
      'RIGHT': KeyCodes.RIGHT,
      'SHIFT': KeyCodes.SHIFT,
      'CTRL': KeyCodes.CTRL,
      'ALT': KeyCodes.ALT
    };

    if (specialKeys[keyName]) {
      return specialKeys[keyName];
    }

    // For single letters, use the KeyCodes enum directly
    if (keyName.length === 1 && keyName.match(/[A-Z]/)) {
      return KeyCodes[keyName as keyof typeof KeyCodes] as number;
    }

    // For numbers
    if (keyName.length === 1 && keyName.match(/[0-9]/)) {
      const numKey = `ZERO ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE`.split(' ')[parseInt(keyName)];
      return KeyCodes[numKey as keyof typeof KeyCodes] as number;
    }

    // Function keys
    if (keyName.match(/^F\d+$/)) {
      return KeyCodes[keyName as keyof typeof KeyCodes] as number;
    }

    // Fallback
    Logger.errorStatic(LogGroup.GAME, `Unknown key name: ${keyName}, falling back to default`);
    return KeyCodes.SPACE;
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }
}
