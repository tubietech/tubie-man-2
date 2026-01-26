import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUICharacterSelectorConfig extends IUIElementConfig {
  initialCharacter?: string;
  characterSet?: string;
  onCharacterChange?: (character: string) => void;
  boxSize?: number;
}

export class UICharacterSelector extends UIElement implements INavigable {
  readonly type = MenuItemType.CHARACTER_SELECTOR;
  isFocused: boolean = false;

  private characterSet: string;
  private characterIndex: number;
  private boxSize: number;

  private background: Phaser.GameObjects.Graphics;
  private characterText: Phaser.GameObjects.Text;
  private upTriangle: Phaser.GameObjects.Triangle;
  private downTriangle: Phaser.GameObjects.Triangle;

  private onCharacterChange?: (character: string) => void;
  private onPointerEnterCallback?: () => void;

  constructor(scene: Phaser.Scene, config: IUICharacterSelectorConfig) {
    super(scene, config);

    this.characterSet = config.characterSet ?? gameConfig.scores.characterSet;
    this.boxSize = config.boxSize ?? 50;
    this.onCharacterChange = config.onCharacterChange;

    // Find initial character index
    const initialChar = config.initialCharacter ?? 'A';
    this.characterIndex = this.characterSet.indexOf(initialChar);
    if (this.characterIndex === -1) this.characterIndex = 0;

    // Create components
    this.background = this.createBackground();
    this.characterText = this.createCharacterText();
    this.upTriangle = this.createTriangle(true);
    this.downTriangle = this.createTriangle(false);

    // Add to container
    this.container.add([this.background, this.characterText, this.upTriangle, this.downTriangle]);

    // Hide triangles initially (only show when focused)
    this.upTriangle.setVisible(false);
    this.downTriangle.setVisible(false);

    // Setup interactivity
    this.setupInteractivity();
  }

  private createBackground(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // Draw box
    graphics.fillStyle(0x111111, 1);
    graphics.fillRoundedRect(
      -this.boxSize / 2,
      -this.boxSize / 2,
      this.boxSize,
      this.boxSize,
      8
    );
    graphics.lineStyle(2, gameConfig.menu.colors.buttonBorder, 1);
    graphics.strokeRoundedRect(
      -this.boxSize / 2,
      -this.boxSize / 2,
      this.boxSize,
      this.boxSize,
      8
    );

    return graphics;
  }

  private createCharacterText(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(0, 0, this.getCurrentCharacter(), {
      fontFamily: 'PressStart2P',
      fontSize: '24px',
      color: colorNumberToString(gameConfig.menu.colors.buttonText)
    });
    text.setOrigin(0.5);
    return text;
  }

  private createTriangle(isUp: boolean): Phaser.GameObjects.Triangle {
    const triangleSize = 15;
    const yOffset = this.boxSize / 2 + 15;

    // Create triangle pointing up or down
    const triangle = this.scene.add.triangle(
      0,
      isUp ? -yOffset : yOffset,
      0, isUp ? triangleSize : 0,                    // top/bottom point
      -triangleSize / 2, isUp ? 0 : triangleSize,   // bottom-left/top-left
      triangleSize / 2, isUp ? 0 : triangleSize,    // bottom-right/top-right
      gameConfig.menu.colors.buttonSelectedText
    );

    return triangle;
  }

  private setupInteractivity(): void {
    // Make background interactive for click detection
    const hitArea = this.scene.add.rectangle(0, 0, this.boxSize, this.boxSize + 50);
    hitArea.setAlpha(0.001);
    this.container.add(hitArea);

    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      if (this.onPointerEnterCallback) {
        this.onPointerEnterCallback();
      }
      if (!this.isFocused) {
        this.focus();
      }
    });

    hitArea.on('pointerout', () => {
      // Don't blur on pointer out - let the group manage focus
    });

    // Click on upper half = previous, lower half = next
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localY = pointer.y - this.container.y;
      if (localY < 0) {
        this.previousCharacter();
      } else {
        this.nextCharacter();
      }
    });
  }

  private redrawBackground(highlighted: boolean): void {
    this.background.clear();

    const fillColor = highlighted ? gameConfig.menu.colors.buttonHighlight : 0x111111;
    const strokeColor = highlighted ? gameConfig.menu.colors.buttonSelectedText : gameConfig.menu.colors.buttonBorder;
    const strokeWidth = highlighted ? 3 : 2;

    this.background.fillStyle(fillColor, 1);
    this.background.fillRoundedRect(
      -this.boxSize / 2,
      -this.boxSize / 2,
      this.boxSize,
      this.boxSize,
      8
    );
    this.background.lineStyle(strokeWidth, strokeColor, 1);
    this.background.strokeRoundedRect(
      -this.boxSize / 2,
      -this.boxSize / 2,
      this.boxSize,
      this.boxSize,
      8
    );
  }

  getCurrentCharacter(): string {
    return this.characterSet[this.characterIndex];
  }

  setCharacter(char: string): void {
    const index = this.characterSet.indexOf(char.toUpperCase());
    if (index !== -1) {
      this.characterIndex = index;
      this.characterText.setText(this.getCurrentCharacter());
      if (this.onCharacterChange) {
        this.onCharacterChange(this.getCurrentCharacter());
      }
    }
  }

  nextCharacter(): void {
    this.characterIndex = (this.characterIndex + 1) % this.characterSet.length;
    this.characterText.setText(this.getCurrentCharacter());
    if (this.onCharacterChange) {
      this.onCharacterChange(this.getCurrentCharacter());
    }
  }

  previousCharacter(): void {
    this.characterIndex = (this.characterIndex - 1 + this.characterSet.length) % this.characterSet.length;
    this.characterText.setText(this.getCurrentCharacter());
    if (this.onCharacterChange) {
      this.onCharacterChange(this.getCurrentCharacter());
    }
  }

  focus(): void {
    this.isFocused = true;
    this.upTriangle.setVisible(true);
    this.downTriangle.setVisible(true);
    this.redrawBackground(true);
  }

  blur(): void {
    this.isFocused = false;
    this.upTriangle.setVisible(false);
    this.downTriangle.setVisible(false);
    this.redrawBackground(false);
  }

  handleNavigation(direction: NavigationDirection): boolean {
    switch (direction) {
      case NavigationDirection.UP:
        this.previousCharacter();
        return true;
      case NavigationDirection.DOWN:
        this.nextCharacter();
        return true;
      case NavigationDirection.LEFT:
      case NavigationDirection.RIGHT:
      case NavigationDirection.SELECT:
        // Let parent (group) handle these
        return false;
      default:
        return false;
    }
  }

  /**
   * Handle direct keyboard character input
   * @param char The character typed
   * @returns true if the character was valid and set
   */
  handleKeyInput(char: string): boolean {
    const upperChar = char.toUpperCase();
    const index = this.characterSet.indexOf(upperChar);
    if (index !== -1) {
      this.characterIndex = index;
      this.characterText.setText(this.getCurrentCharacter());
      if (this.onCharacterChange) {
        this.onCharacterChange(this.getCurrentCharacter());
      }
      return true;
    }
    return false;
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    return this.boxSize;
  }

  getHeight(): number {
    return this.boxSize + 40; // Include triangle space
  }
}
