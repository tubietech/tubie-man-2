import Phaser from 'phaser';
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

  private textObject: Phaser.GameObjects.Text;
  private maskGraphics: Phaser.GameObjects.Graphics;
  private mask: Phaser.Display.Masks.GeometryMask;
  private blockWidth: number;
  private blockHeight: number;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private scrollSpeed: number;
  private background: Phaser.GameObjects.Rectangle;
  private onPointerEnterCallback?: () => void;
  private isHovered: boolean = false;

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

    // Create mask for scrolling
    this.maskGraphics = scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      config.x - this.blockWidth / 2,
      config.y - this.blockHeight / 2,
      this.blockWidth,
      this.blockHeight
    );
    this.mask = this.maskGraphics.createGeometryMask();

    // Create text
    this.textObject = scene.add.text(0, 0, config.text, {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: colorNumberToString(color),
      wordWrap: { width: this.blockWidth - 20 },
      lineSpacing: lineSpacing
    });
    this.textObject.setOrigin(0.5, 0);
    this.textObject.setY(-this.blockHeight / 2 + 10);
    this.textObject.setMask(this.mask);
    this.container.add(this.textObject);

    // Calculate max scroll
    this.calculateMaxScroll();

    // Setup scrolling interactivity
    this.setupScrolling();
  }

  private calculateMaxScroll(): void {
    const textHeight = this.textObject.height;
    const visibleHeight = this.blockHeight - 20;
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
    this.textObject.setY(-this.blockHeight / 2 + 10 - this.scrollY);
  }

  setText(text: string): void {
    this.textObject.setText(text);
    this.scrollY = 0;
    this.calculateMaxScroll();
    this.textObject.setY(-this.blockHeight / 2 + 10);
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
    this.maskGraphics.destroy();
    super.destroy();
  }
}
