import Phaser from 'phaser';
import { Direction } from '../enums/Direction';
import { Orientation } from '../enums/Orientation';
import { gameConfig } from '../config/gameConfig';
import { Logger } from '../utils/Logger';
import { LogGroup } from '../enums/LogGroup';
import { SettingsManager } from '../utils/SettingsManager';

export interface ITouchControlCallbacks {
  onDirectionInput: (direction: Direction) => void;
  onFirePressed: () => void;
}

/**
 * Virtual touch controls overlay: D-Pad for movement + Fire button for powerup.
 * Only instantiated on touch-capable devices.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private callbacks: ITouchControlCallbacks;
  private logger: Logger;

  // Containers
  private dpadContainer: Phaser.GameObjects.Container | null = null;
  private fireContainer: Phaser.GameObjects.Container | null = null;

  // D-pad button references (for highlight toggling)
  private dpadButtons: Map<Direction, Phaser.GameObjects.Arc> = new Map();

  // Fire button background reference
  private fireButtonBg: Phaser.GameObjects.Arc | null = null;

  // Track all interactive objects for pointer filtering
  private interactiveObjects: Set<Phaser.GameObjects.GameObject> = new Set();

  // State
  private activeDirection: Direction | null = null;
  private isVisible: boolean = false;

  // Bound listener reference for cleanup
  private globalPointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  constructor(scene: Phaser.Scene, callbacks: ITouchControlCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.logger = new Logger(LogGroup.GAME);
  }

  static isTouchDevice(): boolean {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  create(
    orientation: Orientation,
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const canvasWidth = this.scene.cameras.main.width;
    const canvasHeight = this.scene.cameras.main.height;
    const cfg = gameConfig.touchControls;

    // Determine if we have enough side margin for horizontal layout
    const useHorizontalLayout = orientation === Orientation.HORIZONTAL
      && mapOffsetX >= cfg.minMargin;

    let dpadX: number, dpadY: number, fireX: number, fireY: number, size: number;

    if (useHorizontalLayout) {
      // D-Pad in left margin, Fire in right margin
      size = Math.min(mapOffsetX - 20, cfg.maxSize);
      dpadX = mapOffsetX / 2;
      dpadY = mapOffsetY + mapHeight / 2;

      const rightMarginStart = mapOffsetX + mapWidth;
      const rightMarginWidth = canvasWidth - rightMarginStart;
      fireX = rightMarginStart + rightMarginWidth / 2;
      fireY = mapOffsetY + mapHeight * 0.75;
    } else {
      // Both controls below the map
      const availableBottom = canvasHeight - mapOffsetY - mapHeight;
      size = Math.min(availableBottom - 20, canvasWidth / 2 - 20, cfg.maxSize);
      const controlsY = mapOffsetY + mapHeight + availableBottom / 2;

      // Flip controls based on settings for right-handed or left-handed preference
      const sideModifier = SettingsManager.getInstance().getTouchIsRightHanded() ? 0.75 : 0.25;

      dpadX = canvasWidth * sideModifier;
      dpadY = controlsY;
      fireX = canvasWidth * (1 - sideModifier);
      fireY = controlsY;
    }

    // Don't create if too small to be usable
    if (size < 40) {
      this.logger.log('Touch controls: not enough space, skipping');
      return;
    }

    const dpadRadius = size / 2;
    this.createDpad(dpadX, dpadY, dpadRadius);
    this.createFireButton(fireX, fireY, dpadRadius * cfg.fireSizeRatio);
    this.setupGlobalPointerUp();

    this.isVisible = true;
    this.logger.log(`Touch controls created (${useHorizontalLayout ? 'horizontal' : 'vertical'} layout, size=${Math.round(size)})`);
  }

  private createDpad(centerX: number, centerY: number, radius: number): void {
    const cfg = gameConfig.touchControls;
    this.dpadContainer = this.scene.add.container(centerX, centerY);
    this.dpadContainer.setScrollFactor(0);
    this.dpadContainer.setDepth(100);

    // Background circle
    const bg = this.scene.add.circle(0, 0, radius, cfg.bgColor, cfg.bgAlpha);
    bg.setStrokeStyle(2, cfg.buttonBorderColor);
    this.dpadContainer.add(bg);

    // Directional buttons
    const buttonRadius = radius * cfg.dpadButtonRadiusRatio;
    const offset = radius * cfg.dpadButtonOffsetRatio;

    const directions: { dir: Direction; x: number; y: number }[] = [
      { dir: Direction.UP, x: 0, y: -offset },
      { dir: Direction.DOWN, x: 0, y: offset },
      { dir: Direction.LEFT, x: -offset, y: 0 },
      { dir: Direction.RIGHT, x: offset, y: 0 },
    ];

    for (const { dir, x, y } of directions) {
      const btn = this.scene.add.circle(x, y, buttonRadius, cfg.buttonColor, cfg.buttonAlpha);
      btn.setStrokeStyle(1, cfg.buttonBorderColor);
      btn.setInteractive();
      this.interactiveObjects.add(btn);
      this.dpadButtons.set(dir, btn);
      this.dpadContainer.add(btn);

      // Arrow icon
      this.drawArrowIcon(dir, x, y, buttonRadius);

      // Input handlers
      btn.on('pointerdown', () => {
        this.setActiveDirection(dir);
        this.highlightDpadButton(dir, true);
      });

      btn.on('pointerover', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        // When dragging from one button to another
        const pointer = this.scene.input.activePointer;
        if (pointer.isDown) {
          this.setActiveDirection(dir);
          this.highlightDpadButton(dir, true);
        }
        event.stopPropagation();
      });

      btn.on('pointerout', () => {
        this.highlightDpadButton(dir, false);
      });

      btn.on('pointerup', () => {
        this.clearActiveDirection(dir);
        this.highlightDpadButton(dir, false);
      });
    }

    // Center decoration
    const centerDot = this.scene.add.circle(0, 0, buttonRadius * 0.4, 0x333333, 0.5);
    this.dpadContainer.add(centerDot);
  }

  private drawArrowIcon(dir: Direction, btnX: number, btnY: number, btnRadius: number): void {
    const arrowSize = btnRadius * 0.5;
    const cfg = gameConfig.touchControls;

    let x1: number, y1: number, x2: number, y2: number, x3: number, y3: number;

    switch (dir) {
      case Direction.UP:
        x1 = btnX; y1 = btnY - arrowSize;
        x2 = btnX - arrowSize; y2 = btnY + arrowSize * 0.5;
        x3 = btnX + arrowSize; y3 = btnY + arrowSize * 0.5;
        break;
      case Direction.DOWN:
        x1 = btnX; y1 = btnY + arrowSize;
        x2 = btnX - arrowSize; y2 = btnY - arrowSize * 0.5;
        x3 = btnX + arrowSize; y3 = btnY - arrowSize * 0.5;
        break;
      case Direction.LEFT:
        x1 = btnX - arrowSize; y1 = btnY;
        x2 = btnX + arrowSize * 0.5; y2 = btnY - arrowSize;
        x3 = btnX + arrowSize * 0.5; y3 = btnY + arrowSize;
        break;
      case Direction.RIGHT:
        x1 = btnX + arrowSize; y1 = btnY;
        x2 = btnX - arrowSize * 0.5; y2 = btnY - arrowSize;
        x3 = btnX - arrowSize * 0.5; y3 = btnY + arrowSize;
        break;
    }

    const triangle = this.scene.add.triangle(0, 0, x1, y1, x2, y2, x3, y3, cfg.arrowColor);
    triangle.setOrigin(0, 0);
    this.dpadContainer!.add(triangle);
  }

  private createFireButton(centerX: number, centerY: number, radius: number): void {
    const cfg = gameConfig.touchControls;
    this.fireContainer = this.scene.add.container(centerX, centerY);
    this.fireContainer.setScrollFactor(0);
    this.fireContainer.setDepth(100);

    // Background circle
    const bg = this.scene.add.circle(0, 0, radius, cfg.fireColor, cfg.fireAlpha);
    bg.setStrokeStyle(2, cfg.buttonBorderColor);
    this.fireButtonBg = bg;

    // Label
    const fontSize = Math.max(8, Math.floor(radius * 0.3));
    const label = this.scene.add.text(0, 0, 'FIRE', {
      fontFamily: 'PressStart2P',
      fontSize: `${fontSize}px`,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.fireContainer.add([bg, label]);

    bg.setInteractive();
    this.interactiveObjects.add(bg);

    bg.on('pointerdown', () => {
      this.callbacks.onFirePressed();
      bg.setFillStyle(cfg.fireActiveColor, cfg.fireActiveAlpha);
    });

    bg.on('pointerup', () => {
      bg.setFillStyle(cfg.fireColor, cfg.fireAlpha);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(cfg.fireColor, cfg.fireAlpha);
    });
  }

  private setupGlobalPointerUp(): void {
    this.globalPointerUpHandler = () => {
      this.clearAllDirections();
    };
    this.scene.input.on('pointerup', this.globalPointerUpHandler);
  }

  // --- Direction state management ---

  private setActiveDirection(dir: Direction): void {
    if (this.activeDirection !== null && this.activeDirection !== dir)
      this.highlightDpadButton(this.activeDirection, false);
    this.activeDirection = dir;
  }

  private clearActiveDirection(dir: Direction): void {
    if (this.activeDirection === dir)
      this.activeDirection = null;
  }

  private clearAllDirections(): void {
    if (this.activeDirection !== null)
      this.highlightDpadButton(this.activeDirection, false);
    this.activeDirection = null;
  }

  private highlightDpadButton(dir: Direction, active: boolean): void {
    const btn = this.dpadButtons.get(dir);
    if (!btn) return;

    const cfg = gameConfig.touchControls;
    if (active) {
      btn.setFillStyle(cfg.buttonActiveColor, cfg.buttonActiveAlpha);
    } else {
      btn.setFillStyle(cfg.buttonColor, cfg.buttonAlpha);
    }
  }

  // --- Public methods ---

  /**
   * Called every frame. Queues the active direction if a D-Pad button is held.
   */
  update(): void {
    if (!this.isVisible) return;
    if (this.activeDirection !== null)
      this.callbacks.onDirectionInput(this.activeDirection);
  }

  /**
   * Update fire button visual state based on powerup availability.
   */
  updateFireButtonState(hasFirePower: boolean, fireActive: boolean): void {
    if (!this.fireButtonBg) return;

    const cfg = gameConfig.touchControls;
    if (hasFirePower || fireActive)
      this.fireButtonBg.setAlpha(cfg.fireAlpha);
    else
      this.fireButtonBg.setAlpha(cfg.fireDisabledAlpha);
  }

  /**
   * Check if a pointer is over any touch control interactive element.
   * Used by InputManager to filter out conflicting pointer events.
   */
  isPointerOnControls(pointer: Phaser.Input.Pointer): boolean {
    if (!this.isVisible) return false;

    for (const obj of this.interactiveObjects) {
      if (!(obj instanceof Phaser.GameObjects.Arc)) continue;

      const worldMatrix = obj.getWorldTransformMatrix();
      const dx = pointer.x - worldMatrix.tx;
      const dy = pointer.y - worldMatrix.ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= obj.radius)
        return true;
    }
    return false;
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.dpadContainer) this.dpadContainer.setVisible(visible);
    if (this.fireContainer) this.fireContainer.setVisible(visible);

    if (!visible)
      this.clearAllDirections();
  }

  getVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    if (this.globalPointerUpHandler) {
      this.scene.input.off('pointerup', this.globalPointerUpHandler);
      this.globalPointerUpHandler = null;
    }

    if (this.dpadContainer) {
      this.dpadContainer.destroy();
      this.dpadContainer = null;
    }

    if (this.fireContainer) {
      this.fireContainer.destroy();
      this.fireContainer = null;
    }

    this.dpadButtons.clear();
    this.interactiveObjects.clear();
    this.fireButtonBg = null;
    this.activeDirection = null;
    this.isVisible = false;
  }
}
