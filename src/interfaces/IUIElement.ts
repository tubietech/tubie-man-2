import Phaser from 'phaser';
import { MenuItemType } from '../enums/MenuItemType';

export interface IUIElementConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  originX?: number;
  originY?: number;
  visible?: boolean;
}

export interface IUIElement {
  readonly type: MenuItemType;
  container: Phaser.GameObjects.Container;

  setPosition(x: number, y: number): void;
  setVisible(visible: boolean): void;
  getWidth(): number;
  getHeight(): number;
  destroy(): void;
}
