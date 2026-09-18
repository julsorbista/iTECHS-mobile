import Phaser from 'phaser';

export default class TreasureChest extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.targetRoomId = config.targetRoomId || null;
    this.endsLevel = config.endsLevel !== false;
    this.questionId = config.treasureQuestionId || config.questionId || null;
    this.isTreasureChest = true;
    this.linkName = '';
    this.locked = Boolean(config.locked);
    this.requiredCoins = Math.max(0, Number(config.requiredCoins) || 0);
    this.requiredKeys = Math.max(0, Number(config.requiredKeys) || 0);
    this.requiredScrollId = typeof config.requiredScrollId === 'string' ? config.requiredScrollId : '';
    this.requirementName = typeof config.requirementName === 'string' && config.requirementName.trim()
      ? config.requirementName.trim().toUpperCase()
      : 'KEYS';
    this.lockedByConfig = Boolean(config.locked)
      && this.requiredCoins === 0 && this.requiredKeys === 0 && !this.requiredScrollId && !this.questionId;
    this.touchCooldownUntil = 0;

    // The authored portal coordinate represents the chest interaction center,
    // but the chest artwork otherwise appears above its supporting platform.
    // Ground the 100px-tall artwork on top of the standard platform (top: y + 75)
    // while preserving the authored interaction trigger coordinate.
    this.chestSprite = scene.add.image(0, 33, 'game-one-treasure-chest-closed')
      .setDisplaySize(120, 100);
    this.label = scene.add.text(0, -37, 'JAVA TREASURE', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: '13px',
      color: '#fef3c7',
      backgroundColor: '#422006dd',
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5);

    this.add([this.chestSprite, this.label]);
    this.setDepth(7);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    // Match the full visible chest and give the player a small approach margin,
    // so the question opens as soon as they reach it rather than after overlap.
    this.body.setSize(150, 120);
    this.syncVisualState();
  }

  syncVisualState() {
    this.setAlpha(this.locked ? 0.65 : 1);
    this.chestSprite.setTint(this.locked ? 0x94a3b8 : 0xffffff);
    const requirement = this.requiredKeys > 0
      ? `${this.requiredKeys} ${this.requirementName} REQUIRED`
      : (this.requiredScrollId
        ? 'SCROLL REQUIRED'
        : (this.requiredCoins > 0 ? `${this.requiredCoins} SCROLLS REQUIRED` : 'TREASURE LOCKED'));
    this.label.setText(this.locked ? requirement : 'JAVA TREASURE');
  }

  setLocked(locked) {
    const wasLocked = this.locked;
    this.locked = Boolean(locked);
    this.syncVisualState();

    if (wasLocked && !this.locked) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 160,
        yoyo: true,
      });
    }
  }

  isUnlocked() {
    return !this.locked;
  }
}
