import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { UISetting, IUISettingConfig } from './UISetting';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUIToggleSettingConfig extends IUISettingConfig {
  initialValue: boolean;
  onLabel?: string;
  offLabel?: string;
  onValueChange?: (value: boolean) => void;
  /** Optional getter to poll for external value changes */
  valueGetter?: () => boolean;
  toggleBackground1?: number; // Optional custom background color for ON state
  toggleBackground2?: number; // Optional custom background color for OFF state
  toggleBorder1?: number; // Optional custom border color for ON state
  toggleBorder2?: number; // Optional custom border color for OFF state
}

/**
 * A toggle setting component that displays ON/OFF state.
 * Clicking or pressing Enter toggles the value.
 */
export class UIToggleSetting extends UISetting {
  readonly type = MenuItemType.TOGGLE_SETTING;

  private currentValue: boolean;
  private valueText: Phaser.GameObjects.Text;
  private toggleBox: Phaser.GameObjects.Graphics;
  private onLabel: string;
  private offLabel: string;
  private onValueChange?: (value: boolean) => void;
  private valueGetter?: () => boolean;

  constructor(scene: Phaser.Scene, config: IUIToggleSettingConfig) {
    super(scene, config);

    this.currentValue = config.initialValue;
    this.onLabel = config.onLabel ?? 'ON';
    this.offLabel = config.offLabel ?? 'OFF';
    this.onValueChange = config.onValueChange;
    this.valueGetter = config.valueGetter;

    // Create toggle box background (in the input area on the right)
    this.toggleBox = scene.add.graphics();
    this.drawToggleBox();

    // Create value text display
    this.valueText = scene.add.text(this.inputAreaX, 0, this.getDisplayText(), {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: colorNumberToString(gameConfig.menu.colors.buttonText)
    });
    this.valueText.setOrigin(0.5);

    this.container.add([this.toggleBox, this.valueText]);
  }

  private drawToggleBox(): void {
    this.toggleBox.clear();

    const boxWidth = this.inputAreaWidth - 10;
    const boxHeight = this.settingHeight - 20;
    const boxX = this.inputAreaX - boxWidth / 2;
    const boxY = -boxHeight / 2;


    const menuColors = gameConfig.menu.colors;
    // Different colors for ON vs OFF state
    const cfg = this.config as IUIToggleSettingConfig;
    const fillColor = this.currentValue ? (cfg?.toggleBackground1 ?? menuColors.toggleValueBackground1) : (cfg?.toggleBackground2 ?? menuColors.toggleValueBackground2);
    const borderColor = this.currentValue ? (cfg?.toggleBorder1 ?? menuColors.toggleBorder1) : (cfg?.toggleBorder2 ?? menuColors.toggleBorder2);

    // const fillColor = this.currentValue ? menuColors.toggleValueBackground1 : menuColors.toggleValueBackground2;
    // const borderColor = this.currentValue ? menuColors.toggleBorder1 : menuColors.toggleBorder2;

    this.toggleBox.fillStyle(fillColor, 0.8);
    this.toggleBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 5);

    this.toggleBox.lineStyle(2, borderColor, 1);
    this.toggleBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 5);
  }

  private getDisplayText(): string {
    return this.currentValue ? this.onLabel : this.offLabel;
  }

  protected onActivate(): void {
    this.toggle();
  }

  toggle(): void {
    this.currentValue = !this.currentValue;
    this.drawToggleBox();
    this.valueText.setText(this.getDisplayText());
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onValueChange) {
      this.onValueChange(this.currentValue);
    }
  }

  getValue(): boolean {
    return this.currentValue;
  }

  setValue(value: boolean): void {
    if (this.currentValue !== value) {
      this.currentValue = value;
      this.drawToggleBox();
      this.valueText.setText(this.getDisplayText());
    }
  }

  /**
   * Sync the display with the external value if a valueGetter is configured.
   * Call this periodically to detect external changes.
   */
  syncFromGetter(): void {
    if (this.valueGetter) {
      const externalValue = this.valueGetter();
      this.setValue(externalValue);
    }
  }
}
