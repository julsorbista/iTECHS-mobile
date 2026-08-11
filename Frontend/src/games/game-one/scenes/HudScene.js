import Phaser from 'phaser';

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('HudScene');
  }

  create() {
    this.healthText = this.add.text(24, 18, '♥♥♥', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '34px',
      color: '#fca5a5'
    });

    this.coinText = this.add.text(24, 66, '🪙 0', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '24px',
      color: '#fde68a'
    });

    this.timerText = this.add.text(24, 100, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '16px',
      color: '#93c5fd'
    });

    this.menuButton = this.add.rectangle(1182, 36, 156, 34, 0x1e293b, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x67e8f9, 0.9)
      .setInteractive({ useHandCursor: true });
    this.menuButtonLabel = this.add.text(1182, 36, 'Menu [Esc]', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '14px',
      color: '#cffafe',
    }).setOrigin(0.5);

    this.menuButton.on('pointerover', () => {
      this.menuButton.setFillStyle(0x334155, 0.95);
    });
    this.menuButton.on('pointerout', () => {
      this.menuButton.setFillStyle(0x1e293b, 0.9);
    });
    this.menuButton.on('pointerup', () => {
      const levelScene = this.scene.get('LevelScene');
      levelScene?.togglePause?.(true);
    });

    this.footerText = this.add.text(1248, 686, 'Move: WASD / Arrows  Jump: W / Up / Space  Double Jump: Jump Again  Air Dash: Space  Attack: J  Menu: ESC', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '14px',
      color: '#e2e8f0'
    }).setOrigin(1, 1);

    this.syncFromRegistry();

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
    this.registry.events.on('changedata-statueProgress', this.syncFromRegistry, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
      this.registry.events.off('changedata-statueProgress', this.syncFromRegistry, this);
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
    const timerEnabled = Boolean(this.registry.get('timerEnabled'));
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
    this.timerText.setVisible(timerEnabled);
    this.timerText.setText(timerEnabled ? `Timer ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : '');
  }
}
