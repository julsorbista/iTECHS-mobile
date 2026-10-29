import Phaser from 'phaser';

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('HudScene');
  }

  create() {
    this.hudPanel = this.add.rectangle(185, 38, 338, 52, 0x0f172a, 0)
      .setOrigin(0.5)
      .setStrokeStyle(0, 0xfde68a, 0);

    this.healthText = this.add.text(24, 18, '♥♥♥', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '34px',
      color: '#fca5a5'
    });

    this.coinText = this.add.text(24, 66, '🪙 0', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '22px',
      color: '#fde68a'
    });

    this.controlsPanel = this.add.graphics();
    this.controlsPanel.fillStyle(0x111827, 0.92);
    this.controlsPanel.fillRoundedRect(20, 54, 324, 36, 8);
    this.controlsPanel.lineStyle(2, 0x8b5cf6, 0.95);
    this.controlsPanel.strokeRoundedRect(20, 54, 324, 36, 8);

    const createKeycap = (x, label) => {
      const key = this.add.rectangle(x, 72, 24, 24, 0x312e81, 1)
        .setStrokeStyle(1, 0xc4b5fd, 0.95);
      const keyLabel = this.add.text(x, 72, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5).setResolution(2);
      return [key, keyLabel];
    };
    const createControlLabel = (x, label) => this.add.text(x, 72, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5).setResolution(2);

    this.moveKeycaps = [...createKeycap(37, 'A'), ...createKeycap(64, 'D')];
    this.moveControlLabel = createControlLabel(81, 'MOVE');
    this.jumpKeycaps = createKeycap(151, 'W');
    this.jumpControlLabel = createControlLabel(168, 'JUMP');
    this.attackKeycaps = createKeycap(247, 'J');
    this.attackControlLabel = createControlLabel(264, 'ATTACK');

    // The keyboard legend is useful on desktop, but duplicates the on-screen
    // touch controls and takes up gameplay space on phones and tablets.
    const usesMobileControls = typeof window !== 'undefined'
      && window.matchMedia?.('(pointer: coarse), (max-width: 1024px)').matches;
    this.usesMobileHud = usesMobileControls;
    if (usesMobileControls) {
      [
        this.controlsPanel,
        ...this.moveKeycaps,
        this.moveControlLabel,
        ...this.jumpKeycaps,
        this.jumpControlLabel,
        ...this.attackKeycaps,
        this.attackControlLabel,
      ].forEach((item) => item?.setVisible(false));
    }

    this.timerText = this.add.text(24, 100, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '16px',
      color: '#93c5fd'
    });

    this.objectiveText = this.add.text(640, 18, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5, 0).setShadow(1, 2, '#020617', 4, true, true);

    this.areaText = this.add.text(1116, 20, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '13px',
      color: '#fde68a',
    }).setOrigin(1, 0).setShadow(1, 2, '#020617', 4, true, true);

    this.healthText.setPosition(28, 20).setFontSize(25);
    this.coinText.setPosition(145, 22).setFontSize(18);
    this.timerText.setPosition(28, 70);
    this.healthText.setShadow(1, 2, '#0f172a', 4, true, true);
    this.coinText.setShadow(1, 2, '#0f172a', 4, true, true);

    this.menuButton = this.add.rectangle(1202, 34, 116, 30, 0x1e293b, 0.82)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x67e8f9, 0.9)
      .setInteractive({ useHandCursor: true });
    this.menuButtonLabel = this.add.text(1202, 34, 'Menu  Esc', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '12px',
      color: '#cffafe',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const openPauseMenu = () => {
      const levelScene = this.scene.get('LevelScene');
      levelScene?.togglePause?.(true);
    };

    this.menuButton.on('pointerover', () => {
      this.menuButton.setFillStyle(0x334155, 0.95);
    });
    this.menuButton.on('pointerout', () => {
      this.menuButton.setFillStyle(0x1e293b, 0.9);
    });
    // Use pointerdown for touch screens: pointerup can be cancelled when the
    // finger moves slightly and the WebView interprets it as a canvas gesture.
    this.menuButton.on('pointerdown', openPauseMenu);
    this.menuButtonLabel.on('pointerdown', openPauseMenu);

    // Mobile uses the larger HTML Menu button beside the canvas. Hide only
    // this compact desktop/keyboard button to avoid showing it twice.
    if (usesMobileControls) {
      this.menuButton.setVisible(false).disableInteractive();
      this.menuButtonLabel.setVisible(false).disableInteractive();
    }

    this.footerText = this.add.text(1248, 692, 'Move: WASD / Arrows  |  Jump: Space  |  Menu: Esc', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '10px',
      color: '#e2e8f0'
    }).setOrigin(1, 1).setVisible(false);

    this.syncFromRegistry();
    this.scale.on('resize', this.layoutMobileHud, this);

    this.registry.events.on('changedata-roomLabel', this.syncFromRegistry, this);
    this.registry.events.on('changedata-roomIndex', this.syncFromRegistry, this);
    this.registry.events.on('changedata-roomCount', this.syncFromRegistry, this);
    this.registry.events.on('changedata-health', this.syncFromRegistry, this);
    this.registry.events.on('changedata-maxHealth', this.syncFromRegistry, this);
    this.registry.events.on('changedata-coinsCollected', this.syncFromRegistry, this);
    this.registry.events.on('changedata-coinBalance', this.syncFromRegistry, this);
    this.registry.events.on('changedata-totalCoins', this.syncFromRegistry, this);
    this.registry.events.on('changedata-timerEnabled', this.syncFromRegistry, this);
    this.registry.events.on('changedata-timerSecondsRemaining', this.syncFromRegistry, this);
    this.registry.events.on('changedata-coinGoal', this.syncFromRegistry, this);
    this.registry.events.on('changedata-keysCollected', this.syncFromRegistry, this);
    this.registry.events.on('changedata-keyGoal', this.syncFromRegistry, this);
    this.registry.events.on('changedata-currentRoomKeyGoal', this.syncFromRegistry, this);
    this.registry.events.on('changedata-scrollsCollected', this.syncFromRegistry, this);
    this.registry.events.on('changedata-scrollGoal', this.syncFromRegistry, this);
    this.registry.events.on('changedata-objective', this.syncFromRegistry, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutMobileHud, this);
      this.registry.events.off('changedata-roomLabel', this.syncFromRegistry, this);
      this.registry.events.off('changedata-roomIndex', this.syncFromRegistry, this);
      this.registry.events.off('changedata-roomCount', this.syncFromRegistry, this);
      this.registry.events.off('changedata-health', this.syncFromRegistry, this);
      this.registry.events.off('changedata-maxHealth', this.syncFromRegistry, this);
      this.registry.events.off('changedata-coinsCollected', this.syncFromRegistry, this);
      this.registry.events.off('changedata-coinBalance', this.syncFromRegistry, this);
      this.registry.events.off('changedata-totalCoins', this.syncFromRegistry, this);
      this.registry.events.off('changedata-timerEnabled', this.syncFromRegistry, this);
      this.registry.events.off('changedata-timerSecondsRemaining', this.syncFromRegistry, this);
      this.registry.events.off('changedata-coinGoal', this.syncFromRegistry, this);
      this.registry.events.off('changedata-keysCollected', this.syncFromRegistry, this);
      this.registry.events.off('changedata-keyGoal', this.syncFromRegistry, this);
      this.registry.events.off('changedata-currentRoomKeyGoal', this.syncFromRegistry, this);
      this.registry.events.off('changedata-scrollsCollected', this.syncFromRegistry, this);
      this.registry.events.off('changedata-scrollGoal', this.syncFromRegistry, this);
      this.registry.events.off('changedata-objective', this.syncFromRegistry, this);
    });
  }

  buildHealthHearts(health, maxHealth) {
    const roundedHealth = Math.round(Math.max(0, Number(health) || 0) * 2) / 2;
    const roundedMaxHealth = Math.max(1, Math.round(Number(maxHealth) || 3));
    const fullHearts = Math.floor(Math.min(roundedHealth, roundedMaxHealth));
    const hasHalfHeart = roundedHealth - fullHearts >= 0.5 && fullHearts < roundedMaxHealth;
    const emptyHearts = Math.max(0, roundedMaxHealth - fullHearts - (hasHalfHeart ? 1 : 0));
    return `${'♥'.repeat(fullHearts)}${hasHalfHeart ? '½' : ''}${'♡'.repeat(emptyHearts)}`;
  }

  syncFromRegistry() {
    const health = Number(this.registry.get('health') || 0);
    const maxHealth = Number(this.registry.get('maxHealth') || 3);
    const coinsCollected = Number(this.registry.get('coinsCollected') || 0);
    const coinBalance = Number(this.registry.get('coinBalance') ?? coinsCollected);
    const coinGoal = Number(this.registry.get('coinGoal') || 0);
    const keysCollected = Number(this.registry.get('keysCollected') || 0);
    const keyGoal = Number(this.registry.get('keyGoal') || 0);
    const currentRoomKeyGoal = Number(this.registry.get('currentRoomKeyGoal') || 0);
    const scrollsCollected = Number(this.registry.get('scrollsCollected') || 0);
    const scrollGoal = Number(this.registry.get('scrollGoal') || 0);
    const timerEnabled = Boolean(this.registry.get('timerEnabled'));
    const roomIndex = Number(this.registry.get('roomIndex') || 1);
    const roomCount = Number(this.registry.get('roomCount') || 1);
    const objective = String(this.registry.get('objective') || '').trim();
    const timerSecondsRemaining = Number(this.registry.get('timerSecondsRemaining'));
    const minutes = Number.isFinite(timerSecondsRemaining) ? Math.floor(timerSecondsRemaining / 60) : 0;
    const seconds = Number.isFinite(timerSecondsRemaining) ? timerSecondsRemaining % 60 : 0;
    const healthRatio = maxHealth > 0 ? health / maxHealth : 0;
    const hearts = this.buildHealthHearts(health, maxHealth);
    const timerLow = timerEnabled && Number.isFinite(timerSecondsRemaining) && timerSecondsRemaining <= 30;
    const timerWarn = timerEnabled && Number.isFinite(timerSecondsRemaining) && timerSecondsRemaining > 30 && timerSecondsRemaining <= 60;

    if (healthRatio <= 0.34) {
      this.healthText.setColor('#fca5a5');
    } else if (healthRatio <= 0.67) {
      this.healthText.setColor('#fde68a');
    } else {
      this.healthText.setColor('#86efac');
    }

    if (timerLow) {
      this.timerText.setColor('#fca5a5');
    } else if (timerWarn) {
      this.timerText.setColor('#fde68a');
    } else {
      this.timerText.setColor('#93c5fd');
    }

    this.healthText.setText(hearts);
    this.coinText.setText(coinGoal > 0
      ? `🪙 ${coinBalance}  Goal ${coinsCollected}/${coinGoal}`
      : `🪙 ${coinBalance}`);
    this.coinText.setText(`🪙 ${coinBalance}    \ud83d\udd11 ${keysCollected}/${keyGoal}    \ud83d\udcdc ${scrollsCollected}/${scrollGoal}`);
    if (currentRoomKeyGoal <= 0) {
      this.coinText.setText(`🪙 ${coinBalance}    \u{1F4DC} ${scrollsCollected}/${scrollGoal}`);
    }
    this.timerText.setVisible(timerEnabled);
    this.timerText.setText(timerEnabled ? `Timer ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : '');
    this.objectiveText.setText(objective);
    this.areaText.setText(`Room ${roomIndex}/${roomCount}`);
    this.layoutMobileHud();
  }

  layoutMobileHud() {
    if (!this.usesMobileHud || !this.objectiveText) return;
    const bounds = this.game.canvas.getBoundingClientRect();
    const ratio = Math.min(bounds.width / this.scale.width, bounds.height / this.scale.height);
    if (!(ratio > 0)) return;
    // Sizes below are visible CSS pixels, independent of the world camera.
    const px = (value) => value / ratio;
    const width = this.scale.width;
    this.hudPanel.setPosition(width / 2, px(21)).setSize(width, px(42))
      .setFillStyle(0x0f172a, 0);
    this.healthText.setPosition(px(10), px(3)).setFontSize(px(19));
    this.coinText.setPosition(px(10), px(27)).setFontSize(px(14));
    this.timerText.setPosition(width - px(84), px(27)).setOrigin(1, 0).setFontSize(px(10));
    this.areaText.setPosition(width - px(84), px(this.timerText.visible ? 10 : 21))
      .setOrigin(1, 0.5).setFontSize(px(11));
    const left = px(145);
    const right = width - px(160);
    const objectiveWidth = Math.max(px(60), right - left);
    const fullObjective = String(this.registry.get('objective') || 'Explore the room.');
    const shortObjective = fullObjective.replace(/^Objective complete\.\s*/i, '').split(/\.\s+/)[0];
    this.objectiveText.setText(shortObjective).setPosition((left + right) / 2, px(21))
      .setOrigin(0.5).setFontSize(px(11)).setWordWrapWidth(objectiveWidth, true).setLineSpacing(px(1));
    // Keep the compact summary within two lines; full instructions stay in Mission Control.
    let summary = shortObjective;
    while (this.objectiveText.height > px(30) && summary.length > 1) {
      summary = summary.slice(0, -1).trimEnd();
      this.objectiveText.setText(`${summary}…`);
    }
  }
}
