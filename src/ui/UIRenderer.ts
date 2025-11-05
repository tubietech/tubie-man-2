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
  durationPieChart?: Phaser.GameObjects.Graphics;
  cooldownBar?: Phaser.GameObjects.Graphics;
  cooldownBarBg?: Phaser.GameObjects.Graphics;
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

    // Create pie chart for duration indicator (hidden initially)
    const durationPieChart = this.scene.add.graphics();
    durationPieChart.setScrollFactor(0);
    durationPieChart.setVisible(false);

    // Create cooldown bar background (hidden initially)
    const cooldownBarBg = this.scene.add.graphics();
    cooldownBarBg.setScrollFactor(0);
    cooldownBarBg.setVisible(false);

    // Create cooldown bar (hidden initially)
    const cooldownBar = this.scene.add.graphics();
    cooldownBar.setScrollFactor(0);
    cooldownBar.setVisible(false);

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
      pauseButton,
      durationPieChart,
      cooldownBar,
      cooldownBarBg
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

    // Create pie chart for duration indicator (hidden initially)
    const durationPieChart = this.scene.add.graphics();
    durationPieChart.setScrollFactor(0);
    durationPieChart.setVisible(false);

    // Create cooldown bar background (hidden initially)
    const cooldownBarBg = this.scene.add.graphics();
    cooldownBarBg.setScrollFactor(0);
    cooldownBarBg.setVisible(false);

    // Create cooldown bar (hidden initially)
    const cooldownBar = this.scene.add.graphics();
    cooldownBar.setScrollFactor(0);
    cooldownBar.setVisible(false);

    // Create pause button above the score text in the right panel, centered with the text
    const pauseButton = this.createPauseButton(
      scoreText.x + scoreText.width / 2,
      mapOffsetY + 35,
      onPauseClick
    );

    return {
      scoreText,
      highScoreText,
      livesText,
      levelText,
      powerText,
      pauseButton,
      durationPieChart,
      cooldownBar,
      cooldownBarBg
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

  updatePowerText(
    powerText: Phaser.GameObjects.Text,
    orientation: Orientation,
    hasFirePower: boolean,
    fireActive: boolean,
    remainingDuration: number = 0,
    fireCooldown: number = 0,
    durationPieChart?: Phaser.GameObjects.Graphics,
    cooldownBar?: Phaser.GameObjects.Graphics,
    cooldownBarBg?: Phaser.GameObjects.Graphics,
    mapOffsetX?: number,
    mapOffsetY?: number,
    mapWidth?: number,
    mapHeight?: number,
    difficulty: string = 'medium'
  ): void {
    // Safety check: ensure text object is still active and not destroyed
    if (!powerText || !powerText.active || !powerText.scene) {
      return;
    }

    const loc = this.localization;

    if (!hasFirePower && !fireActive) {
      // Hide power text when no powerup is available
      powerText.setVisible(false);

      // Hide visual indicators
      if (durationPieChart) durationPieChart.setVisible(false);
      if (cooldownBar) cooldownBar.setVisible(false);
      if (cooldownBarBg) cooldownBarBg.setVisible(false);
    } else if (fireActive) {
      powerText.setVisible(true);
      powerText.setColor(colorNumberToString(gameConfig.colors.powerupActive));
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerActive')}`
          : `${loc.getText('power')}:\n${loc.getText('powerActive')}`
      );

      // Show and update pie chart for remaining duration
      if (durationPieChart && mapOffsetX !== undefined && mapOffsetY !== undefined && mapWidth !== undefined && mapHeight !== undefined) {
        durationPieChart.setVisible(true);
        durationPieChart.clear();

        const radius = 15; // Pie chart radius
        let centerX: number;
        let centerY: number;

        if (orientation === Orientation.VERTICAL) {
          centerX = mapOffsetX + mapWidth / 2;
          centerY = mapOffsetY + mapHeight + 40;
        } else {
          // Center horizontally based on text position and width
          const textWidth = powerText.width;
          centerX = powerText.x + textWidth / 2;
          centerY = powerText.y + powerText.height + 25;
        }

        // Calculate the percentage of duration remaining
        const totalDuration = gameConfig.player.powerup.v2.duration;
        const percentage = remainingDuration / totalDuration;

        // Draw background circle (outline)
        durationPieChart.lineStyle(2, gameConfig.colors.powerupActive, 1);
        durationPieChart.strokeCircle(centerX, centerY, radius);

        // Draw filled pie chart (starts at top, goes clockwise)
        if (percentage > 0) {
          durationPieChart.fillStyle(gameConfig.colors.powerupActive, 0.7);
          durationPieChart.beginPath();
          durationPieChart.moveTo(centerX, centerY);
          durationPieChart.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (percentage * Math.PI * 2), false);
          durationPieChart.closePath();
          durationPieChart.fillPath();
        }
      }

      // Update cooldown bar
      if (cooldownBar && cooldownBarBg && mapOffsetX !== undefined && mapOffsetY !== undefined && mapWidth !== undefined && mapHeight !== undefined) {
        const barWidth = 100;
        const barHeight = 8;
        let barX: number;
        let barY: number;

        if (orientation === Orientation.VERTICAL) {
          barX = mapOffsetX + mapWidth / 2 - barWidth / 2;
          barY = mapOffsetY + mapHeight + 60;
        } else {
          // Center horizontally based on text position and width
          const textWidth = powerText.width;
          barX = powerText.x + textWidth / 2 - barWidth / 2;
          barY = powerText.y + powerText.height + 58;
        }

        // Show bars
        cooldownBarBg.setVisible(true);
        cooldownBar.setVisible(true);

        // Draw background
        cooldownBarBg.clear();
        cooldownBarBg.fillStyle(0x333333, 0.5);
        cooldownBarBg.fillRect(barX, barY, barWidth, barHeight);

        // Draw cooldown fill (fills from left to right as cooldown decreases)
        const fireRateDelay = gameConfig.player.powerup.v2.fireRateDelay[difficulty as keyof typeof gameConfig.player.powerup.v2.fireRateDelay];
        const cooldownProgress = fireCooldown > 0 ? 1 - (fireCooldown / fireRateDelay) : 1;
        const fillWidth = barWidth * cooldownProgress;

        cooldownBar.clear();
        cooldownBar.fillStyle(gameConfig.colors.powerupActive, 1);
        cooldownBar.fillRect(barX, barY, fillWidth, barHeight);
      }
    } else {
      powerText.setVisible(true);
      powerText.setColor(colorNumberToString(gameConfig.colors.powerupReady));
      powerText.setText(
        orientation === Orientation.VERTICAL
          ? `${loc.getText('power')}: ${loc.getText('powerReady')}`
          : `${loc.getText('power')}:\n${loc.getText('powerReady')}`
      );

      // Hide visual indicators
      if (durationPieChart) durationPieChart.setVisible(false);
      if (cooldownBar) cooldownBar.setVisible(false);
      if (cooldownBarBg) cooldownBarBg.setVisible(false);
    }
  }
}
