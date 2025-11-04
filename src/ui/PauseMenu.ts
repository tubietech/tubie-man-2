import Phaser from 'phaser';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';

export class PauseMenu {
  private scene: Phaser.Scene;
  private localization: LocalizationManager;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private pausedText: Phaser.GameObjects.Text | null = null;
  private continueButton: Phaser.GameObjects.Container | null = null;
  private quitButton: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private onContinue: () => void;
  private onQuit: () => void;
  private selectedButtonIndex: number = 0; // 0 = Continue, 1 = Quit
  private buttons: Phaser.GameObjects.Container[] = [];
  private upKey: Phaser.Input.Keyboard.Key | null = null;
  private downKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(
    scene: Phaser.Scene,
    localization: LocalizationManager,
    onContinue: () => void,
    onQuit: () => void
  ) {
    this.scene = scene;
    this.localization = localization;
    this.onContinue = onContinue;
    this.onQuit = onQuit;
  }

  /**
   * Show the pause menu
   */
  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.selectedButtonIndex = 0; // Reset to first button
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
      0.7
    );
    this.overlay.setDepth(10000); // Very high depth to ensure it's on top

    // Create "PAUSED" text
    this.pausedText = this.scene.add.text(
      centerX,
      centerY - 100,
      this.localization.getText('paused'),
      {
        fontFamily: 'PressStart2P',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center'
      }
    );
    this.pausedText.setOrigin(0.5);
    this.pausedText.setDepth(10001);

    // Create Continue button
    this.continueButton = this.createButton(
      centerX,
      centerY + 20,
      this.localization.getText('continue'),
      () => this.handleContinue()
    );

    // Create Quit button
    this.quitButton = this.createButton(
      centerX,
      centerY + 100,
      this.localization.getText('quit'),
      () => this.handleQuit()
    );

    // Store buttons in array for navigation
    this.buttons = [this.continueButton, this.quitButton];

    // Set up keyboard input
    this.setupKeyboardInput();

    // Highlight the first button
    this.updateButtonHighlight();
  }

  /**
   * Hide the pause menu
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    // Clean up keyboard input
    this.cleanupKeyboardInput();

    // Destroy all UI elements
    this.overlay?.destroy();
    this.pausedText?.destroy();
    this.continueButton?.destroy();
    this.quitButton?.destroy();

    this.overlay = null;
    this.pausedText = null;
    this.continueButton = null;
    this.quitButton = null;
    this.buttons = [];
  }

  /**
   * Check if the pause menu is currently visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Create a button with text and background
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(10001);

    // Button background
    const background = this.scene.add.rectangle(0, 0, 250, 60, gameConfig.colors.pauseButtonNormal);
    background.setStrokeStyle(3, gameConfig.colors.pauseButtonBorder);

    // Button text
    const buttonText = this.scene.add.text(0, 0, text, {
      fontFamily: 'PressStart2P',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    });
    buttonText.setOrigin(0.5);

    container.add([background, buttonText]);

    // Make interactive
    background.setInteractive({ useHandCursor: true });

    // Hover effects
    background.on('pointerover', () => {
      background.setFillStyle(gameConfig.colors.pauseButtonHighlight);
    });

    background.on('pointerout', () => {
      background.setFillStyle(gameConfig.colors.pauseButtonNormal);
    });

    // Click handler
    background.on('pointerdown', onClick);

    return container;
  }

  /**
   * Handle continue button click
   */
  private handleContinue(): void {
    this.hide();
    this.onContinue();
  }

  /**
   * Handle quit button click
   */
  private handleQuit(): void {
    this.hide();
    this.onQuit();
  }

  /**
   * Set up keyboard input for navigation
   */
  private setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    // Create key objects
    this.upKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Handle up arrow
    this.upKey.on('down', () => {
      if (this.isVisible) {
        this.selectedButtonIndex--;
        if (this.selectedButtonIndex < 0) {
          this.selectedButtonIndex = this.buttons.length - 1; // Wrap to last button
        }
        this.updateButtonHighlight();
      }
    });

    // Handle down arrow
    this.downKey.on('down', () => {
      if (this.isVisible) {
        this.selectedButtonIndex++;
        if (this.selectedButtonIndex >= this.buttons.length) {
          this.selectedButtonIndex = 0; // Wrap to first button
        }
        this.updateButtonHighlight();
      }
    });

    // Handle Enter key to activate selected button
    this.enterKey.on('down', () => {
      if (this.isVisible) {
        this.activateSelectedButton();
      }
    });
  }

  /**
   * Clean up keyboard input
   */
  private cleanupKeyboardInput(): void {
    this.upKey?.off('down');
    this.downKey?.off('down');
    this.enterKey?.off('down');
    this.upKey?.destroy();
    this.downKey?.destroy();
    this.enterKey?.destroy();
    this.upKey = null;
    this.downKey = null;
    this.enterKey = null;
  }

  /**
   * Update button visual highlight based on selection
   */
  private updateButtonHighlight(): void {
    this.buttons.forEach((button, index) => {
      const background = button.list[0] as Phaser.GameObjects.Rectangle;
      if (index === this.selectedButtonIndex) {
        // Highlight selected button
        background.setFillStyle(gameConfig.colors.pauseButtonHighlight);
        background.setStrokeStyle(4, gameConfig.colors.pauseButtonBorder); // Thicker border
      } else {
        // Normal state
        background.setFillStyle(gameConfig.colors.pauseButtonNormal);
        background.setStrokeStyle(3, gameConfig.colors.pauseButtonBorder);
      }
    });
  }

  /**
   * Activate the currently selected button
   */
  private activateSelectedButton(): void {
    if (this.selectedButtonIndex === 0) {
      this.handleContinue();
    } else if (this.selectedButtonIndex === 1) {
      this.handleQuit();
    }
  }

  /**
   * Clean up the pause menu
   */
  destroy(): void {
    this.hide();
  }
}
