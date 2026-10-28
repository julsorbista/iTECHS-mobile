import Phaser from 'phaser';
import {
  applyArcadeBodyFromManifest,
  applyConfiguredSpriteScale,
} from '../systems/arcadeBody';

const normalizeDirection = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();

    if (normalized === 'LEFT') {
      return -1;
    }

    if (normalized === 'RIGHT') {
      return 1;
    }
  }

  return Number(value) < 0 ? -1 : 1;
};

export default class ProjectileCaster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.manifest = manifest;
    this.enemyType = typeof config.enemyType === 'string' && config.enemyType.trim()
      ? config.enemyType.trim().toLowerCase()
      : 'elemental';
    this.fireDirection = normalizeDirection(config.fireDirection);
    this.fireIntervalMs = Number(config.fireIntervalMs || manifest.fireIntervalMs || 1800);
    this.projectileSpeed = Number(config.projectileSpeed || manifest.projectileSpeed || 280);
    this.projectileLifetimeMs = Number(config.projectileLifetimeMs || manifest.projectileLifetimeMs || 2600);
    this.projectileManifest = config.projectileManifest || null;
    this.projectileAnimationKey = typeof config.projectileAnimationKey === 'string' && config.projectileAnimationKey.trim()
      ? config.projectileAnimationKey.trim()
      : 'game-one-projectile-float';
    this.projectileOffsetX = Number(
      config.projectileOffsetX ?? (this.fireDirection * (manifest.projectileOffsetX || 44))
    );
    this.projectileOffsetY = Number(config.projectileOffsetY ?? (manifest.projectileOffsetY || 8));
    this.warningLeadMs = Number(config.warningLeadMs || 360);
    this.nextShotAt = scene.time.now + Number(config.initialDelayMs ?? this.fireIntervalMs);
    this.maxHitPoints = Math.max(1, Number(config.hitPoints || manifest.hitPoints || (this.enemyType === 'boss' ? 8 : 1)));
    this.hitPoints = this.maxHitPoints;
    this.spawnY = y;
    this.spawnX = x;
    this.floatAmplitude = Number(config.floatAmplitude ?? manifest.driftAmplitude ?? (this.enemyType === 'hunter' ? 36 : 8));
    this.floatSpeed = Number(config.floatSpeed ?? manifest.driftSpeed ?? (this.enemyType === 'hunter' ? 1.8 : 1.1));
    this.floatSeed = Number(config.floatSeed ?? (x * 0.01));
    this.warningAnimationKey = typeof config.warningAnimationKey === 'string' && config.warningAnimationKey.trim()
      ? config.warningAnimationKey.trim()
      : null;

    const defaultAnimationKey = this.enemyType === 'hunter'
      ? 'game-one-hunter-hover'
      : (this.enemyType === 'boss' ? 'game-one-boss-idle' : 'game-one-caster-idle');
    this.idleAnimationKey = typeof config.animationKey === 'string' && config.animationKey.trim()
      ? config.animationKey.trim()
      : defaultAnimationKey;

    this.baseTint = Number(config.baseTint);
    if (!Number.isFinite(this.baseTint)) {
      if (this.enemyType === 'boss') {
        this.baseTint = 0xfda4af;
      } else if (this.enemyType === 'hunter') {
        this.baseTint = 0x7dd3fc;
      } else {
        this.baseTint = null;
      }
    }

    this.warningTint = Number(config.warningTint);
    if (!Number.isFinite(this.warningTint)) {
      this.warningTint = this.enemyType === 'boss'
        ? 0xfb7185
        : 0xfacc15;
    }

    applyConfiguredSpriteScale(this, manifest, config);

    this.setFlipX(this.fireDirection < 0);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    applyArcadeBodyFromManifest(this, manifest, {
      width: 28,
      height: 28,
      offsetX: 0,
      offsetY: 0,
    });

    this.applyBaseVisualState();
  }

  playAnimationIfAvailable(animationKey) {
    if (!animationKey || !this.scene.anims.exists(animationKey)) {
      return;
    }

    const currentAnimationKey = this.anims?.currentAnim?.key;
    if (currentAnimationKey !== animationKey) {
      this.anims.play(animationKey, true);
    }
  }

  applyBaseVisualState() {
    this.playAnimationIfAvailable(this.idleAnimationKey);

    if (Number.isFinite(this.baseTint)) {
      this.setTint(this.baseTint);
      return;
    }

    this.clearTint();
  }

  applyWarningVisualState() {
    this.playAnimationIfAvailable(this.warningAnimationKey || this.idleAnimationKey);

    if (Number.isFinite(this.warningTint)) {
      this.setTint(this.warningTint);
      return;
    }

    this.clearTint();
  }

  update(time) {
    if (!this.active) {
      return;
    }

    if (this.floatAmplitude > 0) {
      const wave = Math.sin((time * 0.001 * this.floatSpeed) + this.floatSeed);
      this.setY(this.spawnY + (wave * this.floatAmplitude));
    }

    if (time >= this.nextShotAt - this.warningLeadMs) {
      this.applyWarningVisualState();
      return;
    }

    this.applyBaseVisualState();
  }

  shouldFire(time) {
    return this.active && time >= this.nextShotAt;
  }

  consumeShot(time) {
    this.nextShotAt = time + this.fireIntervalMs;
    this.applyBaseVisualState();
  }

  getShotSpawnPoint() {
    if (this.enemyType === 'elemental') {
      const halfWidth = Math.max(0, (Number(this.displayWidth) || 0) * 0.5);
      const halfHeight = Math.max(0, (Number(this.displayHeight) || 0) * 0.5);

      return {
        x: this.x + (this.fireDirection * Math.max(34, halfWidth * 1.2)),
        y: this.y - Math.max(24, halfHeight * 0.55),
      };
    }

    return {
      x: this.x + this.projectileOffsetX,
      y: this.y + this.projectileOffsetY,
    };
  }

  applyProjectileHit(damage = 1) {
    if (!this.active) {
      return false;
    }

    this.hitPoints = Math.max(0, this.hitPoints - Math.max(1, Number(damage || 1)));

    if (this.hitPoints <= 0) {
      this.destroy();
      return true;
    }

    this.setTint(0xfef08a);
    this.scene.time.delayedCall(90, () => {
      if (!this.active) {
        return;
      }

      this.applyBaseVisualState();
    });

    return false;
  }
}
