import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { UICharacterSelector } from './UICharacterSelector';
import { gameConfig } from '../../config/gameConfig';

export interface IUICharacterSelectorGroupConfig extends IUIElementConfig {
  numSelectors?: number;
  initialName?: string;
  characterSet?: string;
  onNameChange?: (name: string) => void;
  spacing?: number;
  boxSize?: number;
}

export class UICharacterSelectorGroup extends UIElement implements INavigable {
  readonly type = MenuItemType.CHARACTER_SELECTOR_GROUP;
  isFocused: boolean = false;

  private selectors: UICharacterSelector[] = [];
  private focusedSelectorIndex: number = 0;
  private numSelectors: number;
  private spacing: number;
  private onNameChange?: (name: string) => void;
  private onPointerEnterCallback?: () => void;

  constructor(scene: Phaser.Scene, config: IUICharacterSelectorGroupConfig) {
    super(scene, config);

    this.numSelectors = config.numSelectors ?? 3;
    this.spacing = config.spacing ?? 20;
    this.onNameChange = config.onNameChange;

    const boxSize = config.boxSize ?? 50;
    const characterSet = config.characterSet ?? gameConfig.scores.characterSet;
    const initialName = config.initialName ?? gameConfig.scores.defaultName;

    // Calculate total width for centering
    const totalWidth = (boxSize * this.numSelectors) + (this.spacing * (this.numSelectors - 1));
    const startX = -totalWidth / 2 + boxSize / 2;

    // Create selectors
    for (let i = 0; i < this.numSelectors; i++) {
      const initialChar = initialName[i] ?? 'A';
      const selector = new UICharacterSelector(scene, {
        x: startX + i * (boxSize + this.spacing),
        y: 0,
        initialCharacter: initialChar,
        characterSet: characterSet,
        boxSize: boxSize,
        onCharacterChange: () => this.handleCharacterChange()
      });

      // Set up pointer enter callback to focus this selector
      selector.setOnPointerEnter(() => {
        this.focusSelectorAt(i);
        if (this.onPointerEnterCallback) {
          this.onPointerEnterCallback();
        }
      });

      this.selectors.push(selector);
      this.container.add(selector.container);
    }
  }

  private handleCharacterChange(): void {
    if (this.onNameChange) {
      this.onNameChange(this.getName());
    }
  }

  private focusSelectorAt(index: number): void {
    // Blur current selector
    if (this.focusedSelectorIndex >= 0 && this.focusedSelectorIndex < this.selectors.length) {
      this.selectors[this.focusedSelectorIndex].blur();
    }

    // Focus new selector
    this.focusedSelectorIndex = index;
    if (this.focusedSelectorIndex >= 0 && this.focusedSelectorIndex < this.selectors.length) {
      this.selectors[this.focusedSelectorIndex].focus();
    }
  }

  getName(): string {
    return this.selectors.map(s => s.getCurrentCharacter()).join('');
  }

  setName(name: string): void {
    for (let i = 0; i < this.numSelectors && i < name.length; i++) {
      this.selectors[i].setCharacter(name[i]);
    }
  }

  /**
   * Focus a specific selector by index
   */
  focusSelector(index: number): void {
    if (index >= 0 && index < this.selectors.length) {
      this.focusSelectorAt(index);
    }
  }

  focus(): void {
    this.isFocused = true;
    // Focus the first selector
    this.focusedSelectorIndex = 0;
    this.selectors[0].focus();
  }

  blur(): void {
    this.isFocused = false;
    // Blur all selectors
    this.selectors.forEach(s => s.blur());
  }

  handleNavigation(direction: NavigationDirection): boolean {
    const currentSelector = this.selectors[this.focusedSelectorIndex];

    switch (direction) {
      case NavigationDirection.UP:
      case NavigationDirection.DOWN:
        // Delegate to the focused selector for character cycling
        return currentSelector.handleNavigation(direction);

      case NavigationDirection.LEFT:
        if (this.focusedSelectorIndex > 0) {
          this.focusSelectorAt(this.focusedSelectorIndex - 1);
          return true;
        }
        return false; // Let parent handle if at start

      case NavigationDirection.RIGHT:
        if (this.focusedSelectorIndex < this.selectors.length - 1) {
          this.focusSelectorAt(this.focusedSelectorIndex + 1);
          return true;
        }
        return false; // Let parent handle if at end

      case NavigationDirection.SELECT:
        // Move to next selector, or let parent handle if at last
        if (this.focusedSelectorIndex < this.selectors.length - 1) {
          this.focusSelectorAt(this.focusedSelectorIndex + 1);
          return true;
        }
        return false; // Let parent handle (move to SAVE button)

      default:
        return false;
    }
  }

  /**
   * Handle direct keyboard character input
   * @param char The character typed
   * @returns true if the character was valid
   */
  handleKeyInput(char: string): boolean {
    const currentSelector = this.selectors[this.focusedSelectorIndex];
    const result = currentSelector.handleKeyInput(char);

    if (result && this.focusedSelectorIndex < this.selectors.length - 1) {
      // Auto-advance to next selector after typing
      this.focusSelectorAt(this.focusedSelectorIndex + 1);
    }

    return result;
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    if (this.selectors.length === 0) return 0;
    const firstSelector = this.selectors[0];
    return (firstSelector.getWidth() * this.numSelectors) + (this.spacing * (this.numSelectors - 1));
  }

  getHeight(): number {
    if (this.selectors.length === 0) return 0;
    return this.selectors[0].getHeight();
  }

  destroy(): void {
    this.selectors.forEach(s => s.destroy());
    this.selectors = [];
    super.destroy();
  }
}
