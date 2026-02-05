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
import { UIControllerBindingSetting } from '../elements/UIControllerBindingSetting';
import { UIToggleSetting } from '../elements/UIToggleSetting';
import { UISliderSetting } from '../elements/UISliderSetting';
import { UITabGroup } from '../elements/UITabGroup';
import { UIElement } from '../elements/UIElement';
import { SettingsManager } from '../../utils/SettingsManager';
import { Orientation } from '../../enums/Orientation';
import { INavigable } from '../../interfaces/INavigable';

type TabId = 'gameplay' | 'keyboard' | 'controller';

interface TabContent {
  elements: UIElement[];
  navigables: INavigable[];
}

export class SettingsMenu extends Menu {
  readonly menuType = MenuType.SETTINGS;
  private localization: LocalizationManager;
  private settingsManager: SettingsManager;
  private onLanguageChange?: (language: Language) => void;

  private tabGroup!: UITabGroup;
  private currentTab: TabId = 'gameplay';
  private tabContents: Map<TabId, TabContent> = new Map();
  private backButton!: UIButton;

  constructor(scene: Phaser.Scene, orientation: Orientation) {
    super(scene, { type: MenuType.SETTINGS, orientation: orientation });
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
    const baseMenuHeight = 650;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    let currentY = -280;

    // Title
    const title = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuSettings'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);
    currentY += 70;

    // Tab group
    this.tabGroup = new UITabGroup(this.scene, {
      x: 0,
      y: currentY,
      tabs: [
        { label: loc.getText('tabGameplay'), value: 'gameplay' },
        { label: loc.getText('tabKeyboard'), value: 'keyboard' },
        { label: loc.getText('tabController'), value: 'controller' }
      ],
      selectedIndex: 0,
      tabWidth: 110,
      tabHeight: 30,
      fontSize: '8px',
      onTabChange: (value) => {
        this.switchTab(value as TabId);
      }
    });
    this.addElement(this.tabGroup);
    this.addNavigable(this.tabGroup);
    currentY += 50;

    // Content area starts here
    const contentStartY = currentY;

    // Build content for each tab
    this.buildGameplayTab(contentStartY);
    this.buildKeyboardTab(contentStartY);
    this.buildControllerTab(contentStartY);

    // Back button (always visible, positioned after tab content)
    const backButtonY = 230;
    this.backButton = new UIButton(this.scene, {
      x: 0,
      y: backButtonY,
      text: loc.getText('menuBack'),
      onClick: () => {
        if (this.onBack) {
          this.onBack();
        }
      }
    });
    this.addElement(this.backButton);

    // Show initial tab
    this.switchTab('gameplay');
  }

  private buildGameplayTab(startY: number): void {
    const loc = this.localization;
    const elements: UIElement[] = [];
    const navigables: INavigable[] = [];

    let currentY = startY;
    const settingWidth = 300;
    const settingHeight = 45;

    // Language label
    const languageLabel = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('language'),
      fontSize: '16px',
      color: gameConfig.menu.colors.bodyText
    });
    elements.push(languageLabel);
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
    elements.push(languageGroup);
    navigables.push(languageGroup);
    this.addElement(languageGroup);
    currentY += 70;

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
    elements.push(arcadeToggle);
    navigables.push(arcadeToggle);
    this.addElement(arcadeToggle);
    currentY += 55;

    // Mute toggle
    const muteToggle = new UIToggleSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingMute'),
      width: settingWidth,
      height: settingHeight,
      initialValue: this.settingsManager.isMasterMuted(),
      onLabel: loc.getText('on'),
      offLabel: loc.getText('off'),
      onValueChange: (value) => {
        this.settingsManager.setMasterMuted(value);
      }
    });
    elements.push(muteToggle);
    navigables.push(muteToggle);
    this.addElement(muteToggle);
    currentY += 55;

    // Master Volume slider
    const volumeSlider = new UISliderSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingMasterVolume'),
      width: settingWidth,
      height: settingHeight,
      initialValue: this.settingsManager.getMasterVolume(),
      minValue: 0,
      maxValue: 1,
      step: 0.1,
      onValueChange: (value) => {
        this.settingsManager.setMasterVolume(value);
      }
    });
    elements.push(volumeSlider);
    navigables.push(volumeSlider);
    this.addElement(volumeSlider);

    this.tabContents.set('gameplay', { elements, navigables });
  }

  private buildKeyboardTab(startY: number): void {
    const loc = this.localization;
    const elements: UIElement[] = [];
    const navigables: INavigable[] = [];

    let currentY = startY;
    const settingSpacing = 50;
    const settingWidth = 300;
    const settingHeight = 40;

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
    elements.push(upBinding);
    navigables.push(upBinding);
    this.addElement(upBinding);
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
    elements.push(downBinding);
    navigables.push(downBinding);
    this.addElement(downBinding);
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
    elements.push(leftBinding);
    navigables.push(leftBinding);
    this.addElement(leftBinding);
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
    elements.push(rightBinding);
    navigables.push(rightBinding);
    this.addElement(rightBinding);
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
    elements.push(fireBinding);
    navigables.push(fireBinding);
    this.addElement(fireBinding);
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
    elements.push(pauseBinding);
    navigables.push(pauseBinding);
    this.addElement(pauseBinding);
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
    elements.push(continueBinding);
    navigables.push(continueBinding);
    this.addElement(continueBinding);

    this.tabContents.set('keyboard', { elements, navigables });
  }

  private buildControllerTab(startY: number): void {
    const loc = this.localization;
    const elements: UIElement[] = [];
    const navigables: INavigable[] = [];

    let currentY = startY;
    const settingSpacing = 50;
    const settingWidth = 300;
    const settingHeight = 40;

    // Movement controller bindings
    const upBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingUp'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadUpBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadUpBinding(binding);
      }
    });
    elements.push(upBinding);
    navigables.push(upBinding);
    this.addElement(upBinding);
    currentY += settingSpacing;

    const downBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingDown'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadDownBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadDownBinding(binding);
      }
    });
    elements.push(downBinding);
    navigables.push(downBinding);
    this.addElement(downBinding);
    currentY += settingSpacing;

    const leftBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingLeft'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadLeftBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadLeftBinding(binding);
      }
    });
    elements.push(leftBinding);
    navigables.push(leftBinding);
    this.addElement(leftBinding);
    currentY += settingSpacing;

    const rightBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingRight'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadRightBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadRightBinding(binding);
      }
    });
    elements.push(rightBinding);
    navigables.push(rightBinding);
    this.addElement(rightBinding);
    currentY += settingSpacing;

    // Action controller bindings
    const fireBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingFire'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadFireBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadFireBinding(binding);
      }
    });
    elements.push(fireBinding);
    navigables.push(fireBinding);
    this.addElement(fireBinding);
    currentY += settingSpacing;

    const pauseBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingPause'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadPauseBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadPauseBinding(binding);
      }
    });
    elements.push(pauseBinding);
    navigables.push(pauseBinding);
    this.addElement(pauseBinding);
    currentY += settingSpacing;

    const continueBinding = new UIControllerBindingSetting(this.scene, {
      x: 0,
      y: currentY,
      label: loc.getText('settingContinue'),
      width: settingWidth,
      height: settingHeight,
      initialBinding: this.settingsManager.getGamepadContinueBinding(),
      onBindingChange: (binding) => {
        this.settingsManager.setGamepadContinueBinding(binding);
      }
    });
    elements.push(continueBinding);
    navigables.push(continueBinding);
    this.addElement(continueBinding);

    this.tabContents.set('controller', { elements, navigables });
  }

  private switchTab(tabId: TabId): void {
    // Hide all tab contents
    for (const [id, content] of this.tabContents) {
      const visible = id === tabId;
      for (const element of content.elements) {
        element.setVisible(visible);
      }
    }

    // Update navigables list
    this.clearNavigables();
    this.addNavigable(this.tabGroup);

    // Add navigables for active tab
    const activeContent = this.tabContents.get(tabId);
    if (activeContent) {
      for (const navigable of activeContent.navigables) {
        this.addNavigable(navigable);
      }
    }

    // Add back button
    this.addNavigable(this.backButton);

    this.currentTab = tabId;
  }

  private getCurrentLanguageIndex(): number {
    const currentLang = this.localization.getLanguage();
    const languages = [Language.ENGLISH, Language.SPANISH, Language.FRENCH, Language.GERMAN];
    return languages.indexOf(currentLang);
  }
}
