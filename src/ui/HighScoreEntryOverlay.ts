import Phaser from 'phaser';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { UICharacterSelectorGroup } from './elements/UICharacterSelectorGroup';
import { colorNumberToString } from '../utils/utils';
import { NavigationDirection } from '../interfaces/INavigable';

export class HighScoreEntryOverlay {
  private scene: Phaser.Scene;
  private localization: LocalizationManager;
  private score: number;
  private difficulty: string;
  private onSave: (name: string) => void;
  private onDismiss: () => void;

  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private enterNameText: Phaser.GameObjects.Text | null = null;
  private characterSelectorGroup: UICharacterSelectorGroup | null = null;
  private saveButton: Phaser.GameObjects.Container | null = null;

  private isVisible: boolean = false;
  private isSaveButtonFocused: boolean = false;

  // Keyboard keys
  private upKey: Phaser.Input.Keyboard.Key | null = null;
  private downKey: Phaser.Input.Keyboard.Key | null = null;
  private leftKey: Phaser.Input.Keyboard.Key | null = null;
  private rightKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  private tabKey: Phaser.Input.Keyboard.Key | null = null;

  // Character input listener
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    localization: LocalizationManager,
    score: number,
    difficulty: string,
    onSave: (name: string) => void,
    onDismiss: () => void
  ) {
    this.scene = scene;
    this.localization = localization;
    this.score = score;
    this.difficulty = difficulty;
    this.onSave = onSave;
    this.onDismiss = onDismiss;
  }

  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    const camera = this.scene.cameras.main;
    const centerX = camera.centerX;
    const centerY = camera.centerY;

    // Create semi-transparent black overlay
    this.overlay = this.scene.add.rectangle(
      centerX,
      centerY,
      camera.width,
      camera.height,
      0x000000,
      0.85
    );
    this.overlay.setDepth(10000);

    // Create container for all elements
    this.container = this.scene.add.container(centerX, centerY);
    this.container.setDepth(10001);

    // Title: "NEW HIGH SCORE!"
    this.titleText = this.scene.add.text(
      0,
      -150,
      this.localization.getText('newHighScore'),
      {
        fontFamily: 'PressStart2P',
        fontSize: '32px',
        color: colorNumberToString(gameConfig.menu.colors.titleText),
        align: 'center'
      }
    );
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);

    // Score display
    this.scoreText = this.scene.add.text(
      0,
      -80,
      this.score.toLocaleString(),
      {
        fontFamily: 'PressStart2P',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center'
      }
    );
    this.scoreText.setOrigin(0.5);
    this.container.add(this.scoreText);

    // "Enter Your Name:" text
    this.enterNameText = this.scene.add.text(
      0,
      0,
      this.localization.getText('enterName'),
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: colorNumberToString(gameConfig.menu.colors.labelText),
        align: 'center'
      }
    );
    this.enterNameText.setOrigin(0.5);
    this.container.add(this.enterNameText);

    // Character selector group
    this.characterSelectorGroup = new UICharacterSelectorGroup(this.scene, {
      x: 0,
      y: 70,
      numSelectors: 3,
      initialName: gameConfig.scores.defaultName,
      boxSize: 60,
      spacing: 25
    });
    this.container.add(this.characterSelectorGroup.container);

    // Focus the character selector group
    this.characterSelectorGroup.focus();

    // Create Save button
    this.saveButton = this.createSaveButton(0, 170);
    this.container.add(this.saveButton);

    // Setup keyboard input
    this.setupKeyboardInput();
  }

  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.cleanupKeyboardInput();

    // Destroy all elements
    this.overlay?.destroy();
    this.titleText?.destroy();
    this.scoreText?.destroy();
    this.enterNameText?.destroy();
    this.characterSelectorGroup?.destroy();
    this.saveButton?.destroy();
    this.container?.destroy();

    this.overlay = null;
    this.titleText = null;
    this.scoreText = null;
    this.enterNameText = null;
    this.characterSelectorGroup = null;
    this.saveButton = null;
    this.container = null;
  }

  private createSaveButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const buttonWidth = 200;
    const buttonHeight = 50;
    const cornerRadius = gameConfig.menu.layout.buttonCornerRadius;

    // Button background
    const background = this.scene.add.graphics();
    this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.menu.colors.buttonNormal, 3);

    // Invisible hit area
    const hitArea = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0);

    // Button text
    const buttonText = this.scene.add.text(0, 0, this.localization.getText('save'), {
      fontFamily: 'PressStart2P',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    });
    buttonText.setOrigin(0.5);

    container.add([background, hitArea, buttonText]);

    // Store dimensions
    (container as any).buttonWidth = buttonWidth;
    (container as any).buttonHeight = buttonHeight;
    (container as any).cornerRadius = cornerRadius;
    (container as any).background = background;

    // Setup interactivity
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      this.focusSaveButton();
    });

    hitArea.on('pointerout', () => {
      this.blurSaveButton();
    });

    hitArea.on('pointerdown', () => {
      this.handleSave();
    });

    return container;
  }

  private drawButtonBackground(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    cornerRadius: number,
    fillColor: number,
    strokeWidth: number
  ): void {
    graphics.clear();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
    graphics.lineStyle(strokeWidth, gameConfig.menu.colors.buttonBorder, 1);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
  }

  private focusSaveButton(): void {
    if (!this.saveButton) return;

    this.isSaveButtonFocused = true;
    this.characterSelectorGroup?.blur();

    const background = (this.saveButton as any).background as Phaser.GameObjects.Graphics;
    const buttonWidth = (this.saveButton as any).buttonWidth;
    const buttonHeight = (this.saveButton as any).buttonHeight;
    const cornerRadius = (this.saveButton as any).cornerRadius;

    this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.menu.colors.buttonHighlight, 4);

    // Scale animation
    this.scene.tweens.add({
      targets: this.saveButton,
      scaleX: gameConfig.menu.animation.focusScale,
      scaleY: gameConfig.menu.animation.focusScale,
      duration: 100,
      ease: 'Power2'
    });
  }

  private blurSaveButton(): void {
    if (!this.saveButton) return;

    this.isSaveButtonFocused = false;

    const background = (this.saveButton as any).background as Phaser.GameObjects.Graphics;
    const buttonWidth = (this.saveButton as any).buttonWidth;
    const buttonHeight = (this.saveButton as any).buttonHeight;
    const cornerRadius = (this.saveButton as any).cornerRadius;

    this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.menu.colors.buttonNormal, 3);

    // Scale animation
    this.scene.tweens.add({
      targets: this.saveButton,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  private handleSave(): void {
    if (!this.characterSelectorGroup) return;

    const name = this.characterSelectorGroup.getName();
    this.hide();
    this.onSave(name);
  }

  private setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

    // Arrow keys
    this.upKey = this.scene.input.keyboard.addKey(KeyCodes.UP);
    this.downKey = this.scene.input.keyboard.addKey(KeyCodes.DOWN);
    this.leftKey = this.scene.input.keyboard.addKey(KeyCodes.LEFT);
    this.rightKey = this.scene.input.keyboard.addKey(KeyCodes.RIGHT);
    this.enterKey = this.scene.input.keyboard.addKey(KeyCodes.ENTER);
    this.tabKey = this.scene.input.keyboard.addKey(KeyCodes.TAB);

    // Navigation handlers (no WASD - those are valid character inputs)
    this.upKey.on('down', () => this.handleUp());
    this.downKey.on('down', () => this.handleDown());
    this.leftKey.on('down', () => this.handleLeft());
    this.rightKey.on('down', () => this.handleRight());
    this.enterKey.on('down', () => this.handleEnter());
    this.tabKey.on('down', () => this.handleTab());

    // Direct character input using DOM event (captures all letters/numbers)
    this.keydownHandler = (event: KeyboardEvent) => {
      if (!this.isVisible) return;
      if (this.isSaveButtonFocused) return;

      // Only handle single character keys
      if (event.key.length === 1) {
        const handled = this.characterSelectorGroup?.handleKeyInput(event.key);
        if (handled) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  private cleanupKeyboardInput(): void {
    const keys = [
      this.upKey, this.downKey, this.leftKey, this.rightKey,
      this.enterKey, this.tabKey
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
    this.enterKey = null;
    this.tabKey = null;

    // Remove DOM keydown listener
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  private handleUp(): void {
    if (!this.isVisible) return;

    if (this.isSaveButtonFocused) {
      // Move focus back to character selectors
      this.blurSaveButton();
      this.characterSelectorGroup?.focus();
    } else {
      // Cycle character up
      this.characterSelectorGroup?.handleNavigation(NavigationDirection.UP);
    }
  }

  private handleDown(): void {
    if (!this.isVisible) return;

    if (this.isSaveButtonFocused) {
      // Already at bottom, do nothing
      return;
    } else {
      // Cycle character down
      this.characterSelectorGroup?.handleNavigation(NavigationDirection.DOWN);
    }
  }

  private handleLeft(): void {
    if (!this.isVisible) return;

    if (!this.isSaveButtonFocused && this.characterSelectorGroup) {
      this.characterSelectorGroup.handleNavigation(NavigationDirection.LEFT);
    }
  }

  private handleRight(): void {
    if (!this.isVisible) return;

    if (!this.isSaveButtonFocused && this.characterSelectorGroup) {
      this.characterSelectorGroup.handleNavigation(NavigationDirection.RIGHT);
    }
  }

  private handleEnter(): void {
    if (!this.isVisible) return;

    if (this.isSaveButtonFocused) {
      this.handleSave();
    } else {
      // Move from character selectors to save button, or handle SELECT
      const handled = this.characterSelectorGroup?.handleNavigation(NavigationDirection.SELECT);
      if (!handled) {
        // At last character selector, move to save button
        this.focusSaveButton();
      }
    }
  }

  private handleTab(): void {
    if (!this.isVisible) return;

    if (this.isSaveButtonFocused) {
      // Wrap back to first character selector
      this.blurSaveButton();
      this.characterSelectorGroup?.focus();
      this.characterSelectorGroup?.focusSelector(0);
    } else {
      // Try to move to next selector, if at last one move to save button
      const moved = this.characterSelectorGroup?.handleNavigation(NavigationDirection.RIGHT);
      if (!moved) {
        // At last character selector, move to save button
        this.focusSaveButton();
      }
    }
  }

  isShowing(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.hide();
  }
}
