import Phaser from 'phaser';
import { MenuType } from '../../enums/MenuType';
import { IMenu, IMenuConfig } from '../../interfaces/IMenu';
import { IUIElement } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { gameConfig } from '../../config/gameConfig';
import { Orientation } from '../../enums/Orientation';
import { SettingsManager } from '../../utils/SettingsManager';
import { AudioManager } from '../../utils/AudioManager';

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

  // Keyboard keys - Arrow keys (always available)
  protected upKey: Phaser.Input.Keyboard.Key | null = null;
  protected downKey: Phaser.Input.Keyboard.Key | null = null;
  protected leftKey: Phaser.Input.Keyboard.Key | null = null;
  protected rightKey: Phaser.Input.Keyboard.Key | null = null;
  // Custom keys from settings
  protected customUpKey: Phaser.Input.Keyboard.Key | null = null;
  protected customDownKey: Phaser.Input.Keyboard.Key | null = null;
  protected customLeftKey: Phaser.Input.Keyboard.Key | null = null;
  protected customRightKey: Phaser.Input.Keyboard.Key | null = null;
  // Action keys
  protected enterKey: Phaser.Input.Keyboard.Key | null = null;
  protected customConfirmKey: Phaser.Input.Keyboard.Key | null = null;
  protected escapeKey: Phaser.Input.Keyboard.Key | null = null;
  protected tabKey: Phaser.Input.Keyboard.Key | null = null;
  // Mute key
  protected muteKey: Phaser.Input.Keyboard.Key | null = null;
  protected customMuteKey: Phaser.Input.Keyboard.Key | null = null;
  protected settingsManager: SettingsManager = SettingsManager.getInstance();

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

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    const settingsManager = SettingsManager.getInstance();

    // Arrow keys (always available for navigation)
    this.upKey = this.scene.input.keyboard.addKey(KeyCodes.UP);
    this.downKey = this.scene.input.keyboard.addKey(KeyCodes.DOWN);
    this.leftKey = this.scene.input.keyboard.addKey(KeyCodes.LEFT);
    this.rightKey = this.scene.input.keyboard.addKey(KeyCodes.RIGHT);
    this.muteKey = this.scene.input.keyboard.addKey(KeyCodes.M);

    // Custom movement keys from settings (only add if different from arrow keys)
    const customUpCode = settingsManager.getUpKeyCode();
    const customDownCode = settingsManager.getDownKeyCode();
    const customLeftCode = settingsManager.getLeftKeyCode();
    const customRightCode = settingsManager.getRightKeyCode();
    const customConfirmCode = settingsManager.getContinueKeyCode();
    const customMuteCode = settingsManager.getMuteKeyCode();

    if (customUpCode !== KeyCodes.UP) {
      this.customUpKey = this.scene.input.keyboard.addKey(customUpCode);
    }
    if (customDownCode !== KeyCodes.DOWN) {
      this.customDownKey = this.scene.input.keyboard.addKey(customDownCode);
    }
    if (customLeftCode !== KeyCodes.LEFT) {
      this.customLeftKey = this.scene.input.keyboard.addKey(customLeftCode);
    }
    if (customRightCode !== KeyCodes.RIGHT) {
      this.customRightKey = this.scene.input.keyboard.addKey(customRightCode);
    }

    if(customMuteCode !== KeyCodes.M) {
      this.customMuteKey = this.scene.input.keyboard.addKey(customMuteCode);
    }

    // Action keys - Enter is always available, plus custom confirm from settings (if different)
    this.enterKey = this.scene.input.keyboard.addKey(KeyCodes.ENTER);
    if (customConfirmCode !== KeyCodes.ENTER) {
      this.customConfirmKey = this.scene.input.keyboard.addKey(customConfirmCode);
    }
    this.escapeKey = this.scene.input.keyboard.addKey(KeyCodes.ESC);
    this.tabKey = this.scene.input.keyboard.addKey(KeyCodes.TAB);

    // UP - Previous element (arrow + custom)
    this.upKey.on('down', () => this.handleNavigationInput(NavigationDirection.UP));
    this.customUpKey?.on('down', () => this.handleNavigationInput(NavigationDirection.UP));

    // DOWN - Next element (arrow + custom)
    this.downKey.on('down', () => this.handleNavigationInput(NavigationDirection.DOWN));
    this.customDownKey?.on('down', () => this.handleNavigationInput(NavigationDirection.DOWN));

    // LEFT - Left within element (arrow + custom)
    this.leftKey.on('down', () => this.handleNavigationInput(NavigationDirection.LEFT));
    this.customLeftKey?.on('down', () => this.handleNavigationInput(NavigationDirection.LEFT));

    // RIGHT - Right within element (arrow + custom)
    this.rightKey.on('down', () => this.handleNavigationInput(NavigationDirection.RIGHT));
    this.customRightKey?.on('down', () => this.handleNavigationInput(NavigationDirection.RIGHT));

    // ENTER / Custom confirm - Select
    this.enterKey.on('down', () => this.handleNavigationInput(NavigationDirection.SELECT));
    this.customConfirmKey?.on('down', () => this.handleNavigationInput(NavigationDirection.SELECT));

    // ESC - Back
    this.escapeKey.on('down', () => this.handleNavigationInput(NavigationDirection.BACK));

    // TAB - Next element (always moves to next, never handled by element)
    // Use addKey with enableCapture to prevent default browser tab behavior
    this.scene.input.keyboard?.addCapture(KeyCodes.TAB);
    this.tabKey.on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
      if (event?.shiftKey) {
        this.focusPrevious();
      } else {
        this.focusNext();
      }
    });
    
    const _muteKey = this.customMuteKey ? this.customMuteKey : this.muteKey;
    _muteKey?.on('down', () => {
      const audioManager = AudioManager.getInstance();
      audioManager.toggleMasterMute();
      this.settingsManager.setMasterMuted(audioManager.isMasterMutedState());
    });
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
    const keys = [
      this.upKey, this.downKey, this.leftKey, this.rightKey,
      this.customUpKey, this.customDownKey, this.customLeftKey, this.customRightKey,
      this.enterKey, this.customConfirmKey, this.escapeKey, this.tabKey, this.muteKey, this.customMuteKey
    ];

    keys.forEach(key => {
      if (key) {
        key.off('down');
        key.destroy();
      }
    });

    this.upKey = null;
    this.downKey = null;
    this.leftKey = null;
    this.rightKey = null;
    this.customUpKey = null;
    this.customDownKey = null;
    this.customLeftKey = null;
    this.customRightKey = null;
    this.enterKey = null;
    this.customConfirmKey = null;
    this.escapeKey = null;
    this.tabKey = null;
    this.muteKey = null;
    this.customMuteKey = null;
  }

  destroy(): void {
    this.hide();
    this.elements.forEach(element => element.destroy());
    this.elements = [];
    this.navigableElements = [];
    this.container.destroy();
  }
}
