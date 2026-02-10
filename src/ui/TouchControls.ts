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
 * Virtual touch controls overlay: Joystick for movement + Fire button for powerup.
 * Only instantiated on touch-capable devices.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private callbacks: ITouchControlCallbacks;
  private logger: Logger;
  private touchLogger: Logger;

  // Containers
  private joystickContainer: Phaser.GameObjects.Container | null = null;
  private fireContainer: Phaser.GameObjects.Container | null = null;

  // Joystick elements
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private knob: Phaser.GameObjects.Arc | null = null;
  private joystickRadius: number = 0;
  private knobRadius: number = 0;
  private joystickCenterX: number = 0; // World-space center
  private joystickCenterY: number = 0;

  // Joystick drag state
  private isDragging: boolean = false;
  private activePointerId: number = -1;

  // Fire button background reference
  private fireButtonBg: Phaser.GameObjects.Arc | null = null;

  // State
  private activeDirection: Direction | null = null;
  private lastSentDirection: Direction | null = null;
  private isVisible: boolean = false;

  // Bound listener references for cleanup
  private globalPointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private globalPointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  constructor(scene: Phaser.Scene, callbacks: ITouchControlCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.logger = new Logger(LogGroup.GAME);
    this.touchLogger = new Logger(LogGroup.TOUCH);
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

    let joystickX: number, joystickY: number, fireX: number, fireY: number, size: number;

    if (useHorizontalLayout) {
      // Joystick in left margin, Fire in right margin
      size = Math.min(mapOffsetX - 20, cfg.maxSize);
      joystickX = mapOffsetX / 2;
      joystickY = mapOffsetY + mapHeight / 2;

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

      joystickX = canvasWidth * sideModifier;
      joystickY = controlsY;
      fireX = canvasWidth * (1 - sideModifier);
      fireY = controlsY;
    }

    // Don't create if too small to be usable
    if (size < 40) {
      this.logger.log('Touch controls: not enough space, skipping');
      return;
    }

    const baseRadius = size / 2;
    this.createJoystick(joystickX, joystickY, baseRadius * cfg.joystickSizeRatio);
    this.createFireButton(fireX, fireY, baseRadius * cfg.fireSizeRatio);
    this.setupGlobalListeners();

    this.isVisible = true;
    this.logger.log(`Touch controls created (${useHorizontalLayout ? 'horizontal' : 'vertical'} layout, size=${Math.round(size)})`);
  }

  private createJoystick(centerX: number, centerY: number, radius: number): void {
    const cfg = gameConfig.touchControls;
    this.joystickRadius = radius;
    this.joystickCenterX = centerX;
    this.joystickCenterY = centerY;

    this.joystickContainer = this.scene.add.container(centerX, centerY);
    this.joystickContainer.setScrollFactor(0);
    this.joystickContainer.setDepth(100);

    // Background circle (base)
    this.joystickBase = this.scene.add.circle(0, 0, radius, cfg.bgColor, cfg.bgAlpha);
    this.joystickBase.setStrokeStyle(2, cfg.buttonBorderColor);
    this.joystickBase.setInteractive();
    this.joystickContainer.add(this.joystickBase);

    // Knob
    this.knobRadius = radius * cfg.knobRadiusRatio;
    this.knob = this.scene.add.circle(0, 0, this.knobRadius, cfg.knobColor, cfg.knobAlpha);
    this.knob.setStrokeStyle(1, cfg.buttonBorderColor);
    this.joystickContainer.add(this.knob);

    // Pointerdown on the base starts dragging
    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchLogger.log(`pointerdown at (${Math.round(pointer.x)}, ${Math.round(pointer.y)}), pointerId=${pointer.id}`);
      this.isDragging = true;
      this.activePointerId = pointer.id;
      this.handleJoystickMove(pointer.x, pointer.y);
      this.knob!.setFillStyle(cfg.knobActiveColor, cfg.knobActiveAlpha);
    });
  }

  private handleJoystickMove(pointerX: number, pointerY: number): void {
    const dx = pointerX - this.joystickCenterX;
    const dy = pointerY - this.joystickCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Clamp knob position within base circle
    const maxDist = this.joystickRadius - this.knobRadius;
    if (distance <= maxDist) {
      this.knob!.x = dx;
      this.knob!.y = dy;
    } else {
      this.knob!.x = (dx / distance) * maxDist;
      this.knob!.y = (dy / distance) * maxDist;
    }

    // Compute direction from angle (with deadzone)
    const cfg = gameConfig.touchControls;
    const prevDirection = this.activeDirection;

    if (distance < this.joystickRadius * cfg.joystickDeadzone) {
      this.activeDirection = null;
      if (prevDirection !== null)
        this.touchLogger.log(`deadzone entered (dist=${distance.toFixed(1)}, threshold=${(this.joystickRadius * cfg.joystickDeadzone).toFixed(1)})`);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const angleDeg = angle * (180 / Math.PI);
    // atan2: 0=right, π/2=down, ±π=left, -π/2=up
    if (angle > -Math.PI / 4 && angle <= Math.PI / 4)
      this.activeDirection = Direction.RIGHT;
    else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4)
      this.activeDirection = Direction.DOWN;
    else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4)
      this.activeDirection = Direction.UP;
    else
      this.activeDirection = Direction.LEFT;

    if (this.activeDirection !== prevDirection)
      this.touchLogger.log(`direction: ${prevDirection} -> ${this.activeDirection} (angle=${angleDeg.toFixed(1)}°, dist=${distance.toFixed(1)}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`);
  }

  private resetJoystick(): void {
    this.touchLogger.log(`pointerup — resetting joystick (was: ${this.activeDirection})`);
    const cfg = gameConfig.touchControls;
    this.isDragging = false;
    this.activePointerId = -1;
    this.activeDirection = null;
    this.lastSentDirection = null;
    if (this.knob) {
      this.knob.x = 0;
      this.knob.y = 0;
      this.knob.setFillStyle(cfg.knobColor, cfg.knobAlpha);
    }
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

  private setupGlobalListeners(): void {
    // Global pointermove — track joystick drag even when pointer leaves the base
    this.globalPointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.id === this.activePointerId && pointer.isDown)
        this.handleJoystickMove(pointer.x, pointer.y);
    };
    this.scene.input.on('pointermove', this.globalPointerMoveHandler);

    // Global pointerup — release joystick when finger lifts
    this.globalPointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.id === this.activePointerId)
        this.resetJoystick();
    };
    this.scene.input.on('pointerup', this.globalPointerUpHandler);
  }

  // --- Public methods ---

  /**
   * Called every frame. Sends the direction only when it changes to avoid flooding the input queue.
   */
  update(): void {
    if (!this.isVisible) return;
    if (this.activeDirection !== null && this.activeDirection !== this.lastSentDirection) {
      this.touchLogger.log(`sending input: ${this.activeDirection} (prev sent: ${this.lastSentDirection})`);
      this.lastSentDirection = this.activeDirection;
      this.callbacks.onDirectionInput(this.activeDirection);
    }
    if (this.activeDirection === null)
      this.lastSentDirection = null;
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

    // Check joystick base
    if (this.joystickBase) {
      const dx = pointer.x - this.joystickCenterX;
      const dy = pointer.y - this.joystickCenterY;
      if (dx * dx + dy * dy <= this.joystickRadius * this.joystickRadius)
        return true;
    }

    // Check fire button
    if (this.fireButtonBg) {
      const worldMatrix = this.fireButtonBg.getWorldTransformMatrix();
      const dx = pointer.x - worldMatrix.tx;
      const dy = pointer.y - worldMatrix.ty;
      if (dx * dx + dy * dy <= this.fireButtonBg.radius * this.fireButtonBg.radius)
        return true;
    }

    return false;
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.joystickContainer) this.joystickContainer.setVisible(visible);
    if (this.fireContainer) this.fireContainer.setVisible(visible);

    if (!visible)
      this.resetJoystick();
  }

  getVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    if (this.globalPointerUpHandler) {
      this.scene.input.off('pointerup', this.globalPointerUpHandler);
      this.globalPointerUpHandler = null;
    }

    if (this.globalPointerMoveHandler) {
      this.scene.input.off('pointermove', this.globalPointerMoveHandler);
      this.globalPointerMoveHandler = null;
    }

    if (this.joystickContainer) {
      this.joystickContainer.destroy();
      this.joystickContainer = null;
    }

    if (this.fireContainer) {
      this.fireContainer.destroy();
      this.fireContainer = null;
    }

    this.joystickBase = null;
    this.knob = null;
    this.fireButtonBg = null;
    this.activeDirection = null;
    this.lastSentDirection = null;
    this.isDragging = false;
    this.activePointerId = -1;
    this.isVisible = false;
  }
}
