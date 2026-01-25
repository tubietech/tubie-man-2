import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { UIElement } from './UIElement';

export interface IUISpriteConfig extends IUIElementConfig {
  texture: string;
  frame?: string | number;
  scale?: number;
  animation?: string;
}

export class UISprite extends UIElement {
  readonly type = MenuItemType.SPRITE;
  private sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, config: IUISpriteConfig) {
    super(scene, config);

    this.sprite = scene.add.sprite(0, 0, config.texture, config.frame);

    if (config.scale) {
      this.sprite.setScale(config.scale);
    }

    if (config.animation) {
      this.sprite.play(config.animation);
    }

    this.container.add(this.sprite);
  }

  playAnimation(key: string): void {
    this.sprite.play(key);
  }

  stopAnimation(): void {
    this.sprite.stop();
  }

  setFrame(frame: string | number): void {
    this.sprite.setFrame(frame);
  }

  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  getWidth(): number {
    return this.sprite.displayWidth;
  }

  getHeight(): number {
    return this.sprite.displayHeight;
  }
}
