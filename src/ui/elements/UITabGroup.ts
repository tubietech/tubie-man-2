import Phaser from 'phaser';
import { MenuItemType } from '../../enums/MenuItemType';
import { IUIElementConfig } from '../../interfaces/IUIElement';
import { INavigable, NavigationDirection } from '../../interfaces/INavigable';
import { UIElement } from './UIElement';
import { gameConfig } from '../../config/gameConfig';
import { colorNumberToString } from '../../utils/utils';

export interface ITabOption {
  label: string;
  value: string;
}

export interface IUITabGroupConfig extends IUIElementConfig {
  tabs: ITabOption[];
  selectedIndex?: number;
  onTabChange?: (value: string, index: number) => void;
  tabWidth?: number;
  tabHeight?: number;
  fontSize?: string;
}

interface TabData {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  hitArea: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

export class UITabGroup extends UIElement implements INavigable {
  readonly type = MenuItemType.BUTTON_GROUP; // Reuse existing type for now
  isFocused: boolean = false;
  selectedIndex: number;
  tabs: ITabOption[];
  onTabChange?: (value: string, index: number) => void;

  private tabElements: TabData[] = [];
  private tabWidth: number;
  private tabHeight: number;
  private totalWidth: number = 0;
  private fontSize: string;
  private onPointerEnterCallback?: () => void;

  constructor(scene: Phaser.Scene, config: IUITabGroupConfig) {
    super(scene, config);

    this.tabs = config.tabs;
    this.selectedIndex = config.selectedIndex ?? 0;
    this.onTabChange = config.onTabChange;
    this.tabWidth = config.tabWidth ?? 100;
    this.tabHeight = config.tabHeight ?? 35;
    this.fontSize = config.fontSize ?? '12px';

    this.createTabs();
    this.updateVisualSelection();
  }

  private createTabs(): void {
    const spacing = 5;
    const totalTabsWidth = this.tabs.length * this.tabWidth + (this.tabs.length - 1) * spacing;
    this.totalWidth = totalTabsWidth;

    // Calculate starting X to center the tab group
    const startX = -totalTabsWidth / 2 + this.tabWidth / 2;

    this.tabs.forEach((tab, index) => {
      const x = startX + index * (this.tabWidth + spacing);

      // Create background
      const background = this.scene.add.graphics();
      background.setPosition(x, 0);

      // Create invisible hit area for interaction
      const hitArea = this.scene.add.rectangle(x, 0, this.tabWidth, this.tabHeight);
      hitArea.setAlpha(0.001);

      const text = this.scene.add.text(x, 0, tab.label, {
        fontFamily: 'PressStart2P',
        fontSize: this.fontSize,
        color: '#ffffff'
      }).setOrigin(0.5);

      const tabContainer = this.scene.add.container(0, 0, [background, hitArea, text]);
      this.container.add(tabContainer);

      this.tabElements.push({ container: tabContainer, background, hitArea, text });

      // Click handler
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.select(index);
      });
      hitArea.on('pointerover', () => {
        if (this.onPointerEnterCallback) {
          this.onPointerEnterCallback();
        }
        if (index !== this.selectedIndex) {
          this.drawTabBackground(index, 0x333333, false);
        }
      });
      hitArea.on('pointerout', () => {
        this.updateTabVisual(index);
      });
    });
  }

  private drawTabBackground(index: number, fillColor: number, isSelected: boolean): void {
    const tab = this.tabElements[index];
    tab.background.clear();

    const cornerRadius = 8;
    const halfWidth = this.tabWidth / 2;
    const halfHeight = this.tabHeight / 2;

    // Draw tab shape (rounded top, flat bottom for selected, fully rounded for unselected)
    tab.background.fillStyle(fillColor, 1);

    if (isSelected) {
      // Selected tab: rounded top corners, flat bottom
      tab.background.fillRoundedRect(
        -halfWidth,
        -halfHeight,
        this.tabWidth,
        this.tabHeight + 2, // Extend slightly to cover the line
        { tl: cornerRadius, tr: cornerRadius, bl: 0, br: 0 }
      );

      // Draw border on top and sides only
      tab.background.lineStyle(2, gameConfig.menu.colors.buttonBorder, 1);
      tab.background.beginPath();
      tab.background.moveTo(-halfWidth, halfHeight + 2);
      tab.background.lineTo(-halfWidth, -halfHeight + cornerRadius);
      tab.background.arc(-halfWidth + cornerRadius, -halfHeight + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
      tab.background.lineTo(halfWidth - cornerRadius, -halfHeight);
      tab.background.arc(halfWidth - cornerRadius, -halfHeight + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
      tab.background.lineTo(halfWidth, halfHeight + 2);
      tab.background.strokePath();
    } else {
      // Unselected tab: slightly smaller, no bottom extension
      tab.background.fillRoundedRect(
        -halfWidth + 2,
        -halfHeight + 4,
        this.tabWidth - 4,
        this.tabHeight - 4,
        cornerRadius
      );
    }
  }

  select(index: number): void {
    if (index < 0 || index >= this.tabs.length) return;
    if (index === this.selectedIndex) return;

    this.selectedIndex = index;
    this.updateVisualSelection();

    if (this.onTabChange) {
      this.onTabChange(this.tabs[index].value, index);
    }
  }

  getSelectedValue(): string {
    return this.tabs[this.selectedIndex].value;
  }

  private updateVisualSelection(): void {
    this.tabElements.forEach((_, index) => {
      this.updateTabVisual(index);
    });
  }

  private updateTabVisual(index: number): void {
    const tab = this.tabElements[index];
    const isSelected = index === this.selectedIndex;

    if (isSelected) {
      tab.text.setColor(colorNumberToString(gameConfig.menu.colors.buttonSelectedText));
      this.drawTabBackground(index, gameConfig.menu.colors.buttonHighlight, true);
    } else {
      tab.text.setColor('#aaaaaa');
      this.drawTabBackground(index, 0x222222, false);
    }
  }

  focus(): void {
    this.isFocused = true;
    this.container.setAlpha(1);
  }

  blur(): void {
    this.isFocused = false;
    this.container.setAlpha(0.9);
  }

  handleNavigation(direction: NavigationDirection): boolean {
    if (direction === NavigationDirection.LEFT) {
      const newIndex = (this.selectedIndex - 1 + this.tabs.length) % this.tabs.length;
      this.select(newIndex);
      return true;
    }
    if (direction === NavigationDirection.RIGHT) {
      const newIndex = (this.selectedIndex + 1) % this.tabs.length;
      this.select(newIndex);
      return true;
    }
    return false; // Let parent handle UP/DOWN/SELECT
  }

  setOnPointerEnter(callback: () => void): void {
    this.onPointerEnterCallback = callback;
  }

  getWidth(): number {
    return this.totalWidth;
  }

  getHeight(): number {
    return this.tabHeight;
  }
}
