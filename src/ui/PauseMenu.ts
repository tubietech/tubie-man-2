import Phaser from 'phaser';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { SettingsManager } from '../utils/SettingsManager';

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
  // Arrow keys (always available)
  private upKey: Phaser.Input.Keyboard.Key | null = null;
  private downKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  // Custom keys from settings
  private customUpKey: Phaser.Input.Keyboard.Key | null = null;
  private customDownKey: Phaser.Input.Keyboard.Key | null = null;
  private customConfirmKey: Phaser.Input.Keyboard.Key | null = null;

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

    const buttonWidth = 250;
    const buttonHeight = 60;
    const cornerRadius = gameConfig.menu.layout.buttonCornerRadius;

    // Button background using Graphics for rounded corners
    const background = this.scene.add.graphics();
    this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.colors.pauseButtonNormal, 3);

    // Invisible hit area for interactivity
    const hitArea = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0);

    // Button text
    const buttonText = this.scene.add.text(0, 0, text, {
      fontFamily: 'PressStart2P',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    });
    buttonText.setOrigin(0.5);

    container.add([background, hitArea, buttonText]);

    // Store dimensions for highlight updates
    (container as any).buttonWidth = buttonWidth;
    (container as any).buttonHeight = buttonHeight;
    (container as any).cornerRadius = cornerRadius;

    // Make interactive
    hitArea.setInteractive({ useHandCursor: true });

    // Hover effects
    hitArea.on('pointerover', () => {
      this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.colors.pauseButtonHighlight, 3);
    });

    hitArea.on('pointerout', () => {
      this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.colors.pauseButtonNormal, 3);
    });

    // Click handler
    hitArea.on('pointerdown', onClick);

    return container;
  }

  /**
   * Helper to draw button background with rounded corners
   */
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
    graphics.lineStyle(strokeWidth, gameConfig.colors.pauseButtonBorder, 1);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
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

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    const settingsManager = SettingsManager.getInstance();

    // Arrow keys (always available)
    this.upKey = this.scene.input.keyboard.addKey(KeyCodes.UP);
    this.downKey = this.scene.input.keyboard.addKey(KeyCodes.DOWN);
    this.enterKey = this.scene.input.keyboard.addKey(KeyCodes.ENTER);

    // Custom keys from settings (only add if different from defaults)
    const customUpCode = settingsManager.getUpKeyCode();
    const customDownCode = settingsManager.getDownKeyCode();
    const customConfirmCode = settingsManager.getContinueKeyCode();

    if (customUpCode !== KeyCodes.UP) {
      this.customUpKey = this.scene.input.keyboard.addKey(customUpCode);
    }
    if (customDownCode !== KeyCodes.DOWN) {
      this.customDownKey = this.scene.input.keyboard.addKey(customDownCode);
    }
    if (customConfirmCode !== KeyCodes.ENTER) {
      this.customConfirmKey = this.scene.input.keyboard.addKey(customConfirmCode);
    }

    // Navigate up handler
    const handleUp = () => {
      if (this.isVisible) {
        this.selectedButtonIndex--;
        if (this.selectedButtonIndex < 0) {
          this.selectedButtonIndex = this.buttons.length - 1;
        }
        this.updateButtonHighlight();
      }
    };

    // Navigate down handler
    const handleDown = () => {
      if (this.isVisible) {
        this.selectedButtonIndex++;
        if (this.selectedButtonIndex >= this.buttons.length) {
          this.selectedButtonIndex = 0;
        }
        this.updateButtonHighlight();
      }
    };

    // Confirm handler
    const handleConfirm = () => {
      if (this.isVisible) {
        this.activateSelectedButton();
      }
    };

    // Register handlers for arrow keys
    this.upKey.on('down', handleUp);
    this.downKey.on('down', handleDown);
    this.enterKey.on('down', handleConfirm);

    // Register handlers for custom keys
    this.customUpKey?.on('down', handleUp);
    this.customDownKey?.on('down', handleDown);
    this.customConfirmKey?.on('down', handleConfirm);
  }

  /**
   * Clean up keyboard input
   */
  private cleanupKeyboardInput(): void {
    const keys = [
      this.upKey, this.downKey, this.enterKey,
      this.customUpKey, this.customDownKey, this.customConfirmKey
    ];

    keys.forEach(key => {
      if (key) {
        key.off('down');
        key.destroy();
      }
    });

    this.upKey = null;
    this.downKey = null;
    this.enterKey = null;
    this.customUpKey = null;
    this.customDownKey = null;
    this.customConfirmKey = null;
  }

  /**
   * Update button visual highlight based on selection
   */
  private updateButtonHighlight(): void {
    this.buttons.forEach((button, index) => {
      const background = button.list[0] as Phaser.GameObjects.Graphics;
      const buttonWidth = (button as any).buttonWidth;
      const buttonHeight = (button as any).buttonHeight;
      const cornerRadius = (button as any).cornerRadius;

      if (index === this.selectedButtonIndex) {
        // Highlight selected button
        this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.colors.pauseButtonHighlight, 4);
      } else {
        // Normal state
        this.drawButtonBackground(background, buttonWidth, buttonHeight, cornerRadius, gameConfig.colors.pauseButtonNormal, 3);
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
