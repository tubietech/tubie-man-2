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
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Title
    const title = new UIText(this.scene, {
      x: centerX,
      y: centerY - 100,
      text: loc.getText('menuAbout'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);

    // Placeholder text
    // const placeholder = new UIText(this.scene, {
    //   x: centerX,
    //   y: centerY,
    //   text: loc.getText('helloWorld'),
    //   fontSize: '24px',
    //   color: gameConfig.menu.colors.labelText
    // });
    // this.addElement(placeholder);

    const aboutTextHeight = 500;

    const aboutText = new UIScrollableTextBlock(this.scene, {
      x: centerX,
      y: centerY - 50,
      text: loc.getText('aboutSection'),
      width: 450,
      height: aboutTextHeight,
      fontSize: '14px'
      // color?: number;
      // lineSpacing?: number;
      // scrollSpeed?: number;
    });
    this.addElement(aboutText);

    // Back button
    const backButton = new UIButton(this.scene, {
      x: centerX,
      y: centerY + (aboutTextHeight / 2),
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
