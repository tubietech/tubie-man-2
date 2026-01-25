export enum NavigationDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  SELECT = 'SELECT',
  BACK = 'BACK'
}

export type NavigationDirectionValue = `${NavigationDirection}`;

export interface INavigable {
  isFocused: boolean;

  focus(): void;
  blur(): void;
  handleNavigation(direction: NavigationDirection): boolean;
  onClick?: () => void;
  setOnPointerEnter?(callback: () => void): void;
}
