import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { NavigationDirection } from '../../interfaces/INavigable';
import { UISetting, IUISettingConfig } from './UISetting';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

/**
 * Represents a key binding that can be either a keyboard key or gamepad button
 */
export interface IKeyBinding {
  type: 'keyboard' | 'gamepad';
  key?: string; // Keyboard key name (e.g., 'W', 'SPACE', 'ENTER')
  button?: number; // Gamepad button index
}

export interface IUIKeyBindingSettingConfig extends IUISettingConfig {
  initialBinding: IKeyBinding;
  onBindingChange?: (binding: IKeyBinding) => void;
}

/**
 * A setting component for configuring key bindings.
 * Displays the current binding and allows the user to press a new key/button to change it.
 */
export class UIKeyBindingSetting extends UISetting {
  readonly type = MenuItemType.KEY_BINDING_SETTING;

  private currentBinding: IKeyBinding;
  private bindingText: Phaser.GameObjects.Text;
  private inputBox: Phaser.GameObjects.Graphics;
  private isListening: boolean = false;
  private onBindingChange?: (binding: IKeyBinding) => void;

  // Input listeners
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private gamepadHandler: ((pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => void) | null = null;

  constructor(scene: Phaser.Scene, config: IUIKeyBindingSettingConfig) {
    super(scene, config);

    this.currentBinding = { ...config.initialBinding };
    this.onBindingChange = config.onBindingChange;

    // Create input box background (in the input area on the right)
    this.inputBox = scene.add.graphics();
    this.drawInputBox(false);

    // Create binding text display
    this.bindingText = scene.add.text(this.inputAreaX, 0, this.getBindingDisplayText(), {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: colorNumberToString(gameConfig.menu.colors.buttonText)
    });
    this.bindingText.setOrigin(0.5);

    this.container.add([this.inputBox, this.bindingText]);
  }

  private drawInputBox(listening: boolean): void {
    this.inputBox.clear();

    const boxWidth = this.inputAreaWidth - 10;
    const boxHeight = this.settingHeight - 20;
    const boxX = this.inputAreaX - boxWidth / 2;
    const boxY = -boxHeight / 2;

    // Different appearance when listening for input
    const fillColor = listening ? 0x004400 : 0x000000;
    const borderColor = listening ? 0x00ff00 : gameConfig.menu.colors.buttonBorder;

    this.inputBox.fillStyle(fillColor, 0.8);
    this.inputBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 5);

    this.inputBox.lineStyle(2, borderColor, 1);
    this.inputBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 5);
  }

  private getBindingDisplayText(): string {
    if (this.isListening) {
      return '...';
    }

    if (this.currentBinding.type === 'keyboard') {
      const key = this.currentBinding.key || '???';
      // Convert code-based key names to display-friendly names
      const displayNames: { [key: string]: string } = {
        'BracketLeft': '[',
        'BracketRight': ']',
        'Comma': ',',
        'Period': '.',
        'Semicolon': ';',
        'Quote': "'",
        'Backquote': '`',
        'Slash': '/',
        'Backslash': '\\',
        'Minus': '-',
        'Equal': '='
      };
      return displayNames[key] || key;
    } else {
      // Gamepad button - show a friendly name
      return this.getGamepadButtonName(this.currentBinding.button ?? 0);
    }
  }

  private getGamepadButtonName(buttonIndex: number): string {
    // Standard gamepad button names
    const buttonNames: { [key: number]: string } = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'SELECT',
      9: 'START',
      10: 'L3',
      11: 'R3',
      12: 'D-UP',
      13: 'D-DOWN',
      14: 'D-LEFT',
      15: 'D-RIGHT'
    };
    return buttonNames[buttonIndex] || `BTN${buttonIndex}`;
  }

  protected onActivate(): void {
    if (this.isListening) {
      // Already listening, cancel
      this.stopListening();
    } else {
      // Start listening for input
      this.startListening();
    }
  }

  private startListening(): void {
    this.isListening = true;
    this.drawInputBox(true);
    this.bindingText.setText('...');

    // Listen for keyboard input via DOM (captures all keys)
    this.keydownHandler = (event: KeyboardEvent) => {
      // Ignore modifier keys by themselves
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Map the key to a standardized name
      const keyName = this.normalizeKeyName(event.key, event.code);

      this.currentBinding = {
        type: 'keyboard',
        key: keyName
      };

      this.stopListening();
      this.notifyChange();
    };
    window.addEventListener('keydown', this.keydownHandler, { capture: true });

    // Listen for gamepad button presses
    if (this.scene.input.gamepad) {
      this.gamepadHandler = (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        this.currentBinding = {
          type: 'gamepad',
          button: button.index
        };

        this.stopListening();
        this.notifyChange();
      };
      this.scene.input.gamepad.on('down', this.gamepadHandler);
    }
  }

  private stopListening(): void {
    this.isListening = false;
    this.drawInputBox(false);
    this.bindingText.setText(this.getBindingDisplayText());

    // Remove keyboard listener
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, { capture: true });
      this.keydownHandler = null;
    }

    // Remove gamepad listener
    if (this.gamepadHandler && this.scene.input.gamepad) {
      this.scene.input.gamepad.off('down', this.gamepadHandler);
      this.gamepadHandler = null;
    }
  }

  private normalizeKeyName(key: string, code: string): string {
    // Handle special keys
    if (key === ' ') return 'SPACE';
    if (key === 'Escape') return 'ESC';
    if (key === 'Enter') return 'ENTER';
    if (key === 'Tab') return 'TAB';
    if (key === 'Backspace') return 'BACKSPACE';
    if (key === 'Delete') return 'DELETE';

    // Arrow keys
    if (key === 'ArrowUp') return 'UP';
    if (key === 'ArrowDown') return 'DOWN';
    if (key === 'ArrowLeft') return 'LEFT';
    if (key === 'ArrowRight') return 'RIGHT';

    // For letter keys, use uppercase
    if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      return key.toUpperCase();
    }

    // For number keys, just use the number
    if (key.length === 1 && key.match(/[0-9]/)) {
      return key;
    }

    // Function keys
    if (key.match(/^F\d+$/)) {
      return key;
    }

    // Handle punctuation/symbol keys - use event.code for consistency
    // These map directly to Phaser KeyCodes in SettingsManager
    const codeBasedKeys: { [key: string]: string } = {
      'BracketLeft': 'BracketLeft',
      'BracketRight': 'BracketRight',
      'Comma': 'Comma',
      'Period': 'Period',
      'Semicolon': 'Semicolon',
      'Quote': 'Quote',
      'Backquote': 'Backquote',
      'Slash': 'Slash',
      'Backslash': 'Backslash',
      'Minus': 'Minus',
      'Equal': 'Equal'
    };

    if (codeBasedKeys[code]) {
      return codeBasedKeys[code];
    }

    // Fallback to code if key isn't helpful
    return code.replace('Key', '').replace('Digit', '');
  }

  private notifyChange(): void {
    if (this.onBindingChange) {
      this.onBindingChange(this.currentBinding);
    }
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (this.isListening) {
      // While listening, Escape/Back cancels
      if (direction === NavigationDirection.BACK) {
        this.stopListening();
        return true;
      }
      // Consume all navigation while listening
      return true;
    }

    // Normal navigation
    if (direction === NavigationDirection.SELECT) {
      this.onActivate();
      return true;
    }

    return false;
  }

  blur(): void {
    // Stop listening when focus is lost
    if (this.isListening) {
      this.stopListening();
    }
    super.blur();
  }

  getBinding(): IKeyBinding {
    return { ...this.currentBinding };
  }

  setBinding(binding: IKeyBinding): void {
    this.currentBinding = { ...binding };
    this.bindingText.setText(this.getBindingDisplayText());
  }

  destroy(): void {
    this.stopListening();
    super.destroy();
  }
}
