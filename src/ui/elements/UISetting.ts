import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUISettingConfig extends IUIElementConfig {
  label: string;
  width?: number;
  height?: number;
  labelWidthRatio?: number; // Ratio of width for label (default 2/3)
}

/**
 * Abstract base class for settings UI elements.
 * Displays a label on the left portion and an input area on the right.
 */
export abstract class UISetting extends UIElement implements INavigable {
  abstract readonly type: MenuItemType;
  isFocused: boolean = false;

  protected background: Phaser.GameObjects.Graphics;
  protected hitArea: Phaser.GameObjects.Rectangle;
  protected labelText: Phaser.GameObjects.Text;
  protected settingWidth: number;
  protected settingHeight: number;
  protected labelWidthRatio: number;
  protected cornerRadius: number = gameConfig.menu.layout.buttonCornerRadius;
  protected onPointerEnterCallback?: () => void;

  // Input area dimensions (calculated from width and labelWidthRatio)
  protected inputAreaX: number;
  protected inputAreaWidth: number;

  constructor(scene: Phaser.Scene, config: IUISettingConfig) {
    super(scene, config);

    this.settingWidth = config.width ?? gameConfig.menu.layout.buttonWidth;
    this.settingHeight = config.height ?? gameConfig.menu.layout.buttonHeight;
    this.labelWidthRatio = config.labelWidthRatio ?? 2 / 3;

    // Calculate input area dimensions
    const labelWidth = this.settingWidth * this.labelWidthRatio;
    this.inputAreaWidth = this.settingWidth * (1 - this.labelWidthRatio);
    this.inputAreaX = -this.settingWidth / 2 + labelWidth + this.inputAreaWidth / 2;

    // Create background with rounded corners
    this.background = scene.add.graphics();
    this.drawBackground(gameConfig.menu.colors.buttonNormal, 3);

    // Create invisible hit area for interaction
    this.hitArea = scene.add.rectangle(0, 0, this.settingWidth, this.settingHeight);
    this.hitArea.setAlpha(0.001);

    // Create label text (left-aligned within the label area)
    const labelX = -this.settingWidth / 2 + 15; // 15px padding from left edge
    this.labelText = scene.add.text(labelX, 0, config.label, {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: colorNumberToString(gameConfig.menu.colors.buttonText)
    });
    this.labelText.setOrigin(0, 0.5);

    this.container.add([this.background, this.hitArea, this.labelText]);

    // Setup base interactivity
    this.setupInteractivity();
  }

  protected drawBackground(fillColor: number, strokeWidth: number): void {
    this.background.clear();

    // Draw filled rounded rectangle
    this.background.fillStyle(fillColor, 1);
    this.background.fillRoundedRect(
      -this.settingWidth / 2,
      -this.settingHeight / 2,
      this.settingWidth,
      this.settingHeight,
      this.cornerRadius
    );

    // Draw stroke
    this.background.lineStyle(strokeWidth, gameConfig.menu.colors.buttonBorder, 1);
    this.background.strokeRoundedRect(
      -this.settingWidth / 2,
      -this.settingHeight / 2,
      this.settingWidth,
      this.settingHeight,
      this.cornerRadius
    );
  }

  protected setupInteractivity(): void {
    this.hitArea.setInteractive({ useHandCursor: true });

    this.hitArea.on('pointerover', () => {
      if (this.onPointerEnterCallback) {
        this.onPointerEnterCallback();
      }
      if (!this.isFocused) {
        this.focus();
      }
    });

    this.hitArea.on('pointerout', () => {
      this.blur();
    });

    this.hitArea.on('pointerdown', () => {
      this.onActivate();
    });
  }

  focus(): void {
    this.isFocused = true;
    this.drawBackground(gameConfig.menu.colors.buttonHighlight, 4);

    // Scale animation
    this.scene.tweens.add({
      targets: this.container,
      scaleX: gameConfig.menu.animation.focusScale,
      scaleY: gameConfig.menu.animation.focusScale,
      duration: 100,
      ease: 'Power2'
    });
  }

  blur(): void {
    this.isFocused = false;
    this.drawBackground(gameConfig.menu.colors.buttonNormal, 3);

    // Scale animation back
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (direction === NavigationDirection.SELECT) {
      this.onActivate();
      return true;
    }
    return false; // Let parent menu handle UP/DOWN
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    return this.settingWidth;
  }

  getHeight(): number {
    return this.settingHeight;
  }

  /**
   * Called when the setting is activated (Enter/A button or click)
   * Subclasses should override this to handle their specific activation behavior
   */
  protected abstract onActivate(): void;
}
