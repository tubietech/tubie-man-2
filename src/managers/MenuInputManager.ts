import Phaser from 'phaser';
import { SettingsManager } from '../utils/SettingsManager';
import { AudioInputHelper } from './AudioInputHelper';

/**
 * Navigation directions for menu input
 */
export enum MenuNavigationDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  SELECT = 'select',
  BACK = 'back'
}

/**
 * Callbacks for menu navigation input
 */
export interface IMenuInputCallbacks {
  onNavigate: (direction: MenuNavigationDirection) => void;
  onTab: (shiftHeld: boolean) => void;
  onMuteToggle?: () => void;
}

/**
 * Manages keyboard input for menu navigation.
 * Provides reusable input setup that respects user key bindings.
 */
export class MenuInputManager {
  private scene: Phaser.Scene;
  private callbacks: IMenuInputCallbacks;
  private settingsManager: SettingsManager;

  // Arrow keys (always available)
  private upKey: Phaser.Input.Keyboard.Key | null = null;
  private downKey: Phaser.Input.Keyboard.Key | null = null;
  private leftKey: Phaser.Input.Keyboard.Key | null = null;
  private rightKey: Phaser.Input.Keyboard.Key | null = null;

  // Custom keys from settings
  private customUpKey: Phaser.Input.Keyboard.Key | null = null;
  private customDownKey: Phaser.Input.Keyboard.Key | null = null;
  private customLeftKey: Phaser.Input.Keyboard.Key | null = null;
  private customRightKey: Phaser.Input.Keyboard.Key | null = null;

  // Action keys
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  private customConfirmKey: Phaser.Input.Keyboard.Key | null = null;
  private escapeKey: Phaser.Input.Keyboard.Key | null = null;
  private tabKey: Phaser.Input.Keyboard.Key | null = null;

  // Audio input (shared mute key handling)
  private audioInputHelper: AudioInputHelper | null = null;

  constructor(scene: Phaser.Scene, callbacks: IMenuInputCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.settingsManager = SettingsManager.getInstance();
  }

  /**
   * Set up all keyboard input handlers
   */
  setup(): void {
    if (!this.scene.input.keyboard) return;

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

    // Arrow keys (always available for navigation)
    this.upKey = this.scene.input.keyboard.addKey(KeyCodes.UP);
    this.downKey = this.scene.input.keyboard.addKey(KeyCodes.DOWN);
    this.leftKey = this.scene.input.keyboard.addKey(KeyCodes.LEFT);
    this.rightKey = this.scene.input.keyboard.addKey(KeyCodes.RIGHT);

    // Custom movement keys from settings (only add if different from arrow keys)
    const customUpCode = this.settingsManager.getUpKeyCode();
    const customDownCode = this.settingsManager.getDownKeyCode();
    const customLeftCode = this.settingsManager.getLeftKeyCode();
    const customRightCode = this.settingsManager.getRightKeyCode();
    const customConfirmCode = this.settingsManager.getContinueKeyCode();

    if (customUpCode !== KeyCodes.UP)
      this.customUpKey = this.scene.input.keyboard.addKey(customUpCode);

    if (customDownCode !== KeyCodes.DOWN)
      this.customDownKey = this.scene.input.keyboard.addKey(customDownCode);

    if (customLeftCode !== KeyCodes.LEFT)
      this.customLeftKey = this.scene.input.keyboard.addKey(customLeftCode);

    if (customRightCode !== KeyCodes.RIGHT)
      this.customRightKey = this.scene.input.keyboard.addKey(customRightCode);

    // Action keys - Enter is always available, plus custom confirm from settings (if different)
    this.enterKey = this.scene.input.keyboard.addKey(KeyCodes.ENTER);
    if (customConfirmCode !== KeyCodes.ENTER)
      this.customConfirmKey = this.scene.input.keyboard.addKey(customConfirmCode);

    this.escapeKey = this.scene.input.keyboard.addKey(KeyCodes.ESC);
    this.tabKey = this.scene.input.keyboard.addKey(KeyCodes.TAB);

    // Bind navigation callbacks
    this.bindNavigationKeys();

    // Mute key handling via shared helper
    this.audioInputHelper = new AudioInputHelper(this.scene, this.callbacks.onMuteToggle);
    this.audioInputHelper.setupMuteKey();
  }

  private bindNavigationKeys(): void {
    // UP - Previous element (arrow + custom)
    this.upKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.UP));
    this.customUpKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.UP));

    // DOWN - Next element (arrow + custom)
    this.downKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.DOWN));
    this.customDownKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.DOWN));

    // LEFT - Left within element (arrow + custom)
    this.leftKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.LEFT));
    this.customLeftKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.LEFT));

    // RIGHT - Right within element (arrow + custom)
    this.rightKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.RIGHT));
    this.customRightKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.RIGHT));

    // ENTER / Custom confirm - Select
    this.enterKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.SELECT));
    this.customConfirmKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.SELECT));

    // ESC - Back
    this.escapeKey?.on('down', () => this.callbacks.onNavigate(MenuNavigationDirection.BACK));

    // TAB - Next element (always moves to next, never handled by element)
    // Use addCapture to prevent default browser tab behavior
    this.scene.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.tabKey?.on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
      this.callbacks.onTab(event?.shiftKey ?? false);
    });

  }

  /**
   * Clean up all keyboard input handlers
   */
  cleanup(): void {
    const keys = [
      this.upKey, this.downKey, this.leftKey, this.rightKey,
      this.customUpKey, this.customDownKey, this.customLeftKey, this.customRightKey,
      this.enterKey, this.customConfirmKey, this.escapeKey, this.tabKey
    ];

    keys.forEach(key => {
      if (key) {
        key.off('down');
        key.destroy();
      }
    });

    this.upKey = null;
    this.downKey = null;
    this.leftKey = null;
    this.rightKey = null;
    this.customUpKey = null;
    this.customDownKey = null;
    this.customLeftKey = null;
    this.customRightKey = null;
    this.enterKey = null;
    this.customConfirmKey = null;
    this.escapeKey = null;
    this.tabKey = null;

    if (this.audioInputHelper) {
      this.audioInputHelper.cleanup();
      this.audioInputHelper = null;
    }
  }
}
