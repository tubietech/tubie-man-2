import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { colorNumberToString } from '../utils/utils';

export interface IUIElements {
  scoreText: Phaser.GameObjects.Text;
  highScoreText: Phaser.GameObjects.Text;
  livesText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  powerText: Phaser.GameObjects.Text;
  pauseButton: Phaser.GameObjects.Container;
}

export class UIRenderer {
  private scene: Phaser.Scene;
  private localization: LocalizationManager;

  constructor(scene: Phaser.Scene, localization: LocalizationManager) {
    this.scene = scene;
    this.localization = localization;
  }

  createUI(
    orientation: Orientation,
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    mapHeight: number,
    score: number,
    lives: number,
    level: number,
    onPauseClick?: () => void
  ): IUIElements {
    const loc = this.localization;

    if (orientation === Orientation.VERTICAL) {
      return this.createVerticalUI(mapOffsetX, mapOffsetY, mapWidth, mapHeight, score, lives, level, loc, onPauseClick);
    } else {
      return this.createHorizontalUI(mapOffsetX, mapOffsetY, mapWidth, mapHeight, score, lives, level, loc, onPauseClick);
    }
  }

  private createVerticalUI(
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    mapHeight: number,
    score: number,
    lives: number,
    level: number,
    loc: LocalizationManager,
    onPauseClick?: () => void
  ): IUIElements {
    const uiTextColor = colorNumberToString(gameConfig.colors.gameUiText);

    const scoreText = this.scene.add.text(mapOffsetX + 10, mapOffsetY + 10, `${loc.getText('score')}: ${score}`, {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: uiTextColor
    }).setScrollFactor(0);

    const highScoreText = this.scene.add.text(mapOffsetX + mapWidth / 2, mapOffsetY + 10, `${loc.getText('highScore')}: 0`, {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: uiTextColor
    }).setOrigin(0.5, 0).setScrollFactor(0);

    const levelText = this.scene.add.text(mapOffsetX + mapWidth - 10, mapOffsetY + 10, `${loc.getText('level')}: ${level}`, {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: uiTextColor
    }).setOrigin(1, 0).setScrollFactor(0);

    const livesText = this.scene.add.text(mapOffsetX + 10, mapOffsetY + mapHeight + 10, `${loc.getText('lives')}: ${lives}`, {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: uiTextColor
    }).setScrollFactor(0);

    const powerText = this.scene.add.text(mapOffsetX + mapWidth / 2, mapOffsetY + mapHeight + 10, `${loc.getText('power')}: ${loc.getText('powerReady')}`, {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: colorNumberToString(gameConfig.colors.powerupReady)
    }).setOrigin(0.5, 0).setScrollFactor(0);

    // Create pause button - positioned off the map, on the right side (vertical layout doesn't have right panel)
    // So we position it at the far right edge of the screen
    const pauseButton = this.createPauseButton(
      this.scene.cameras.main.width - 40,
      mapOffsetY - 30,
      onPauseClick
    );

    return {
      scoreText,
      highScoreText,
      livesText,
      levelText,
      powerText,
      pauseButton
    };
  }

  private createHorizontalUI(
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    _mapHeight: number,
    score: number,
    lives: number,
    level: number,
    loc: LocalizationManager,
    onPauseClick?: () => void
  ): IUIElements {
    const uiX = mapOffsetX + mapWidth + 20;
    const uiTextColor = colorNumberToString(gameConfig.colors.gameUiText);

    const scoreText = this.scene.add.text(uiX, 70, `${loc.getText('score')}:\n${score}`, {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: uiTextColor,
      align: 'left'
    }).setScrollFactor(0);

    const highScoreText = this.scene.add.text(uiX, 140, `${loc.getText('highScore')}:\n0`, {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: uiTextColor,
      align: 'left'
    }).setScrollFactor(0);

    const livesText = this.scene.add.text(uiX, 210, `${loc.getText('lives')}:\n${lives}`, {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: uiTextColor,
      align: 'left'
    }).setScrollFactor(0);

    const levelText = this.scene.add.text(uiX, 280, `${loc.getText('level')}:\n${level}`, {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: uiTextColor,
      align: 'left'
    }).setScrollFactor(0);

    const powerText = this.scene.add.text(uiX, 350, `${loc.getText('power')}:\n${loc.getText('powerReady')}`, {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: colorNumberToString(gameConfig.colors.powerupReady),
      align: 'left'
    }).setScrollFactor(0);

    // Create pause button above the score text in the right panel
    const pauseButton = this.createPauseButton(
      uiX + 70,
      mapOffsetY + 20,
      onPauseClick
    );

    return {
      scoreText,
      highScoreText,
      livesText,
      levelText,
      powerText,
      pauseButton
    };
  }

  private createPauseButton(x: number, y: number, onClick?: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(100);

    // Button background (circular)
    const background = this.scene.add.circle(0, 0, 25, gameConfig.colors.pauseButtonNormal);
    background.setStrokeStyle(2, gameConfig.colors.pauseButtonBorder);

    // Pause icon (two vertical bars)    
    const iconColor = gameConfig.colors.pauseButtonIcon;
    const bar1 = this.scene.add.rectangle(-8, 0, 6, 20, iconColor);
    const bar2 = this.scene.add.rectangle(8, 0, 6, 20, iconColor);

    container.add([background, bar1, bar2]);

    // Make interactive
    background.setInteractive({ useHandCursor: true });

    // Hover effects
    background.on('pointerover', () => {
      background.setFillStyle(gameConfig.colors.pauseButtonHighlight);
    });

    background.on('pointerout', () => {
      background.setFillStyle(gameConfig.colors.pauseButtonNormal);
    });

    // Click handler
    if (onClick) {
      background.on('pointerdown', onClick);
    }

    return container;
  }

  updateScoreText(scoreText: Phaser.GameObjects.Text, orientation: Orientation, score: number): void {
    const loc = this.localization;
    scoreText.setText(
      orientation === Orientation.VERTICAL
        ? `${loc.getText('score')}: ${score}`
        : `${loc.getText('score')}:\n${score}`
    );
  }

  updateLivesText(livesText: Phaser.GameObjects.Text, orientation: Orientation, lives: number): void {
    const loc = this.localization;
    livesText.setText(
      orientation === Orientation.VERTICAL
        ? `${loc.getText('lives')}: ${lives}`
        : `${loc.getText('lives')}:\n${lives}`
    );
  }

  updatePowerText(powerText: Phaser.GameObjects.Text, orientation: Orientation, hasFirePower: boolean, fireActive: boolean): void {
    // Safety check: ensure text object is still active and not destroyed
    if (!powerText || !powerText.active || !powerText.scene) {
      return;
    }

    const loc = this.localization;

    if (!hasFirePower && !fireActive) {
      powerText.setColor(colorNumberToString(gameConfig.colors.powerupNotReady));
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerNone')}`
          : `${loc.getText('power')}:\n${loc.getText('powerNone')}`
      );
    } else if (fireActive) {
      powerText.setColor(colorNumberToString(gameConfig.colors.powerupActive));
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerActive')}`
          : `${loc.getText('power')}:\n${loc.getText('powerActive')}`
      );
    } else {
      powerText.setColor(colorNumberToString(gameConfig.colors.powerupReady));
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerReady')}`
          : `${loc.getText('power')}:\n${loc.getText('powerReady')}`
      );
    }
  }
}
