import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';

export class InstructionsMenu extends Menu {
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
    const baseMenuWidth = 400;
    const baseMenuHeight = 300;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    // Title (positioned relative to center)
    const title = new UIText(this.scene, {
      x: 0,
      y: -100,
      text: loc.getText('menuInstructions'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);

    // Placeholder text
    const placeholder = new UIText(this.scene, {
      x: 0,
      y: 0,
      text: loc.getText('helloWorld'),
      fontSize: '24px',
      color: gameConfig.menu.colors.labelText
    });
    this.addElement(placeholder);

    // Back button
    const backButton = new UIButton(this.scene, {
      x: 0,
      y: 100,
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
