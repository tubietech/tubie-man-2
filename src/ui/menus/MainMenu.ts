import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { Difficulty } from '../../enums/Difficulty';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';
import { UIButtonGroup } from '../elements/UIButtonGroup';
import { UISpriteGroup, ISpriteData } from '../elements/UISpriteGroup';
import { Orientation } from '../../enums/Orientation';
import { SettingsManager } from '../../utils/SettingsManager';

export class MainMenu extends Menu {
  readonly menuType = MenuType.MAIN;
  private localization: LocalizationManager;
  private selectedDifficulty: Difficulty = Difficulty.MEDIUM;

  // Callbacks
  private onStartGame?: (difficulty: Difficulty) => void;
  private onOpenSettings?: () => void;
  private onOpenAbout?: () => void;
  private onOpenInstructions?: () => void;
  private onOpenHighScores?: () => void;

  constructor(scene: Phaser.Scene, orientation: Orientation) {
    super(scene, { type: MenuType.MAIN, orientation });
    this.localization = LocalizationManager.getInstance();
    this.buildMenu();
  }

  setCallbacks(callbacks: {
    onStartGame?: (difficulty: Difficulty) => void;
    onOpenSettings?: () => void;
    onOpenAbout?: () => void;
    onOpenInstructions?: () => void;
    onOpenHighScores?: () => void;
  }): void {
    this.onStartGame = callbacks.onStartGame;
    this.onOpenSettings = callbacks.onOpenSettings;
    this.onOpenAbout = callbacks.onOpenAbout;
    this.onOpenInstructions = callbacks.onOpenInstructions;
    this.onOpenHighScores = callbacks.onOpenHighScores;
  }

  private buildMenu(): void {
    const loc = this.localization;

    // Define base menu dimensions and apply responsive scaling
    const baseMenuWidth = 400;
    const baseMenuHeight = 620;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    // All positions are now relative to center (0, 0)
    let currentY = -280;

    // Title
    const title = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('gameTitle'),
      fontSize: '48px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);
    currentY += 80;

    // Animated chase scene
    const chaseScene = this.createChaseScene(0, currentY);
    this.addElement(chaseScene);
    currentY += 80;

    // Difficulty label
    const difficultyLabel = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('selectDifficulty'),
      fontSize: '16px',
      color: gameConfig.menu.colors.bodyText
    });
    this.addElement(difficultyLabel);
    currentY += 35;

    // Difficulty button group
    const difficultyGroup = new UIButtonGroup<Difficulty>(this.scene, {
      x: 0,
      y: currentY,
      options: [
        { label: loc.getText('easy'), value: Difficulty.EASY },
        { label: loc.getText('medium'), value: Difficulty.MEDIUM },
        { label: loc.getText('hard'), value: Difficulty.HARD }
      ],
      selectedIndex: 1, // Default to medium
      onSelectionChange: (value) => {
        this.selectedDifficulty = value;
      },
      fontSize: '10px'
    });
    this.addElement(difficultyGroup);
    this.addNavigable(difficultyGroup);
    currentY += 70;

    // Play button
    const playButton = new UIButton(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuPlay'),
      onClick: () => {
        if (this.onStartGame) {
          this.onStartGame(this.selectedDifficulty);
        }
      }
    });
    this.addElement(playButton);
    this.addNavigable(playButton);
    currentY += 70;

    // Settings button - only show if not in arcade mode
    const isArcadeMode = SettingsManager.getInstance().isArcadeMode();
    if (!isArcadeMode) {
      const settingsButton = new UIButton(this.scene, {
        x: 0,
        y: currentY,
        text: loc.getText('menuSettings'),
        onClick: () => {
          if (this.onOpenSettings) {
            this.onOpenSettings();
          }
        }
      });
      this.addElement(settingsButton);
      this.addNavigable(settingsButton);
      currentY += 70;
    }

    // Instructions button
    const instructionsButton = new UIButton(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuInstructions'),
      onClick: () => {
        if (this.onOpenInstructions) {
          this.onOpenInstructions();
        }
      }
    });
    this.addElement(instructionsButton);
    this.addNavigable(instructionsButton);
    currentY += 70;

    // High Scores button
    const highScoresButton = new UIButton(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuHighScores'),
      onClick: () => {
        if (this.onOpenHighScores) {
          this.onOpenHighScores();
        }
      }
    });
    this.addElement(highScoresButton);
    this.addNavigable(highScoresButton);
    currentY += 70;

    // About button
    const aboutButton = new UIButton(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuAbout'),
      onClick: () => {
        if (this.onOpenAbout) {
          this.onOpenAbout();
        }
      }
    });
    this.addElement(aboutButton);
    this.addNavigable(aboutButton);
  }

  private createChaseScene(x: number, y: number): UISpriteGroup {
    // Scale down sprites for menu display
    const menuScaleFactor = 0.12;
    const spriteScale = gameConfig.player.spriteScale * menuScaleFactor;
    const enemyScale = gameConfig.enemy.spriteScale * menuScaleFactor;

    // Enemies chase Tubie Man (enemies first, player last)
    const sprites: ISpriteData[] = [
      // Enemy: Pokey
      {
        texture: 'atlas',
        frame: 'enemy1_right_frame_1.png',
        scale: enemyScale,
        animation: 'pokey_right'
      },
      // Enemy: Pricky
      {
        texture: 'atlas',
        frame: 'enemy2_right_frame_1.png',
        scale: enemyScale,
        animation: 'pricky_right'
      },
      // Enemy: Stingy
      {
        texture: 'atlas',
        frame: 'enemy3_right_frame_1.png',
        scale: enemyScale,
        animation: 'stingy_right'
      },
      // Enemy: Doc
      {
        texture: 'atlas',
        frame: 'enemy4_right_frame_1.png',
        scale: enemyScale,
        animation: 'doc_right'
      },
      // Player sprite (being chased - in front)
      {
        texture: 'atlas',
        frame: 'player_right_frame_1.png',
        scale: spriteScale,
        animation: 'player_right'
      }
    ];

    return new UISpriteGroup(this.scene, {
      x: x + 30,
      y: y,
      sprites: sprites,
      spacing: 70,
      animateChase: true,
      chaseWidth: 380
    });
  }

  getSelectedDifficulty(): Difficulty {
    return this.selectedDifficulty;
  }
}
