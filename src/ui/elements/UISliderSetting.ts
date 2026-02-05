import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { UISetting, IUISettingConfig } from './UISetting';
import { NavigationDirection } from '../../interfaces/INavigable';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUISliderSettingConfig extends IUISettingConfig {
  initialValue: number;  // 0-1 range
  minValue?: number;
  maxValue?: number;
  step?: number;
  onValueChange?: (value: number) => void;
}

/**
 * A slider setting component for adjusting values between min and max.
 * Supports keyboard left/right and click-to-set interactions.
 */
export class UISliderSetting extends UISetting {
  readonly type = MenuItemType.SLIDER_SETTING;

  private currentValue: number;
  private minValue: number;
  private maxValue: number;
  private step: number;
  private onValueChange?: (value: number) => void;

  private sliderTrack: Phaser.GameObjects.Graphics;
  private sliderFill: Phaser.GameObjects.Graphics;
  private sliderHandle: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;

  // Slider dimensions
  private sliderWidth: number;
  private sliderHeight: number = 12;
  private handleRadius: number = 10;
  private sliderX: number;

  constructor(scene: Phaser.Scene, config: IUISliderSettingConfig) {
    super(scene, config);

    this.currentValue = config.initialValue;
    this.minValue = config.minValue ?? 0;
    this.maxValue = config.maxValue ?? 1;
    this.step = config.step ?? 0.1;
    this.onValueChange = config.onValueChange;

    // Calculate slider dimensions based on input area
    this.sliderWidth = this.inputAreaWidth - 30;
    this.sliderX = this.inputAreaX;

    // Create slider track (background)
    this.sliderTrack = scene.add.graphics();
    this.drawSliderTrack();

    // Create slider fill (filled portion)
    this.sliderFill = scene.add.graphics();
    this.drawSliderFill();

    // Create slider handle
    this.sliderHandle = scene.add.graphics();
    this.drawSliderHandle();

    // Create value text display (percentage)
    this.valueText = scene.add.text(
      this.inputAreaX + this.sliderWidth / 2 + 20,
      0,
      this.getDisplayText(),
      {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: colorNumberToString(gameConfig.menu.colors.buttonText)
      }
    );
    this.valueText.setOrigin(0, 0.5);

    this.container.add([this.sliderTrack, this.sliderFill, this.sliderHandle, this.valueText]);

    // Setup additional interactivity for clicking on the slider
    this.setupSliderInteractivity();
  }

  private drawSliderTrack(): void {
    this.sliderTrack.clear();

    const trackX = this.sliderX - this.sliderWidth / 2;
    const trackY = -this.sliderHeight / 2;

    // Draw track background
    this.sliderTrack.fillStyle(0x333333, 1);
    this.sliderTrack.fillRoundedRect(trackX, trackY, this.sliderWidth, this.sliderHeight, 6);

    // Draw track border
    this.sliderTrack.lineStyle(2, 0x666666, 1);
    this.sliderTrack.strokeRoundedRect(trackX, trackY, this.sliderWidth, this.sliderHeight, 6);
  }

  private drawSliderFill(): void {
    this.sliderFill.clear();

    const normalizedValue = (this.currentValue - this.minValue) / (this.maxValue - this.minValue);
    const fillWidth = this.sliderWidth * normalizedValue;

    if (fillWidth > 0) {
      const trackX = this.sliderX - this.sliderWidth / 2;
      const trackY = -this.sliderHeight / 2;

      // Gradient-like fill (green to yellow based on value)
      const fillColor = this.getFillColor();
      this.sliderFill.fillStyle(fillColor, 1);
      this.sliderFill.fillRoundedRect(trackX, trackY, fillWidth, this.sliderHeight, 6);
    }
  }

  private getFillColor(): number {
    // Color gradient from red (0%) to yellow (50%) to green (100%)
    const normalizedValue = (this.currentValue - this.minValue) / (this.maxValue - this.minValue);

    if (normalizedValue < 0.5) {
      // Red to yellow
      const r = 255;
      const g = Math.floor(255 * (normalizedValue * 2));
      return (r << 16) | (g << 8);
    } else {
      // Yellow to green
      const r = Math.floor(255 * (1 - (normalizedValue - 0.5) * 2));
      const g = 255;
      return (r << 16) | (g << 8);
    }
  }

  private drawSliderHandle(): void {
    this.sliderHandle.clear();

    const normalizedValue = (this.currentValue - this.minValue) / (this.maxValue - this.minValue);
    const handleX = this.sliderX - this.sliderWidth / 2 + this.sliderWidth * normalizedValue;

    // Draw handle circle
    this.sliderHandle.fillStyle(0xffffff, 1);
    this.sliderHandle.fillCircle(handleX, 0, this.handleRadius);

    // Draw handle border
    this.sliderHandle.lineStyle(2, gameConfig.menu.colors.buttonBorder, 1);
    this.sliderHandle.strokeCircle(handleX, 0, this.handleRadius);
  }

  private getDisplayText(): string {
    const percentage = Math.round((this.currentValue - this.minValue) / (this.maxValue - this.minValue) * 100);
    return `${percentage}%`;
  }

  private setupSliderInteractivity(): void {
    // Make the slider track clickable
    const trackWidth = this.sliderWidth;
    const clickArea = this.scene.add.rectangle(
      this.sliderX,
      0,
      trackWidth + this.handleRadius * 2,
      this.settingHeight - 10
    );
    clickArea.setAlpha(0.001);
    clickArea.setInteractive({ useHandCursor: true, draggable: true });

    // Track if we're currently dragging
    let isDragging = false;

    clickArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      this.handleSliderClick(pointer);
    });

    clickArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging && pointer.isDown) {
        this.handleSliderClick(pointer);
      }
    });

    clickArea.on('pointerup', () => {
      isDragging = false;
    });

    clickArea.on('pointerout', () => {
      isDragging = false;
    });

    // Also listen for global pointer events for smoother dragging
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging && pointer.isDown) {
        this.handleSliderClick(pointer);
      }
    });

    this.scene.input.on('pointerup', () => {
      isDragging = false;
    });

    this.container.add(clickArea);
  }

  private handleSliderClick(pointer: Phaser.Input.Pointer): void {
    // Get the world position of the container by traversing the parent hierarchy
    const worldMatrix = this.container.getWorldTransformMatrix();
    const containerWorldX = worldMatrix.tx;
    const containerScale = worldMatrix.scaleX; // Assuming uniform scaling

    // Convert pointer world position to local container coordinates
    // Account for container position and scale
    const localX = (pointer.x - containerWorldX) / containerScale;

    const trackLeft = this.sliderX - this.sliderWidth / 2;
    const trackRight = this.sliderX + this.sliderWidth / 2;

    // Clamp to track bounds
    const clampedX = Phaser.Math.Clamp(localX, trackLeft, trackRight);

    // Calculate new value
    const normalizedValue = (clampedX - trackLeft) / this.sliderWidth;
    const newValue = this.minValue + normalizedValue * (this.maxValue - this.minValue);

    // Round to step
    const steppedValue = Math.round(newValue / this.step) * this.step;
    this.setValue(Phaser.Math.Clamp(steppedValue, this.minValue, this.maxValue));
  }

  protected onActivate(): void {
    // Toggle behavior on Enter/click - no specific action needed for slider
    // The slider primarily responds to left/right navigation
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (direction === NavigationDirection.LEFT) {
      this.decrementValue();
      return true;
    }
    if (direction === NavigationDirection.RIGHT) {
      this.incrementValue();
      return true;
    }
    return super.handleNavigation(direction);
  }

  private incrementValue(): void {
    const newValue = Math.min(this.currentValue + this.step, this.maxValue);
    this.setValue(newValue);
  }

  private decrementValue(): void {
    const newValue = Math.max(this.currentValue - this.step, this.minValue);
    this.setValue(newValue);
  }

  private updateDisplay(): void {
    this.drawSliderFill();
    this.drawSliderHandle();
    this.valueText.setText(this.getDisplayText());
  }

  private notifyChange(): void {
    if (this.onValueChange) {
      this.onValueChange(this.currentValue);
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(value: number): void {
    const clampedValue = Phaser.Math.Clamp(value, this.minValue, this.maxValue);
    // Round to step precision
    const steppedValue = Math.round(clampedValue / this.step) * this.step;

    if (Math.abs(this.currentValue - steppedValue) > 0.001) {
      this.currentValue = steppedValue;
      this.updateDisplay();
      this.notifyChange();
    }
  }
}
