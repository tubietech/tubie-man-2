import Phaser from 'phaser';
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext.js';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUIScrollableTextBlockConfig extends IUIElementConfig {
  text: string;
  width: number;
  height: number;
  fontSize?: string;
  color?: number;
  lineSpacing?: number;
  scrollSpeed?: number;
}

export class UIScrollableTextBlock extends UIElement implements INavigable {
  readonly type = MenuItemType.SCROLLABLE_TEXT;
  isFocused: boolean = false;

  private textObject: BBCodeText;
  private blockWidth: number;
  private blockHeight: number;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private scrollSpeed: number;
  private background: Phaser.GameObjects.Rectangle;
  private onPointerEnterCallback?: () => void;
  private isHovered: boolean = false;
  private padding: number = 10;

  constructor(scene: Phaser.Scene, config: IUIScrollableTextBlockConfig) {
    super(scene, config);

    this.blockWidth = config.width;
    this.blockHeight = config.height;
    this.scrollSpeed = config.scrollSpeed ?? 20;

    const fontSize = config.fontSize ?? '14px';
    const color = config.color ?? gameConfig.menu.colors.bodyText;
    const lineSpacing = config.lineSpacing ?? 4;

    // Create background
    this.background = scene.add.rectangle(0, 0, this.blockWidth, this.blockHeight, 0x111111);
    this.background.setStrokeStyle(2, gameConfig.menu.colors.buttonBorder);
    this.container.add(this.background);

    // Create BBCode text with left alignment for better readability
    // BBCodeText supports tags like [color=red]text[/color], [b]bold[/b], [i]italic[/i]
    this.textObject = new BBCodeText(
      scene,
      -this.blockWidth / 2 + this.padding,
      -this.blockHeight / 2 + this.padding,
      config.text,
      {
        fontFamily: 'PressStart2P',
        fontSize: fontSize,
        color: colorNumberToString(color),
        wrap: { mode: 'word', width: this.blockWidth - this.padding * 2 },
        lineSpacing: lineSpacing
      }
    );
    this.textObject.setOrigin(0, 0);
    scene.add.existing(this.textObject);
    this.container.add(this.textObject);

    // Calculate max scroll
    this.calculateMaxScroll();

    // Apply initial crop to hide text outside visible area
    this.updateTextCrop();

    // Setup scrolling interactivity
    this.setupScrolling();
  }

  private calculateMaxScroll(): void {
    const textHeight = this.textObject.height;
    const visibleHeight = this.blockHeight - this.padding * 2;
    this.maxScrollY = Math.max(0, textHeight - visibleHeight);
  }

  private setupScrolling(): void {
    this.background.setInteractive({ useHandCursor: true });

    // Track hover state for mouse wheel scrolling
    this.background.on('pointerover', () => {
      this.isHovered = true;
      // Notify menu to blur other elements
      if (this.onPointerEnterCallback) {
        this.onPointerEnterCallback();
      }
      if (!this.isFocused) {
        this.focus();
      }
    });

    this.background.on('pointerout', () => {
      this.isHovered = false;
    });

    // Mouse wheel scrolling - works when hovered or focused
    this.scene.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number
    ) => {
      if (this.isFocused || this.isHovered) {
        this.scroll(deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed);
      }
    });
  }

  private scroll(amount: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + amount, 0, this.maxScrollY);
    this.updateTextCrop();
  }

  private updateTextCrop(): void {
    // Crop the text to show only the visible portion
    // The crop rectangle is relative to the text object's origin (top-left)
    const visibleHeight = this.blockHeight - this.padding * 2;
    this.textObject.setCrop(0, this.scrollY, this.blockWidth, visibleHeight);

    // Move the text up by the scroll amount so the cropped portion stays aligned with the box
    this.textObject.setY(-this.blockHeight / 2 + this.padding - this.scrollY);
  }

  setText(text: string): void {
    this.textObject.setText(text);
    this.scrollY = 0;
    this.calculateMaxScroll();
    this.updateTextCrop();
  }

  focus(): void {
    this.isFocused = true;
    this.background.setStrokeStyle(3, gameConfig.menu.colors.buttonSelectedText);
  }

  blur(): void {
    this.isFocused = false;
    this.background.setStrokeStyle(2, gameConfig.menu.colors.buttonBorder);
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (direction === NavigationDirection.UP) {
      if (this.scrollY > 0) {
        this.scroll(-this.scrollSpeed);
        return true;
      }
    }
    if (direction === NavigationDirection.DOWN) {
      if (this.scrollY < this.maxScrollY) {
        this.scroll(this.scrollSpeed);
        return true;
      }
    }
    return false; // Let parent handle if we're at scroll limits
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  isAtScrollEnd(): boolean {
    return this.scrollY >= this.maxScrollY;
  }

  isAtScrollStart(): boolean {
    return this.scrollY <= 0;
  }

  getWidth(): number {
    return this.blockWidth;
  }

  getHeight(): number {
    return this.blockHeight;
  }

  destroy(): void {
    super.destroy();
  }
}
