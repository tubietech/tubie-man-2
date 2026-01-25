export interface ISelectableOption<T> {
  label: string;
  value: T;
}

export interface ISelectable<T> {
  selectedIndex: number;
  options: ISelectableOption<T>[];

  select(index: number): void;
  getSelectedValue(): T;
  onSelectionChange?: (value: T, index: number) => void;
}
