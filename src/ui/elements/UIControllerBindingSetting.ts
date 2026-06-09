import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { NavigationDirection } from '../../interfaces/INavigable';
import { UISetting, IUISettingConfig } from './UISetting';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';
import { IControllerBinding } from '../../utils/SettingsManager';

export interface IUIControllerBindingSettingConfig extends IUISettingConfig {
  initialBinding: IControllerBinding;
  onBindingChange?: (binding: IControllerBinding) => void;
}

/**
 * A setting component for configuring controller button bindings.
 * Displays the current button and allows the user to press a controller button to change it.
 */
export class UIControllerBindingSetting extends UISetting {
  readonly type = MenuItemType.KEY_BINDING_SETTING; // Reuse existing type

  private currentBinding: IControllerBinding;
  private bindingText: Phaser.GameObjects.Text;
  private inputBox: Phaser.GameObjects.Graphics;
  private isListening: boolean = false;
  private onBindingChange?: (binding: IControllerBinding) => void;

  // Input listeners
  private gamepadHandler: ((pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => void) | null = null;

  constructor(scene: Phaser.Scene, config: IUIControllerBindingSettingConfig) {
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

    return this.getGamepadButtonName(this.currentBinding.button);
  }

  private getGamepadButtonName(buttonIndex: number): string {
    const buttonNames = gameConfig.controls.gamepadButtonNames as { [key: number]: string };
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

    // Listen for gamepad button presses
    if (this.scene.input.gamepad) {
      this.gamepadHandler = (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        this.currentBinding = {
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

    // Remove gamepad listener
    if (this.gamepadHandler && this.scene.input.gamepad) {
      this.scene.input.gamepad.off('down', this.gamepadHandler);
      this.gamepadHandler = null;
    }
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

  getBinding(): IControllerBinding {
    return { ...this.currentBinding };
  }

  setBinding(binding: IControllerBinding): void {
    this.currentBinding = { ...binding };
    this.bindingText.setText(this.getBindingDisplayText());
  }

  destroy(): void {
    this.stopListening();
    super.destroy();
  }
}
