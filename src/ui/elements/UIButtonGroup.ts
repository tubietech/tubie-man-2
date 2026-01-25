import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { ISelectable, ISelectableOption } from '../../interfaces/ISelectable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUIButtonGroupConfig<T> extends IUIElementConfig {
  options: ISelectableOption<T>[];
  selectedIndex?: number;
  onSelectionChange?: (value: T, index: number) => void;
  buttonWidth?: number;
  buttonHeight?: number;
  fontSize?: string;
}

interface ButtonData {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  hitArea: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

export class UIButtonGroup<T> extends UIElement implements INavigable, ISelectable<T> {
  readonly type = MenuItemType.BUTTON_GROUP;
  isFocused: boolean = false;
  selectedIndex: number;
  options: ISelectableOption<T>[];
  onSelectionChange?: (value: T, index: number) => void;

  private buttons: ButtonData[] = [];
  private buttonWidth: number;
  private buttonHeight: number;
  private totalWidth: number = 0;
  private cornerRadius: number = 8;
  private fontSize: string;
  private onPointerEnterCallback?: () => void;

  constructor(scene: Phaser.Scene, config: IUIButtonGroupConfig<T>) {
    super(scene, config);

    this.options = config.options;
    this.selectedIndex = config.selectedIndex ?? 0;
    this.onSelectionChange = config.onSelectionChange;
    this.buttonWidth = config.buttonWidth ?? 80;
    this.buttonHeight = config.buttonHeight ?? 40;
    this.fontSize = config.fontSize ?? '14px';

    this.createButtons();
    this.updateVisualSelection();
  }

  private createButtons(): void {
    const spacing = gameConfig.menu.layout.buttonGroupSpacing;
    const totalButtonsWidth = this.options.length * this.buttonWidth + (this.options.length - 1) * spacing;
    this.totalWidth = totalButtonsWidth;

    // Calculate starting X to center the button group
    const startX = -totalButtonsWidth / 2 + this.buttonWidth / 2;

    this.options.forEach((option, index) => {
      const x = startX + index * (this.buttonWidth + spacing);

      // Create background with rounded corners
      const background = this.scene.add.graphics();
      background.setPosition(x, 0);

      // Create invisible hit area for interaction
      const hitArea = this.scene.add.rectangle(x, 0, this.buttonWidth, this.buttonHeight);
      hitArea.setAlpha(0.001);

      const text = this.scene.add.text(x, 0, option.label, {
        fontFamily: 'PressStart2P',
        fontSize: this.fontSize,
        color: '#ffffff'
      }).setOrigin(0.5);

      const buttonContainer = this.scene.add.container(0, 0, [background, hitArea, text]);
      this.container.add(buttonContainer);

      this.buttons.push({ container: buttonContainer, background, hitArea, text });

      // Click handler
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.select(index);
      });
      hitArea.on('pointerover', () => {
        // Notify menu to blur other elements
        if (this.onPointerEnterCallback) {
          this.onPointerEnterCallback();
        }
        if (index !== this.selectedIndex) {
          this.drawButtonBackground(index, 0x444444, 2);
        }
      });
      hitArea.on('pointerout', () => {
        this.updateButtonVisual(index);
      });
    });
  }

  private drawButtonBackground(index: number, fillColor: number, strokeWidth: number): void {
    const button = this.buttons[index];
    button.background.clear();

    // Draw filled rounded rectangle
    button.background.fillStyle(fillColor, 1);
    button.background.fillRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      this.cornerRadius
    );

    // Draw stroke
    button.background.lineStyle(strokeWidth, gameConfig.menu.colors.buttonBorder, 1);
    button.background.strokeRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      this.cornerRadius
    );
  }

  select(index: number): void {
    if (index < 0 || index >= this.options.length) return;

    this.selectedIndex = index;
    this.updateVisualSelection();

    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedValue(), index);
    }
  }

  getSelectedValue(): T {
    return this.options[this.selectedIndex].value;
  }

  private updateVisualSelection(): void {
    this.buttons.forEach((_, index) => {
      this.updateButtonVisual(index);
    });
  }

  private updateButtonVisual(index: number): void {
    const button = this.buttons[index];
    const isSelected = index === this.selectedIndex;

    if (isSelected) {
      button.text.setColor(colorNumberToString(gameConfig.menu.colors.buttonSelectedText));
      this.drawButtonBackground(index, gameConfig.menu.colors.buttonHighlight, 3);
    } else {
      button.text.setColor('#ffffff');
      this.drawButtonBackground(index, 0x222222, 2);
    }
  }

  focus(): void {
    this.isFocused = true;
    // Add visual indicator that the group is focused
    this.container.setAlpha(1);

    // Scale up slightly
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Power2'
    });
  }

  blur(): void {
    this.isFocused = false;
    // Dim slightly when not focused
    this.container.setAlpha(0.8);

    // Scale back
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (direction === NavigationDirection.LEFT) {
      const newIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      this.select(newIndex);
      return true;
    }
    if (direction === NavigationDirection.RIGHT) {
      const newIndex = (this.selectedIndex + 1) % this.options.length;
      this.select(newIndex);
      return true;
    }
    if (direction === NavigationDirection.SELECT) {
      // Already selected, just confirm
      if (this.onSelectionChange) {
        this.onSelectionChange(this.getSelectedValue(), this.selectedIndex);
      }
      return true;
    }
    return false; // Let parent handle UP/DOWN
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    return this.totalWidth;
  }

  getHeight(): number {
    return this.buttonHeight;
  }
}
