import Phaser from 'phaser';
import { Orientation } from '../enums/Orientation';
import { LocalizationManager } from '../config/localization/LocalizationManager';
import { gameConfig } from '../config/gameConfig';
import { colorNumberToString } from '../utils/utils';

export interface IUIElements {
  scoreText: Phaser.GameObjects.Container;
  highScoreText: Phaser.GameObjects.Container;
  livesText: Phaser.GameObjects.Container;
  livesSprites: Phaser.GameObjects.Sprite[];
  levelText: Phaser.GameObjects.Container;
  levelSprites: Phaser.GameObjects.Sprite[];
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

  private createLabelValueText(
    x: number,
    y: number,
    label: string,
    value: string | number,
    fontSize: string,
    originX: number = 0,
    originY: number = 0,
    separator: string = ': '
  ): Phaser.GameObjects.Container {
    const uiTextColor = colorNumberToString(gameConfig.colors.gameUiText);
    const uiValueColor = colorNumberToString(gameConfig.colors.gameUiValue);

    // Create label text
    const labelText = this.scene.add.text(0, 0, label + separator, {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: uiTextColor
    });

    // Create value text positioned after label
    const valueText = this.scene.add.text(labelText.width, 0, String(value), {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: uiValueColor
    });

    // Create container
    const container = this.scene.add.container(x, y, [labelText, valueText]);
    container.setScrollFactor(0);

    // Calculate total width and height for origin
    const totalWidth = labelText.width + valueText.width;
    const totalHeight = Math.max(labelText.height, valueText.height);

    // Adjust position based on origin
    if (originX !== 0 || originY !== 0) {
      container.x -= totalWidth * originX;
      container.y -= totalHeight * originY;
    }

    // Add custom methods to update text
    (container as any).updateValue = (newValue: string | number) => {
      valueText.setText(String(newValue));
    };

    (container as any).updateLabelAndValue = (newLabel: string, newValue: string | number, newSeparator: string = separator) => {
      labelText.setText(newLabel + newSeparator);
      valueText.setText(String(newValue));
      valueText.x = labelText.width;
    };

    // Store reference to label text for external access
    (container as any).labelText = labelText;
    (container as any).valueText = valueText;

    return container;
  }

  private createLabelValueTextVertical(
    x: number,
    y: number,
    label: string,
    value: string | number,
    fontSize: string,
    originX: number = 0,
    originY: number = 0
  ): Phaser.GameObjects.Container {
    const uiTextColor = colorNumberToString(gameConfig.colors.gameUiText);
    const uiValueColor = colorNumberToString(gameConfig.colors.gameUiValue);

    // Create label text
    const labelText = this.scene.add.text(0, 0, label + ':', {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: uiTextColor,
      align: 'left'
    });

    // Create value text positioned below label
    const valueText = this.scene.add.text(0, labelText.height, String(value), {
      fontFamily: 'PressStart2P',
      fontSize: fontSize,
      color: uiValueColor,
      align: 'left'
    });

    // Create container
    const container = this.scene.add.container(x, y, [labelText, valueText]);
    container.setScrollFactor(0);

    // Calculate total width and height for origin
    const totalWidth = Math.max(labelText.width, valueText.width);
    const totalHeight = labelText.height + valueText.height;

    // Adjust position based on origin
    if (originX !== 0 || originY !== 0) {
      container.x -= totalWidth * originX;
      container.y -= totalHeight * originY;
    }

    // Add custom methods to update text
    (container as any).updateValue = (newValue: string | number) => {
      valueText.setText(String(newValue));
    };

    (container as any).updateLabelAndValue = (newLabel: string, newValue: string | number) => {
      labelText.setText(newLabel + ':');
      valueText.setText(String(newValue));
      valueText.y = labelText.height;
    };

    // Store reference to label text for external access
    (container as any).labelText = labelText;
    (container as any).valueText = valueText;

    return container;
  }

  private createLivesSprites(
    x: number,
    y: number,
    currentLives: number,
    difficulty: string,
    spriteScale: number = 1.5,
    spacing: number = 5
  ): Phaser.GameObjects.Sprite[] {
    const sprites: Phaser.GameObjects.Sprite[] = [];
    const maxLives = gameConfig.player.startLives[difficulty as keyof typeof gameConfig.player.startLives];

    for (let i = 0; i < maxLives; i++) {
      const sprite = this.scene.add.sprite(
        x + (i * (16 * spriteScale + spacing)),
        y,
        'atlas',
        'player_right_frame_2.png'
      );
      sprite.setScale(spriteScale * 0.15);
      sprite.setScrollFactor(0);
      sprite.setOrigin(0, 0);
      // Only show sprites up to currentLives count
      sprite.setVisible(i < currentLives);
      sprites.push(sprite);
    }

    return sprites;
  }

  private createLevelSprites(
    x: number,
    y: number,
    level: number,
    spritesPerRow: number,
    spriteScale: number = 1.5,
    spacing: number = 5
  ): Phaser.GameObjects.Sprite[] {

    const sprites = gameConfig.map.bonus.sprites;

    const levelSprites: Phaser.GameObjects.Sprite[] = [];

    for (let i = 0; i < sprites.length; i++) {
      const row = Math.floor(i / spritesPerRow);
      const col = i % spritesPerRow;
      const sprite = this.scene.add.sprite(
        x + (col * (16 * spriteScale + spacing)),
        y + (row * (16 * spriteScale + spacing * 1.5)), // Increased vertical spacing as most sprites have padding on the sides, but not top and bottom
        'atlas',
        sprites[i]
      );

      sprite.setScale(spriteScale * 0.15);
      sprite.setScrollFactor(0);
      sprite.setOrigin(0, 0);
      sprite.setVisible(i < level); // Show only the first level sprite initially
      levelSprites.push(sprite);
    }

    return levelSprites;
  }

  createUI(
    orientation: Orientation,
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    mapHeight: number,
    score: number,
    level: number,
    highScore: number,
    onPauseClick?: () => void,
    lives?: number,
    difficulty: string = 'medium'
  ): IUIElements {
    const loc = this.localization;
    const currentLives = lives ?? gameConfig.player.startLives[difficulty as keyof typeof gameConfig.player.startLives];

    if (orientation === Orientation.VERTICAL) {
      return this.createVerticalUI(mapOffsetX, mapOffsetY, mapWidth, mapHeight, score, level, highScore, loc, onPauseClick, currentLives, difficulty);
    } else {
      return this.createHorizontalUI(mapOffsetX, mapOffsetY, mapWidth, mapHeight, score, level, highScore, loc, onPauseClick, currentLives, difficulty);
    }
  }

  private createVerticalUI(
    mapOffsetX: number,
    mapOffsetY: number,
    mapWidth: number,
    mapHeight: number,
    score: number,
    level: number,
    highScore: number,
    loc: LocalizationManager,
    onPauseClick?: () => void,
    currentLives?: number,
    difficulty: string = 'medium'
  ): IUIElements {
    const scoreText = this.createLabelValueTextVertical(
      mapOffsetX + 25,
      mapOffsetY - 40,
      loc.getText('score'),
      score,
      '16px',
      0,
      0
    );
  
    const highScoreText = this.createLabelValueTextVertical(
      mapOffsetX + 80,
      mapOffsetY - 80,
      loc.getText('highScore'),
      highScore,
      '16px',
      0.5,
      0
    );

    const livesSprites = this.createLivesSprites(
      mapOffsetX + mapWidth * 2 / 3 - 50,
      mapOffsetY - 50,
      currentLives ?? gameConfig.player.startLives[difficulty as keyof typeof gameConfig.player.startLives],
      difficulty,
      1,
      15
    );

    const levelText = this.createLabelValueText(
      mapOffsetX + mapWidth / 4 + 40,
      mapOffsetY + mapHeight + 5,
      loc.getText('level'),
      level,
      '16px',
      1,
      0
    );

    const levelSprites = this.createLevelSprites(
      mapOffsetX - 5,
      mapOffsetY + mapHeight + 30,
      level,
      12,
      0.8,
      15
    );

    // Create container for lives label (for compatibility with existing code)
    const livesText = this.scene.add.container(mapOffsetX + 10, mapOffsetY + mapHeight + 10, []);
    livesText.setScrollFactor(0);

    const powerText = this.scene.add.text(
      mapOffsetX + mapWidth * 2 / 3 + 30,
      mapOffsetY + mapHeight + 5,
      `${loc.getText('power')}: ${loc.getText('powerReady')}`,
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: colorNumberToString(gameConfig.colors.powerupReady)
      }
    ).setOrigin(0.5, 0).setScrollFactor(0);

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
      livesSprites,
      levelText,
      levelSprites,
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
    level: number,
    highScore: number,
    loc: LocalizationManager,
    onPauseClick?: () => void,
    currentLives?: number,
    difficulty: string = 'medium'
  ): IUIElements {
    const uiX = mapOffsetX + mapWidth + 20;

    const scoreText = this.createLabelValueTextVertical(
      uiX,
      70,
      loc.getText('score'),
      score,
      '18px',
      0,
      0
    );

    const highScoreText = this.createLabelValueTextVertical(
      uiX,
      140,
      loc.getText('highScore'),
      highScore,
      '18px',
      0,
      0
    );

    const livesText = this.createLabelValueTextVertical(
      uiX,
      210,
      loc.getText('lives'),
      '',
      '18px',
      0,
      0
    );

    const livesSprites = this.createLivesSprites(
      uiX - 10,
      230,
      currentLives ?? gameConfig.player.startLives[difficulty as keyof typeof gameConfig.player.startLives],
      difficulty,
      1,
      15
    );

    const levelText = this.createLabelValueTextVertical(
      uiX,
      280,
      loc.getText('level'),
      level,
      '18px',
      0,
      0
    );

    const levelSprites = this.createLevelSprites(
      uiX - 10,
      330,
      level,
      4,
      0.8,
      15
    );

    const powerText = this.scene.add.text(uiX, 450, `${loc.getText('power')}:\n${loc.getText('powerReady')}`, {
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

    // Create pause button above the score text in the right panel, centered with the label text
    const scoreLabelText = (scoreText as any).labelText;
    const pauseButton = this.createPauseButton(
      scoreText.x + scoreLabelText.width / 2,
      mapOffsetY + 35,
      onPauseClick
    );

    return {
      scoreText,
      highScoreText,
      livesText,
      livesSprites,
      levelText,
      levelSprites,
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
    const background = this.scene.add.circle(0, 0, 25, gameConfig.menu.colors.buttonNormal);
    background.setStrokeStyle(gameConfig.menu.layout.borderThickness, gameConfig.menu.colors.buttonBorder);

    // Pause icon (two vertical bars)    
    const iconColor = gameConfig.menu.colors.buttonText;
    const bar1 = this.scene.add.rectangle(-8, 0, 6, 20, iconColor);
    const bar2 = this.scene.add.rectangle(8, 0, 6, 20, iconColor);

    container.add([background, bar1, bar2]);

    // Make interactive
    background.setInteractive({ useHandCursor: true });

    // Hover effects
    background.on('pointerover', () => {
      background.setFillStyle(gameConfig.menu.colors.buttonHighlight);
    });

    background.on('pointerout', () => {
      background.setFillStyle(gameConfig.menu.colors.buttonNormal);
    });

    // Click handler
    if (onClick) {
      background.on('pointerdown', onClick);
    }

    return container;
  }

  updateScoreText(scoreText: Phaser.GameObjects.Container, _orientation: Orientation, score: number): void {
    (scoreText as any).updateValue(score);
  }

  updateLivesText(livesText: Phaser.GameObjects.Container, _orientation: Orientation, lives: number): void {
    (livesText as any).updateValue(lives);
  }
  
  updateLivesSprites(livesSprites: Phaser.GameObjects.Sprite[], _orientation: Orientation, lives: number): void {
      if(!!livesSprites[lives]) livesSprites[lives].setVisible(false);
  }

  updateHighScoreText(highScoreText: Phaser.GameObjects.Container, _orientation: Orientation, highScore: number): void {
    (highScoreText as any).updateValue(highScore);
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
          centerX = mapOffsetX + mapWidth * 7 / 8;
          centerY = mapOffsetY + mapHeight + 40;
        } else {
          // Center horizontally based on text position and width
          const textWidth = powerText.width;
          centerX = powerText.x + textWidth / 2 - 20;
          centerY = powerText.y + powerText.height + 25;
        }

        // Calculate the percentage of duration remaining
        const totalDuration = gameConfig.player.powerup.v2.duration[difficulty as keyof typeof gameConfig.player.powerup.v2.duration];
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
          barX = mapOffsetX + mapWidth * 7 / 8 - barWidth / 2;
          barY = mapOffsetY + mapHeight + 60;
        } else {
          // Center horizontally based on text position and width
          const textWidth = powerText.width;
          barX = powerText.x + textWidth / 2 - barWidth / 2 - 20;
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
