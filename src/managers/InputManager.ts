import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';
import { SettingsManager } from '../utils/SettingsManager';
import { AudioManager } from '../utils/AudioManager';
import { DeveloperMode } from '../utils/DeveloperMode';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';

/**
 * Callbacks for input actions that need to be handled by the scene
 */
export interface IInputCallbacks {
  onTogglePause: () => void;
  onPointerInput: (x: number, y: number) => void;
  onPointerDrag: (x: number, y: number) => void;
  onFirePressed: () => void;
  // Developer mode callbacks
  onToggleEnemyAI?: () => void;
  onClearPellets?: () => void;
  onKillPlayer?: () => void;
  onActivatePowerup?: () => void;
  onClearHighScores?: () => void;
}

/**
 * Manages all input handling for the game including keyboard, gamepad, and pointer input.
 * Extracts input setup and processing from GameScene.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private callbacks: IInputCallbacks;
  private logger: Logger;

  // Keyboard input
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  fireKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private muteKey!: Phaser.Input.Keyboard.Key;

  // Developer keys
  private devKeys!: {
    toggleAI: Phaser.Input.Keyboard.Key;
    clearPellets: Phaser.Input.Keyboard.Key;
    killPlayer: Phaser.Input.Keyboard.Key;
    activatePowerup: Phaser.Input.Keyboard.Key;
    reloadBrowser: Phaser.Input.Keyboard.Key;
  };
  private devKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

  // State check function (injected from scene)
  private isPaused: () => boolean;

  constructor(
    scene: Phaser.Scene,
    callbacks: IInputCallbacks,
    isPaused: () => boolean
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.isPaused = isPaused;
    this.logger = new Logger(LogGroup.GAME);
  }

  /**
   * Set up all input handlers. Call this in the scene's create() method.
   */
  setup(): void {
    this.setupKeyboardInput();
    this.setupGamepadInput();
    this.setupPointerInput();
    this.setupDeveloperKeys();
  }

  private setupKeyboardInput(): void {
    const settingsManager = SettingsManager.getInstance();

    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    // Movement keys from settings
    this.wasd = this.scene.input.keyboard!.addKeys({
      up: settingsManager.getUpKeyCode(),
      down: settingsManager.getDownKeyCode(),
      left: settingsManager.getLeftKeyCode(),
      right: settingsManager.getRightKeyCode()
    }) as typeof this.wasd;

    // Fire key from settings
    this.fireKey = this.scene.input.keyboard!.addKey(settingsManager.getFireKeyCode());

    // Pause key from settings
    this.pauseKey = this.scene.input.keyboard!.addKey(settingsManager.getPauseKeyCode());
    this.pauseKey.on('down', () => {
      this.callbacks.onTogglePause();
    });

    // Mute key from settings
    this.muteKey = this.scene.input.keyboard!.addKey(settingsManager.getMuteKeyCode());
    this.muteKey.on('down', () => {
      const audioManager = AudioManager.getInstance();
      audioManager.toggleMasterMute();
      SettingsManager.getInstance().setMasterMuted(audioManager.isMasterMutedState());
    });
  }

  private setupGamepadInput(): void {
    this.scene.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === gameConfig.controls.gamepad.pause)
        this.callbacks.onTogglePause();

      if (button.index === gameConfig.controls.gamepad.mute) {
        const audioManager = AudioManager.getInstance();
        audioManager.toggleMasterMute();
        SettingsManager.getInstance().setMasterMuted(audioManager.isMasterMutedState());
      }
    });
  }

  private setupPointerInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPaused())
        this.callbacks.onPointerInput(pointer.x, pointer.y);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPaused() && pointer.isDown && pointer.primaryDown)
        this.callbacks.onPointerDrag(pointer.x, pointer.y);
    });
  }

  /**
   * Process input during the update loop.
   * Call this in the scene's update() method.
   */
  update(): void {
    // Check fire key
    if (Phaser.Input.Keyboard.JustDown(this.fireKey))
      this.callbacks.onFirePressed();

    // Check gamepad fire button
    if (this.scene.input.gamepad && this.scene.input.gamepad.total > 0) {
      const pad = this.scene.input.gamepad.getPad(0);
      if (pad) {
        const settingsManager = SettingsManager.getInstance();
        const fireButton = settingsManager.getFireGamepadButton();
        if (pad.buttons[fireButton] && pad.buttons[fireButton].pressed)
          this.callbacks.onFirePressed();
      }
    }
  }

  /**
   * Get the first connected gamepad, if any.
   */
  getGamepad(): Phaser.Input.Gamepad.Gamepad | null {
    if (this.scene.input.gamepad && this.scene.input.gamepad.total > 0)
      return this.scene.input.gamepad.getPad(0);
    return null;
  }

  /**
   * Set up developer mode key bindings.
   * Only active when developer mode is enabled.
   */
  private setupDeveloperKeys(): void {
    const devLogger = new Logger(LogGroup.DEVELOPER);

    // ! (Shift+1) - Reset high scores (uses DOM event for shifted key)
    this.devKeydownHandler = (event: KeyboardEvent) => {
      if (event.key === '!' && DeveloperMode.getInstance().isEnabled()) {
        if (this.callbacks.onClearHighScores) {
          this.callbacks.onClearHighScores();
          devLogger.log('High scores cleared');
        }
      }
    };
    window.addEventListener('keydown', this.devKeydownHandler);

    if (!this.scene.input.keyboard) return;

    // Create developer key bindings
    this.devKeys = {
      toggleAI: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.toggleEnemyAI as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      clearPellets: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.clearPellets as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      killPlayer: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.killPlayer as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      activatePowerup: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.activatePowerup as keyof typeof Phaser.Input.Keyboard.KeyCodes]),
      reloadBrowser: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[gameConfig.developer.keys.reloadBrowser as keyof typeof Phaser.Input.Keyboard.KeyCodes])
    };

    // Q - Toggle enemy AI
    this.devKeys.toggleAI.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled() && this.callbacks.onToggleEnemyAI) {
        this.callbacks.onToggleEnemyAI();
      }
    });

    // Z - Clear all pellets
    this.devKeys.clearPellets.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled() && this.callbacks.onClearPellets) {
        this.callbacks.onClearPellets();
      }
    });

    // K - Kill player
    this.devKeys.killPlayer.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled() && this.callbacks.onKillPlayer) {
        this.callbacks.onKillPlayer();
      }
    });

    // P - Activate powerup
    this.devKeys.activatePowerup.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled() && this.callbacks.onActivatePowerup) {
        this.callbacks.onActivatePowerup();
      }
    });

    // R - Reload Browser
    this.devKeys.reloadBrowser.on('down', () => {
      if (DeveloperMode.getInstance().isEnabled()) {
        devLogger.log('Reloading Browser');
        window.location.reload();
      }
    });
  }

  /**
   * Clean up event listeners. Call this in the scene's shutdown() method.
   */
  cleanup(): void {
    if (this.devKeydownHandler) {
      window.removeEventListener('keydown', this.devKeydownHandler);
      this.devKeydownHandler = null;
    }
  }
}
