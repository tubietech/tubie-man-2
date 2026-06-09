import Phaser from 'phaser';
import { MenuType } from '../../enums/MenuType';
import { IMenu, IMenuConfig } from '../../interfaces/IMenu';
import { IUIElement } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { gameConfig } from '../../config/gameConfig';
import { Orientation } from '../../enums/Orientation';
import { AudioManager } from '../../utils/AudioManager';
import { MenuInputManager, MenuNavigationDirection } from '../../managers/MenuInputManager';

export abstract class Menu implements IMenu {
  abstract readonly menuType: MenuType;
  protected scene: Phaser.Scene;
  protected config: IMenuConfig;
  container: Phaser.GameObjects.Container;
  elements: IUIElement[] = [];
  navigableElements: INavigable[] = [];
  focusedIndex: number = 0;
  orientation: Orientation = Orientation.HORIZONTAL;
  protected isVisible: boolean = false;
  protected initialFocusIndex: number = 0;

  // Input manager for keyboard navigation
  protected menuInputManager: MenuInputManager | null = null;

  // Callback for back navigation
  protected onBack?: () => void;

  constructor(scene: Phaser.Scene, config: IMenuConfig) {
    this.scene = scene;
    this.orientation = config.orientation;
    this.config = {
      spacing: gameConfig.menu.layout.spacing,
      padding: gameConfig.menu.layout.padding,
      centerX: true,
      ...config
    };
    this.container = scene.add.container(0, 0);
    this.container.setVisible(false);
    this.container.setDepth(1000);
  }

  setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  setInitialFocusIndex(index: number): void {
    this.initialFocusIndex = index;
  }

  /**
   * Calculate and apply scaling to fit menu within screen bounds.
   * @param baseWidth The designed width of the menu content
   * @param baseHeight The designed height of the menu content
   * @param padding Screen edge padding (default 40)
   * @returns The calculated scale factor
   */
  protected applyResponsiveScale(baseWidth: number, baseHeight: number, padding: number = 40): number {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // Calculate scale to fit within screen bounds
    const scaleX = (screenWidth - padding * 2) / baseWidth;
    const scaleY = (screenHeight - padding * 2) / baseHeight;
    const scale = Math.min(1, scaleX, scaleY); // Never scale up, only down

    // Apply scale and center the container
    this.container.setScale(scale);
    this.container.setPosition(centerX, centerY);

    return scale;
  }

  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.container.setVisible(true);
    this.container.setAlpha(0);

    // Fade in animation
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: gameConfig.menu.animation.transitionDuration,
      ease: 'Power2'
    });

    // Focus initial navigable element
    if (this.navigableElements.length > 0) {
      this.focusedIndex = Math.min(this.initialFocusIndex, this.navigableElements.length - 1);
      this.navigableElements[this.focusedIndex].focus();
    }

    // Setup input
    this.setupKeyboardInput();
  }

  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    // Blur current focused element
    if (this.navigableElements.length > 0 && this.focusedIndex < this.navigableElements.length) {
      this.navigableElements[this.focusedIndex].blur();
    }

    // Cleanup input
    this.cleanupKeyboardInput();

    // Fade out animation
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: gameConfig.menu.animation.transitionDuration,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
      }
    });
  }

  addElement(element: IUIElement): void {
    this.elements.push(element);
    this.container.add(element.container);
  }

  addNavigable(navigable: INavigable): void {
    this.navigableElements.push(navigable);

    // Register pointer enter callback to blur other elements
    if (navigable.setOnPointerEnter) {
      navigable.setOnPointerEnter(() => {
        this.blurAllExcept(navigable);
      });
    }
  }

  /**
   * Clear all navigable elements (used when switching tabs)
   */
  clearNavigables(): void {
    // Blur current focused element before clearing
    if (this.navigableElements.length > 0 && this.focusedIndex < this.navigableElements.length) {
      this.navigableElements[this.focusedIndex].blur();
    }
    this.navigableElements = [];
    this.focusedIndex = 0;
  }

  protected blurAllExcept(exceptElement: INavigable): void {
    this.navigableElements.forEach((element, index) => {
      if (element !== exceptElement) {
        element.blur();
      } else {
        this.focusedIndex = index;
      }
    });
  }

  focusNext(): void {
    if (this.navigableElements.length === 0) return;

    this.navigableElements[this.focusedIndex].blur();
    this.focusedIndex = (this.focusedIndex + 1) % this.navigableElements.length;
    this.navigableElements[this.focusedIndex].focus();
  }

  focusPrevious(): void {
    if (this.navigableElements.length === 0) return;

    this.navigableElements[this.focusedIndex].blur();
    this.focusedIndex = (this.focusedIndex - 1 + this.navigableElements.length) % this.navigableElements.length;
    this.navigableElements[this.focusedIndex].focus();
  }

  activateFocused(): void {
    if (this.navigableElements.length === 0) return;

    const focused = this.navigableElements[this.focusedIndex];
    focused.handleNavigation(NavigationDirection.SELECT);
  }

  protected setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    this.menuInputManager = new MenuInputManager(this.scene, {
      onNavigate: (direction) => this.handleMenuNavigation(direction),
      onTab: (shiftHeld) => {
        if (shiftHeld)
          this.focusPrevious();
        else
          this.focusNext();
      }
    });
    this.menuInputManager.setup();
  }

  /**
   * Convert MenuNavigationDirection to NavigationDirection and handle input
   */
  private handleMenuNavigation(direction: MenuNavigationDirection): void {
    const directionMap: Record<MenuNavigationDirection, NavigationDirection> = {
      [MenuNavigationDirection.UP]: NavigationDirection.UP,
      [MenuNavigationDirection.DOWN]: NavigationDirection.DOWN,
      [MenuNavigationDirection.LEFT]: NavigationDirection.LEFT,
      [MenuNavigationDirection.RIGHT]: NavigationDirection.RIGHT,
      [MenuNavigationDirection.SELECT]: NavigationDirection.SELECT,
      [MenuNavigationDirection.BACK]: NavigationDirection.BACK
    };

    this.handleNavigationInput(directionMap[direction]);
  }

  protected handleNavigationInput(direction: NavigationDirection): void {
    if (!this.isVisible) return;

    // Notify AudioManager of user interaction (for autoplay unlock)
    AudioManager.getInstance().onUserInteraction();

    // First, let the focused element try to handle the input
    if (this.navigableElements.length > 0) {
      const focused = this.navigableElements[this.focusedIndex];
      if (focused.handleNavigation(direction)) {
        return; // Element handled the input
      }
    }

    // If element didn't handle it, menu handles it
    switch (direction) {
      case NavigationDirection.UP:
        this.focusPrevious();
        break;
      case NavigationDirection.DOWN:
        this.focusNext();
        break;
      case NavigationDirection.BACK:
        if (this.onBack) {
          this.onBack();
        }
        break;
    }
  }

  protected cleanupKeyboardInput(): void {
    if (this.menuInputManager) {
      this.menuInputManager.cleanup();
      this.menuInputManager = null;
    }
  }

  update(delta: number): void {
    if (!this.isVisible || this.navigableElements.length === 0) return;
    const focused = this.navigableElements[this.focusedIndex];
    if (focused && typeof (focused as any).update === 'function')
      (focused as any).update(delta);
  }

  destroy(): void {
    this.hide();
    this.elements.forEach(element => element.destroy());
    this.elements = [];
    this.navigableElements = [];
    this.container.destroy();
  }
}
