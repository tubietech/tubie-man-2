import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';

export interface IUIElements {
  scoreText: Phaser.GameObjects.Text;
  highScoreText: Phaser.GameObjects.Text;
  livesText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  powerText: Phaser.GameObjects.Text;
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
    level: number
  ): IUIElements {
    const loc = this.localization;

    if (orientation === Orientation.VERTICAL) {
      return this.createVerticalUI(mapOffsetX, mapOffsetY, mapWidth, mapHeight, score, lives, level, loc);
    } else {
      return this.createHorizontalUI(mapOffsetX, mapWidth, score, lives, level, loc);
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
    loc: LocalizationManager
  ): IUIElements {
    const scoreText = this.scene.add.text(mapOffsetX + 10, mapOffsetY + 10, `${loc.getText('score')}: ${score}`, {
      fontSize: '16px',
      color: '#fff'
    }).setScrollFactor(0);

    const highScoreText = this.scene.add.text(mapOffsetX + mapWidth / 2, mapOffsetY + 10, `${loc.getText('highScore')}: 0`, {
      fontSize: '16px',
      color: '#fff'
    }).setOrigin(0.5, 0).setScrollFactor(0);

    const levelText = this.scene.add.text(mapOffsetX + mapWidth - 10, mapOffsetY + 10, `${loc.getText('level')}: ${level}`, {
      fontSize: '16px',
      color: '#fff'
    }).setOrigin(1, 0).setScrollFactor(0);

    const livesText = this.scene.add.text(mapOffsetX + 10, mapOffsetY + mapHeight + 10, `${loc.getText('lives')}: ${lives}`, {
      fontSize: '16px',
      color: '#fff'
    }).setScrollFactor(0);

    const powerText = this.scene.add.text(mapOffsetX + mapWidth / 2, mapOffsetY + mapHeight + 10, `${loc.getText('power')}: ${loc.getText('powerReady')}`, {
      fontSize: '16px',
      color: '#00ff00'
    }).setOrigin(0.5, 0).setScrollFactor(0);

    return {
      scoreText,
      highScoreText,
      livesText,
      levelText,
      powerText
    };
  }

  private createHorizontalUI(
    mapOffsetX: number,
    mapWidth: number,
    score: number,
    lives: number,
    level: number,
    loc: LocalizationManager
  ): IUIElements {
    const uiX = mapOffsetX + mapWidth + 20;

    const scoreText = this.scene.add.text(uiX, 50, `${loc.getText('score')}:\n${score}`, {
      fontSize: '18px',
      color: '#fff',
      align: 'left'
    }).setScrollFactor(0);

    const highScoreText = this.scene.add.text(uiX, 120, `${loc.getText('highScore')}:\n0`, {
      fontSize: '18px',
      color: '#fff',
      align: 'left'
    }).setScrollFactor(0);

    const livesText = this.scene.add.text(uiX, 190, `${loc.getText('lives')}:\n${lives}`, {
      fontSize: '18px',
      color: '#fff',
      align: 'left'
    }).setScrollFactor(0);

    const levelText = this.scene.add.text(uiX, 260, `${loc.getText('level')}:\n${level}`, {
      fontSize: '18px',
      color: '#fff',
      align: 'left'
    }).setScrollFactor(0);

    const powerText = this.scene.add.text(uiX, 330, `${loc.getText('power')}:\n${loc.getText('powerReady')}`, {
      fontSize: '18px',
      color: '#00ff00',
      align: 'left'
    }).setScrollFactor(0);

    return {
      scoreText,
      highScoreText,
      livesText,
      levelText,
      powerText
    };
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
      powerText.setColor('#ff0000');
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerNone')}`
          : `${loc.getText('power')}:\n${loc.getText('powerNone')}`
      );
    } else if (fireActive) {
      powerText.setColor('#ffa500');
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerActive')}`
          : `${loc.getText('power')}:\n${loc.getText('powerActive')}`
      );
    } else {
      powerText.setColor('#00ff00');
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerReady')}`
          : `${loc.getText('power')}:\n${loc.getText('powerReady')}`
      );
    }
  }
}
