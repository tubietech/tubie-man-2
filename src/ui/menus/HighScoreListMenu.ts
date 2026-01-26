import Phaser from 'phaser';
import { Menu } from './Menu';
import { MenuType } from '../../enums/MenuType';
import { LocalizationManager } from '../../config/localization/LocalizationManager';
import { gameConfig } from '../../config/gameConfig';
import { UIText } from '../elements/UIText';
import { UIButton } from '../elements/UIButton';
import { UIButtonGroup } from '../elements/UIButtonGroup';
import { HighScoreManager } from '../../utils/HighScoreManager';
import { IHighScoreEntry } from '../../interfaces/IHighScore';
import { Difficulty } from '../../enums/Difficulty';
import { colorNumberToString } from '../../utils/utils';

export class HighScoreListMenu extends Menu {
  readonly menuType = MenuType.HIGH_SCORES;
  private localization: LocalizationManager;
  private selectedDifficulty: Difficulty = Difficulty.MEDIUM;
  private scoreListContainer: Phaser.GameObjects.Container | null = null;
  private noScoresText: UIText | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, { type: MenuType.HIGH_SCORES });
    this.localization = LocalizationManager.getInstance();
    this.buildMenu();
  }

  private buildMenu(): void {
    const loc = this.localization;

    // Define base menu dimensions and apply responsive scaling
    const baseMenuWidth = 450;
    const baseMenuHeight = 650;
    this.applyResponsiveScale(baseMenuWidth, baseMenuHeight);

    let currentY = -280;

    // Title
    const title = new UIText(this.scene, {
      x: 0,
      y: currentY,
      text: loc.getText('menuHighScores'),
      fontSize: '36px',
      color: gameConfig.menu.colors.titleText
    });
    this.addElement(title);
    currentY += 70;

    // Difficulty selector
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
        this.updateScoreList();
      },
      fontSize: '12px'
    });
    this.addElement(difficultyGroup);
    this.addNavigable(difficultyGroup);
    currentY += 60;

    // Column headers
    const headerY = currentY;
    this.createColumnHeaders(headerY);
    currentY += 40;

    // Score list container (will be populated dynamically)
    this.scoreListContainer = this.scene.add.container(0, currentY);
    this.container.add(this.scoreListContainer);

    // No scores text (hidden by default)
    this.noScoresText = new UIText(this.scene, {
      x: 0,
      y: currentY + 100,
      text: loc.getText('noScores'),
      fontSize: '16px',
      color: gameConfig.menu.colors.bodyText
    });
    this.noScoresText.setVisible(false);
    this.addElement(this.noScoresText);

    // Back button at bottom
    const backButton = new UIButton(this.scene, {
      x: 0,
      y: 250,
      text: loc.getText('menuBack'),
      onClick: () => {
        if (this.onBack) {
          this.onBack();
        }
      }
    });
    this.addElement(backButton);
    this.addNavigable(backButton);

    // Initial score list
    this.updateScoreList();
  }

  private createColumnHeaders(y: number): void {
    const loc = this.localization;
    const fontSize = '12px';
    const headerColor = gameConfig.menu.colors.labelText;

    // RANK column
    const rankHeader = this.scene.add.text(-180, y, loc.getText('rank'), {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: colorNumberToString(headerColor)
    });
    rankHeader.setOrigin(0, 0.5);
    this.container.add(rankHeader);

    // NAME column
    const nameHeader = this.scene.add.text(-100, y, loc.getText('name'), {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: colorNumberToString(headerColor)
    });
    nameHeader.setOrigin(0, 0.5);
    this.container.add(nameHeader);

    // SCORE column
    const scoreHeader = this.scene.add.text(80, y, loc.getText('score'), {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: colorNumberToString(headerColor)
    });
    scoreHeader.setOrigin(1, 0.5);
    this.container.add(scoreHeader);
  }

  private updateScoreList(): void {
    if (!this.scoreListContainer) return;

    // Clear existing entries
    this.scoreListContainer.removeAll(true);

    // Get scores for selected difficulty
    const scores = HighScoreManager.getHighScores(this.selectedDifficulty);

    if (scores.length === 0) {
      // Show "no scores" message
      this.noScoresText?.setVisible(true);
      return;
    }

    // Hide "no scores" message
    this.noScoresText?.setVisible(false);

    // Create score entries
    const rowHeight = 35;
    const fontSize = '14px';
    const textColor = colorNumberToString(gameConfig.menu.colors.buttonText);
    const highlightColor = colorNumberToString(gameConfig.menu.colors.buttonSelectedText);

    scores.forEach((entry: IHighScoreEntry, index: number) => {
      const y = index * rowHeight;
      const isTopThree = index < 3;
      const color = isTopThree ? highlightColor : textColor;

      // Rank
      const rankText = this.scene.add.text(-180, y, `${index + 1}.`, {
        fontFamily: 'PressStart2P',
        fontSize: fontSize,
        color: color
      });
      rankText.setOrigin(0, 0.5);
      this.scoreListContainer!.add(rankText);

      // Name
      const nameText = this.scene.add.text(-100, y, entry.name, {
        fontFamily: 'PressStart2P',
        fontSize: fontSize,
        color: color
      });
      nameText.setOrigin(0, 0.5);
      this.scoreListContainer!.add(nameText);

      // Score
      const scoreText = this.scene.add.text(80, y, entry.score.toLocaleString(), {
        fontFamily: 'PressStart2P',
        fontSize: fontSize,
        color: color
      });
      scoreText.setOrigin(1, 0.5);
      this.scoreListContainer!.add(scoreText);
    });
  }

  show(): void {
    super.show();
    // Refresh score list when menu is shown
    this.updateScoreList();
  }

  destroy(): void {
    if (this.scoreListContainer) {
      this.scoreListContainer.destroy();
      this.scoreListContainer = null;
    }
    super.destroy();
  }
}
