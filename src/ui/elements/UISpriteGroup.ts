import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';

export interface IUISpriteGroupConfig extends IUIElementConfig {
  sprites: ISpriteData[];
  spacing?: number;
  animateChase?: boolean;
  chaseWidth?: number;
  fadeBarWidth?: number;
  fadeBarColor?: number;
}

export interface ISpriteData {
  texture: string;
  frame?: string | number;
  scale?: number;
  animation?: string;
}

export class UISpriteGroup extends UIElement {
  readonly type = MenuItemType.SPRITE_GROUP;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private spacing: number;
  private animateChase: boolean;
  private chaseWidth: number;
  private chasePositions: number[] = [];
  private updateEvent?: Phaser.Time.TimerEvent;
  private fadeBarWidth: number;
  private fadeBarColor: number;

  constructor(scene: Phaser.Scene, config: IUISpriteGroupConfig) {
    super(scene, config);

    this.spacing = config.spacing ?? 40;
    this.animateChase = config.animateChase ?? false;
    this.chaseWidth = config.chaseWidth ?? 400;
    this.fadeBarWidth = config.fadeBarWidth ?? 60;
    this.fadeBarColor = config.fadeBarColor ?? 0x000000;

    this.createSprites(config.sprites);

    if (this.animateChase) {
      this.startChaseAnimation();
      this.createFadeBars();
    }
  }

  private createSprites(spriteConfigs: ISpriteData[]): void {
    const totalWidth = spriteConfigs.length * this.spacing;
    const startX = -totalWidth / 2 + this.spacing / 2;

    spriteConfigs.forEach((spriteConfig, index) => {
      const x = startX + index * this.spacing;

      const sprite = this.scene.add.sprite(x, 0, spriteConfig.texture, spriteConfig.frame);

      if (spriteConfig.scale) {
        sprite.setScale(spriteConfig.scale);
      }

      if (spriteConfig.animation) {
        sprite.play(spriteConfig.animation);
      }

      this.sprites.push(sprite);
      this.container.add(sprite);

      // Initialize chase positions
      this.chasePositions.push(x);
    });
  }

  private startChaseAnimation(): void {
    const speed = gameConfig.menu.animation.chaseSpeed;
    const halfWidth = this.chaseWidth / 2;

    // Use scene update event for smooth animation
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60fps
      callback: () => {
        this.sprites.forEach((sprite, index) => {
          // Move sprite to the right
          this.chasePositions[index] += speed * 0.016; // deltaTime approximation

          // Wrap around when reaching the right edge
          if (this.chasePositions[index] > halfWidth) {
            this.chasePositions[index] = -halfWidth - this.spacing;
          }

          sprite.x = this.chasePositions[index];
        });
      },
      loop: true
    });
  }

  stopChaseAnimation(): void {
    if (this.updateEvent) {
      this.updateEvent.destroy();
      this.updateEvent = undefined;
    }
  }

  private createFadeBars(): void {
    const halfWidth = this.chaseWidth / 2;
    const barHeight = 80;
    const barWidth = this.fadeBarWidth + 20;

    // Left bar (solid, positioned at left edge of chase area)
    const leftBar = this.scene.add.graphics();
    leftBar.fillStyle(this.fadeBarColor, 1);
    leftBar.fillRect(-halfWidth - barWidth - (barWidth / 2), -barHeight / 2, barWidth, barHeight);
    this.container.add(leftBar);

    // Right bar (solid, positioned at right edge of chase area)
    const rightBar = this.scene.add.graphics();
    rightBar.fillStyle(this.fadeBarColor, 1);
    rightBar.fillRect(halfWidth - 20, -barHeight / 2, barWidth, barHeight);
    this.container.add(rightBar);

    // Set high depth so bars are on top of sprites
    leftBar.setDepth(100);
    rightBar.setDepth(100);
  }

  getSprites(): Phaser.GameObjects.Sprite[] {
    return this.sprites;
  }

  getWidth(): number {
    return this.chaseWidth;
  }

  getHeight(): number {
    if (this.sprites.length === 0) return 0;
    return Math.max(...this.sprites.map(s => s.displayHeight));
  }

  destroy(): void {
    this.stopChaseAnimation();
    super.destroy();
  }
}
