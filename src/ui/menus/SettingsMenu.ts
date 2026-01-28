import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { Language } from '../../enums/Language';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';
import { UIButtonGroup } from '../elements/UIButtonGroup';
import { Orientation } from '../../enums/Orientation';

export class SettingsMenu extends Menu {
  readonly menuType = MenuType.SETTINGS;
  private localization: LocalizationManager;
  private onLanguageChange?: (language: Language) => void;

  constructor(scene: Phaser.Scene, orientation: Orientation) {
    super(scene, { type: MenuType.SETTINGS, orientation: orientation});
    this.localization = LocalizationManager.getInstance();
    this.buildMenu();
  }

  setOnLanguageChange(callback: (language: Language) => void): void {
    this.onLanguageChange = callback;
  }

  private buildMenu(): void {
    const loc = this.localization;

    // Define base menu dimensions and apply responsive scaling
    const baseMenuWidth = 400;
    const baseMenuHeight = 350;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    let currentY = -120;

    // Title (positioned relative to center)
    const title = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuSettings'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);
    currentY += 80;

    // Language label
    const languageLabel = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('language'),
      fontSize: '16px',
      color: gameConfig.menu.colors.bodyText
    });
    this.addElement(languageLabel);
    currentY += 35;

    // Language button group
    const currentLangIndex = this.getCurrentLanguageIndex();
    const languageGroup = new UIButtonGroup<Language>(this.scene, {
      x: 0,
      y: currentY,
      options: [
        { label: 'EN', value: Language.ENGLISH },
        { label: 'ES', value: Language.SPANISH },
        { label: 'FR', value: Language.FRENCH },
        { label: 'DE', value: Language.GERMAN }
      ],
      selectedIndex: currentLangIndex,
      buttonWidth: 50,
      onSelectionChange: (value) => {
        if (this.onLanguageChange) {
          this.onLanguageChange(value);
        }
      },
      fontSize: '14px'
    });
    this.addElement(languageGroup);
    this.addNavigable(languageGroup);
    currentY += 80;

    // Back button
    const backButton = new UIButton(this.scene, {
      x: 0,
      y: currentY,
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

  private getCurrentLanguageIndex(): number {
    const currentLang = this.localization.getLanguage();
    const languages = [Language.ENGLISH, Language.SPANISH, Language.FRENCH, Language.GERMAN];
    return languages.indexOf(currentLang);
  }
}
