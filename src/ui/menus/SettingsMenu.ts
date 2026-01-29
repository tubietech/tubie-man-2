import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { Language } from '../../enums/Language';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';
import { UIButtonGroup } from '../elements/UIButtonGroup';
import { UIKeyBindingSetting } from '../elements/UIKeyBindingSetting';
import { UIToggleSetting } from '../elements/UIToggleSetting';
import { SettingsManager } from '../../utils/SettingsManager';
import { Orientation } from '../../enums/Orientation';

export class SettingsMenu extends Menu {
  readonly menuType = MenuType.SETTINGS;
  private localization: LocalizationManager;
  private settingsManager: SettingsManager;
  private onLanguageChange?: (language: Language) => void;

  constructor(scene: Phaser.Scene, orientation: Orientation) {
    super(scene, { type: MenuType.SETTINGS, orientation: orientation});
    this.localization = LocalizationManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.buildMenu();
  }

  setOnLanguageChange(callback: (language: Language) => void): void {
    this.onLanguageChange = callback;
  }

  private buildMenu(): void {
    const loc = this.localization;

    // Define base menu dimensions and apply responsive scaling
    const baseMenuWidth = 400;
    const baseMenuHeight = 810;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    let currentY = -330;
    const settingSpacing = 55;
    const settingWidth = 300;
    const settingHeight = 45;

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
    currentY += 60;

    // Movement key bindings
    const upBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingUp'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getUpBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setUpBinding(binding);
      }
    });
    this.addElement(upBinding);
    this.addNavigable(upBinding);
    currentY += settingSpacing;

    const downBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingDown'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getDownBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setDownBinding(binding);
      }
    });
    this.addElement(downBinding);
    this.addNavigable(downBinding);
    currentY += settingSpacing;

    const leftBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingLeft'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getLeftBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setLeftBinding(binding);
      }
    });
    this.addElement(leftBinding);
    this.addNavigable(leftBinding);
    currentY += settingSpacing;

    const rightBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingRight'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getRightBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setRightBinding(binding);
      }
    });
    this.addElement(rightBinding);
    this.addNavigable(rightBinding);
    currentY += settingSpacing;

    // Action key bindings
    const fireBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingFire'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getFireBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setFireBinding(binding);
      }
    });
    this.addElement(fireBinding);
    this.addNavigable(fireBinding);
    currentY += settingSpacing;

    const pauseBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingPause'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getPauseBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setPauseBinding(binding);
      }
    });
    this.addElement(pauseBinding);
    this.addNavigable(pauseBinding);
    currentY += settingSpacing;

    const continueBinding = new UIKeyBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingContinue'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getContinueBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setContinueBinding(binding);
      }
    });
    this.addElement(continueBinding);
    this.addNavigable(continueBinding);
    currentY += settingSpacing;

    // Arcade Mode toggle
    const arcadeToggle = new UIToggleSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingArcadeMode'),
      width: settingWidth,
      height: settingHeight,
      initialValue: this.settingsManager.isArcadeMode(),
      onLabel: loc.getText('on'),
      offLabel: loc.getText('off'),
      onValueChange: (value) => {
        this.settingsManager.setArcadeMode(value);
      }
    });
    this.addElement(arcadeToggle);
    this.addNavigable(arcadeToggle);
    currentY += 70;

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
