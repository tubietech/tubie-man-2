import { gameConfig } from '../config/gameConfig';
import { Logger } from './Logger';
import { LogGroup } from '../enums/LogGroup';
import { IKeyBinding } from '../ui/elements/UIKeyBindingSetting';
import { AudioManager } from './AudioManager';
import { TouchInputType } from '../enums/TouchInputType';
import { TubeType } from '../enums/TubeType';
import Phaser from 'phaser';

/**
 * Interface for controller button binding
 */
export interface IControllerBinding {
  button: number;
}

/**
 * Interface for all persisted game settings
 */
export interface IGameSettings {
  arcadeMode: boolean;
  tubeType: TubeType;
  controls: {
    keyboard: {
      fire: IKeyBinding;
      continue: IKeyBinding;
      pause: IKeyBinding;
      mute: IKeyBinding;
      up: IKeyBinding;
      down: IKeyBinding;
      left: IKeyBinding;
      right: IKeyBinding;
    };
    gamepad: {
      fire: IControllerBinding;
      continue: IControllerBinding;
      pause: IControllerBinding;
      up: IControllerBinding;
      down: IControllerBinding;
      left: IControllerBinding;
      right: IControllerBinding;
      mute: IControllerBinding;
    };
    touch: {
      isRightHanded: boolean;
      inputType: TouchInputType;
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
      arcadeMode: false,
      tubeType: TubeType.NONE,
      controls: {
        keyboard: {
          fire: { type: 'keyboard', key: gameConfig.controls.keyboard.fire },
          continue: { type: 'keyboard', key: gameConfig.controls.keyboard.continue },
          pause: { type: 'keyboard', key: gameConfig.controls.keyboard.pause },
          mute: { type: 'keyboard', key: gameConfig.controls.keyboard.mute },
          up: { type: 'keyboard', key: gameConfig.controls.keyboard.up },
          down: { type: 'keyboard', key: gameConfig.controls.keyboard.down },
          left: { type: 'keyboard', key: gameConfig.controls.keyboard.left },
          right: { type: 'keyboard', key: gameConfig.controls.keyboard.right }
        },
        gamepad: {
          fire: { button: gameConfig.controls.gamepad.fire },
          continue: { button: gameConfig.controls.gamepad.continue },
          pause: { button: gameConfig.controls.gamepad.pause },
          up: { button: gameConfig.controls.gamepad.up },
          down: { button: gameConfig.controls.gamepad.down },
          left: { button: gameConfig.controls.gamepad.left },
          right: { button: gameConfig.controls.gamepad.right },
          mute: { button: gameConfig.controls.gamepad.mute }
        },
        touch: {
          isRightHanded: true,
          inputType: TouchInputType.JOYSTICK
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
      arcadeMode: loaded.arcadeMode ?? defaults.arcadeMode,
      tubeType: loaded.tubeType ?? defaults.tubeType,
      controls: {
        keyboard: {
          fire: loaded.controls?.keyboard?.fire ?? defaults.controls.keyboard.fire,
          continue: loaded.controls?.keyboard?.continue ?? defaults.controls.keyboard.continue,
          pause: loaded.controls?.keyboard?.pause ?? defaults.controls.keyboard.pause,
          mute: loaded.controls?.keyboard?.mute ?? defaults.controls.keyboard.mute,
          up: loaded.controls?.keyboard?.up ?? defaults.controls.keyboard.up,
          down: loaded.controls?.keyboard?.down ?? defaults.controls.keyboard.down,
          left: loaded.controls?.keyboard?.left ?? defaults.controls.keyboard.left,
          right: loaded.controls?.keyboard?.right ?? defaults.controls.keyboard.right
        },
        gamepad: {
          fire: loaded.controls?.gamepad?.fire ?? defaults.controls.gamepad.fire,
          continue: loaded.controls?.gamepad?.continue ?? defaults.controls.gamepad.continue,
          pause: loaded.controls?.gamepad?.pause ?? defaults.controls.gamepad.pause,
          up: loaded.controls?.gamepad?.up ?? defaults.controls.gamepad.up,
          down: loaded.controls?.gamepad?.down ?? defaults.controls.gamepad.down,
          left: loaded.controls?.gamepad?.left ?? defaults.controls.gamepad.left,
          right: loaded.controls?.gamepad?.right ?? defaults.controls.gamepad.right,
          mute: loaded.controls?.gamepad?.mute ?? defaults.controls.gamepad.mute
        },
        touch: {
          isRightHanded: loaded.controls?.touch?.isRightHanded ?? defaults.controls.touch.isRightHanded,
          inputType: loaded.controls?.touch?.inputType ?? defaults.controls.touch.inputType
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

  // ============== Tube Type ==============
  getTubeType(): TubeType {
    return this.settings.tubeType;
  }

  setTubeType(tubeType: TubeType): void {
    this.settings.tubeType = tubeType;
    this.saveSettings();
  }

  // ============== Arcade Mode ==============
  isArcadeMode(): boolean {
    return this.settings.arcadeMode;
  }

  setArcadeMode(enabled: boolean): void {
    this.settings.arcadeMode = enabled;
    this.saveSettings();
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

  // ============== Mute ==============
  getMuteBinding(): IKeyBinding {
    return this.settings.controls.keyboard.mute;
  }

  setMuteBinding(binding: IKeyBinding): void {
    this.settings.controls.keyboard.mute = binding;
    this.saveSettings();
  }

  getMuteKeyCode(): number {
    return this.getKeyCode(this.getMuteBinding(), Phaser.Input.Keyboard.KeyCodes.M);
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

  // ============== Gamepad Bindings ==============

  getGamepadFireBinding(): IControllerBinding {
    return this.settings.controls.gamepad.fire;
  }

  setGamepadFireBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.fire = binding;
    this.saveSettings();
  }

  getGamepadContinueBinding(): IControllerBinding {
    return this.settings.controls.gamepad.continue;
  }

  setGamepadContinueBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.continue = binding;
    this.saveSettings();
  }

  getGamepadPauseBinding(): IControllerBinding {
    return this.settings.controls.gamepad.pause;
  }

  setGamepadPauseBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.pause = binding;
    this.saveSettings();
  }

  getGamepadUpBinding(): IControllerBinding {
    return this.settings.controls.gamepad.up;
  }

  setGamepadUpBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.up = binding;
    this.saveSettings();
  }

  getGamepadDownBinding(): IControllerBinding {
    return this.settings.controls.gamepad.down;
  }

  setGamepadDownBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.down = binding;
    this.saveSettings();
  }

  getGamepadLeftBinding(): IControllerBinding {
    return this.settings.controls.gamepad.left;
  }

  setGamepadLeftBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.left = binding;
    this.saveSettings();
  }

  getGamepadRightBinding(): IControllerBinding {
    return this.settings.controls.gamepad.right;
  }

  setGamepadRightBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.right = binding;
    this.saveSettings();
  }

  getGamepadMuteBinding(): IControllerBinding {
    return this.settings.controls.gamepad.mute;
  }

  setGamepadMuteBinding(binding: IControllerBinding): void {
    this.settings.controls.gamepad.mute = binding;
    this.saveSettings();
  }

  getTouchIsRightHanded(): boolean {
    return this.settings.controls.touch.isRightHanded;
  }

  setTouchIsRightHanded(isRightHanded: boolean): void {
    this.settings.controls.touch.isRightHanded = isRightHanded;
    this.saveSettings();
  }

  getTouchInputType(): TouchInputType {
    return this.settings.controls.touch.inputType;
  }

  setTouchInputType(inputType: TouchInputType): void {
    this.settings.controls.touch.inputType = inputType;
    this.saveSettings();
  }

  /**
   * Get button name from button number
   */
  getGamepadButtonName(button: number): string {
    const buttonNames = gameConfig.controls.gamepadButtonNames as { [key: number]: string };
    return buttonNames[button] ?? `BTN${button}`;
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
      'ALT': KeyCodes.ALT,
      // Punctuation and symbols
      'COMMA': KeyCodes.COMMA,
      'PERIOD': KeyCodes.PERIOD,
      'SEMICOLON': KeyCodes.SEMICOLON,
      'QUOTE': KeyCodes.QUOTES,
      'BACKQUOTE': KeyCodes.BACKTICK,
      'SLASH': KeyCodes.FORWARD_SLASH,
      'BACKSLASH': KeyCodes.BACK_SLASH,
      'MINUS': KeyCodes.MINUS,
      'EQUAL': KeyCodes.PLUS,
      // Bracket keys (from event.code format)
      'BracketLeft': KeyCodes.OPEN_BRACKET,
      'BracketRight': KeyCodes.CLOSED_BRACKET,
      'OPENBRACKET': KeyCodes.OPEN_BRACKET,
      'CLOSEDBRACKET': KeyCodes.CLOSED_BRACKET,
      '[': KeyCodes.OPEN_BRACKET,
      ']': KeyCodes.CLOSED_BRACKET,
      // Other common keys from event.code
      'Comma': KeyCodes.COMMA,
      'Period': KeyCodes.PERIOD,
      'Semicolon': KeyCodes.SEMICOLON,
      'Quote': KeyCodes.QUOTES,
      'Backquote': KeyCodes.BACKTICK,
      'Slash': KeyCodes.FORWARD_SLASH,
      'Backslash': KeyCodes.BACK_SLASH,
      'Minus': KeyCodes.MINUS,
      'Equal': KeyCodes.PLUS
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

  // ============== Audio Settings (delegated to AudioManager) ==============

  /**
   * Get the master volume (0-1)
   */
  getMasterVolume(): number {
    return AudioManager.getInstance().getMasterVolume();
  }

  /**
   * Set the master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    AudioManager.getInstance().setMasterVolume(volume);
  }

  /**
   * Check if master audio is muted
   */
  isMasterMuted(): boolean {
    return AudioManager.getInstance().isMasterMutedState();
  }

  /**
   * Set master mute state
   */
  setMasterMuted(muted: boolean): void {
    AudioManager.getInstance().setMasterMuted(muted);
  }

  /**
   * Get the music volume (0-1)
   */
  getMusicVolume(): number {
    return AudioManager.getInstance().getMusicVolume();
  }

  /**
   * Set the music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    AudioManager.getInstance().setMusicVolume(volume);
  }

  /**
   * Get the SFX volume (0-1)
   */
  getSfxVolume(): number {
    return AudioManager.getInstance().getSfxVolume();
  }

  /**
   * Set the SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    AudioManager.getInstance().setSfxVolume(volume);
  }

  /** 
  * Set music mute state
  */
  setMusicMuted(muted: boolean): void {
    AudioManager.getInstance().setMusicMuted(muted);
  }

  isMusicMuted(): boolean {
    return AudioManager.getInstance().isMusicMutedState();
  }

  /**
   * Mutes and unmutes the sfx
   */
  setSfxMuted(muted: boolean): void {
    AudioManager.getInstance().setSfxMuted(muted);
  }

  /**
   * Returns if sfx are muted
   */
  isSfxMuted(): boolean {
    return AudioManager.getInstance().isSfxMutedState();
  } 
}
