import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';
import { UIScrollableTextBlock } from '../elements/UIScrollableTextBlock';

export class AboutMenu extends Menu {
  readonly menuType = MenuType.ABOUT;
  private localization: LocalizationManager;

  constructor(scene: Phaser.Scene) {
    super(scene, { type: MenuType.ABOUT });
    this.localization = LocalizationManager.getInstance();
    this.buildMenu();
  }

  private buildMenu(): void {
    const loc = this.localization;

    // Define base menu dimensions and apply responsive scaling
    const baseMenuWidth = 450;
    const baseMenuHeight = 700;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    // Title (positioned relative to center, which is now 0,0 in container space)
    const title = new UIText(this.scene, {
      x: 0,
      y: -275,
      text: loc.getText('menuAbout'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);

    const aboutTextHeight = 450;

    const aboutText = new UIScrollableTextBlock(this.scene, {
      x: 0,
      y: -20,
      text: loc.getText('aboutSection'),
      width: baseMenuWidth,
      height: aboutTextHeight,
      fontSize: '16px'
    });
    this.addElement(aboutText);
    this.addNavigable(aboutText);

    // Set initial focus to the scrollable text (index 0)
    this.setInitialFocusIndex(0);

    // Back button
    const backButton = new UIButton(this.scene, {
      x: 0,
      y: aboutTextHeight / 2 + 50,
      text: loc.getText('menuBack'),
      onClick: () => {
        if (this.onBack) {
          this.onBack();
        }
      }
    });
    this.addElement(backButton);
    this.addNavigable(backButton);
  }
}
