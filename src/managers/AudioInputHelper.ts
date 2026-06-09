import Phaser from 'phaser';
import { SettingsManager } from '../utils/SettingsManager';
import { AudioManager } from '../utils/AudioManager';
import { gameConfig } from '../config/gameConfig';

/**
 * Helper class for setting up audio-related input (mute keys).
 * Provides reusable mute key setup that can be shared across input managers.
 */
export class AudioInputHelper {
  private scene: Phaser.Scene;
  private settingsManager: SettingsManager;

  // Mute keys
  private muteKey: Phaser.Input.Keyboard.Key | null = null;
  private customMuteKey: Phaser.Input.Keyboard.Key | null = null;

  // Custom handler (optional override)
  private onMuteToggle?: () => void;

  constructor(scene: Phaser.Scene, onMuteToggle?: () => void) {
    this.scene = scene;
    this.settingsManager = SettingsManager.getInstance();
    this.onMuteToggle = onMuteToggle;
  }

  /**
   * Set up mute key input handlers
   */
  setupMuteKey(): void {
    if (!this.scene.input.keyboard) return;

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    const customMuteCode = this.settingsManager.getMuteKeyCode();

    // Always add M as default mute key
    this.muteKey = this.scene.input.keyboard.addKey(KeyCodes.M);

    // Add custom mute key if different from M
    if (customMuteCode !== KeyCodes.M)
      this.customMuteKey = this.scene.input.keyboard.addKey(customMuteCode);

    // Bind mute handler
    const muteHandler = () => this.handleMuteToggle();
    this.muteKey.on('down', muteHandler);
    this.customMuteKey?.on('down', muteHandler);
  }

  /**
   * Set up gamepad mute button handler
   */
  setupGamepadMute(): void {
    this.scene.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === gameConfig.controls.gamepad.mute)
        this.handleMuteToggle();
    });
  }

  /**
   * Handle mute toggle - uses custom handler if provided, otherwise default behavior
   */
  private handleMuteToggle(): void {
    if (this.onMuteToggle) {
      this.onMuteToggle();
    } else {
      this.toggleMasterMute();
    }
  }

  /**
   * Default mute toggle behavior - toggles master mute and saves to settings
   */
  static toggleMasterMute(): void {
    const audioManager = AudioManager.getInstance();
    audioManager.toggleMasterMute();
    SettingsManager.getInstance().setMasterMuted(audioManager.isMasterMutedState());
  }

  /**
   * Instance method for default mute toggle
   */
  toggleMasterMute(): void {
    AudioInputHelper.toggleMasterMute();
  }

  /**
   * Clean up mute key handlers
   */
  cleanup(): void {
    if (this.muteKey) {
      this.muteKey.off('down');
      this.muteKey.destroy();
      this.muteKey = null;
    }

    if (this.customMuteKey) {
      this.customMuteKey.off('down');
      this.customMuteKey.destroy();
      this.customMuteKey = null;
    }
  }
}
