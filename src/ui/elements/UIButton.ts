import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUIButtonConfig extends IUIElementConfig {
  text: string;
  onClick: () => void;
  width?: number;
  height?: number;
}

export class UIButton extends UIElement implements INavigable {
  readonly type = MenuItemType.BUTTON;
  isFocused: boolean = false;
  onClick: () => void;

  private background: Phaser.GameObjects.Graphics;
  private hitArea: Phaser.GameObjects.Rectangle;
  private textObject: Phaser.GameObjects.Text;
  private buttonWidth: number;
  private buttonHeight: number;
  private cornerRadius: number = gameConfig.menu.layout.buttonCornerRadius;
  private onPointerEnterCallback?: () => void;

  constructor(scene: Phaser.Scene, config: IUIButtonConfig) {
    super(scene, config);

    this.buttonWidth = config.width ?? gameConfig.menu.layout.buttonWidth;
    this.buttonHeight = config.height ?? gameConfig.menu.layout.buttonHeight;
    this.onClick = config.onClick;

    // Create background with rounded corners
    this.background = scene.add.graphics();
    this.drawBackground(gameConfig.menu.colors.buttonNormal, 3);

    // Create invisible hit area for interaction
    this.hitArea = scene.add.rectangle(0, 0, this.buttonWidth, this.buttonHeight);
    this.hitArea.setAlpha(0.001); // Nearly invisible but still interactive

    // Create text
    this.textObject = scene.add.text(0, 0, config.text, {
      fontFamily: gameConfig.menu.font.button,
      fontSize: gameConfig.menu.fontSize.button,
      color: colorNumberToString(gameConfig.menu.colors.buttonText)
    });
    this.textObject.setOrigin(0.5);

    this.container.add([this.background, this.hitArea, this.textObject]);

    // Setup interactivity
    this.setupInteractivity();
  }

  private drawBackground(fillColor: number, strokeWidth: number): void {
    this.background.clear();

    // Draw filled rounded rectangle
    this.background.fillStyle(fillColor, 1);
    this.background.fillRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      this.cornerRadius
    );

    // Draw stroke
    this.background.lineStyle(strokeWidth, gameConfig.menu.colors.buttonBorder, 1);
    this.background.strokeRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      this.cornerRadius
    );
  }

  private setupInteractivity(): void {
    this.hitArea.setInteractive({ useHandCursor: true });

    this.hitArea.on('pointerover', () => {
      // Notify menu to blur other elements
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
      this.onClick();
    });
  }

  focus(): void {
    this.isFocused = true;
    this.drawBackground(gameConfig.menu.colors.buttonHighlight, gameConfig.menu.layout.selectedBorderThickness);

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
    this.drawBackground(gameConfig.menu.colors.buttonNormal, gameConfig.menu.layout.borderThickness);

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
      this.onClick();
      return true;
    }
    return false; // Let parent menu handle UP/DOWN
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    return this.buttonWidth;
  }

  getHeight(): number {
    return this.buttonHeight;
  }
}
