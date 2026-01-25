import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElement, IUIElementConfig } from '../../interfaces/IUIElement';

export abstract class UIElement implements IUIElement {
  abstract readonly type: MenuItemType;
  protected scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  protected config: IUIElementConfig;

  constructor(scene: Phaser.Scene, config: IUIElementConfig) {
    this.scene = scene;
    this.config = {
      originX: 0.5,
      originY: 0.5,
      visible: true,
      ...config
    };
    this.container = scene.add.container(config.x, config.y);
    this.container.setVisible(this.config.visible!);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.config.x = x;
    this.config.y = y;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
    this.config.visible = visible;
  }

  abstract getWidth(): number;
  abstract getHeight(): number;

  destroy(): void {
    this.container.destroy();
  }
}
