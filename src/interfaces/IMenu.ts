import { MenuType } from '../enums/MenuType';
import { IUIElement } from './IUIElement';
import { INavigable } from './INavigable';

export interface IMenuConfig {
  type: MenuType;
  spacing?: number;
  padding?: number;
  centerX?: boolean;
}

export interface IMenu {
  readonly menuType: MenuType;
  elements: IUIElement[];
  navigableElements: INavigable[];
  focusedIndex: number;

  show(): void;
  hide(): void;
  destroy(): void;
  addElement(element: IUIElement): void;
  addNavigable(navigable: INavigable): void;
  focusNext(): void;
  focusPrevious(): void;
  activateFocused(): void;
}
