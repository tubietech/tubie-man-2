import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface IUITextConfig extends IUIElementConfig {
  text: string;
  fontSize?: string;
  color?: number;
  align?: 'left' | 'center' | 'right';
}

export class UIText extends UIElement {
  readonly type = MenuItemType.TEXT;
  private textObject: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: IUITextConfig) {
    super(scene, config);

    const fontSize = config.fontSize ?? '24px';
    const color = config.color ?? gameConfig.menu.colors.labelText;
    const align = config.align ?? 'center';

    this.textObject = scene.add.text(0, 0, config.text, {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: colorNumberToString(color),
      align: align
    });
    this.textObject.setOrigin(0.5);

    this.container.add(this.textObject);
  }

  setText(text: string): void {
    this.textObject.setText(text);
  }

  setColor(color: number): void {
    this.textObject.setColor(colorNumberToString(color));
  }

  getWidth(): number {
    return this.textObject.width;
  }

  getHeight(): number {
    return this.textObject.height;
  }
}
