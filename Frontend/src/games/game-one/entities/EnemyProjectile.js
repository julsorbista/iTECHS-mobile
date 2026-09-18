import Phaser from 'phaser';
import {
  applyArcadeBodySpec,
  applyArcadeBodyFromManifest,
  applyConfiguredSpriteScale,
  getCenteredArcadeBodySpec,
} from '../systems/arcadeBody';

export default class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.direction = Number(config.direction) < 0 ? -1 : 1;
    this.speed = Number(config.speed || manifest.speed || 280);
    this.lifetimeMs = Number(config.lifetimeMs || manifest.lifetimeMs || 2600);
    this.spawnedAt = scene.time.now;
    this.boundsLeft = Number(config.boundsLeft ?? -140);
    this.boundsRight = Number(config.boundsRight ?? Number(config.viewportWidth || 1280));
    this.animationKey = typeof config.animationKey === 'string' && config.animationKey.trim()
      ? config.animationKey.trim()
      : 'game-one-projectile-float';
    this.directionalRotationDeg = Number.isFinite(Number(config.directionalRotationDeg))
      ? Number(config.directionalRotationDeg)
      : Number(manifest?.directionalRotationDeg || 0);
    this.flipWithDirection = config.flipWithDirection === undefined
      ? manifest?.flipWithDirection !== false
      : Boolean(config.flipWithDirection);

    applyConfiguredSpriteScale(this, manifest, config, { minWidth: 6 });
    this.baseScaleX = Math.abs(this.scaleX);
    this.baseScaleY = Math.abs(this.scaleY);
    this.hasFireFlightEffect = this.animationKey === 'game-one-elemental-fire-projectile';
    this.fireFlightPhase = Math.random() * Math.PI * 2;
    this.applyDirectionalVisuals();
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    if (Number.isFinite(Number(config.hitboxDisplayRatio))) {
      applyArcadeBodySpec(this, getCenteredArcadeBodySpec(this, config.hitboxDisplayRatio));
    } else {
      applyArcadeBodyFromManifest(this, manifest, {
        width: 12,
        height: 12,
        offsetX: 0,
        offsetY: 0,
      });
    }
    this.setVelocityX(this.speed * this.direction);

    if (scene.anims.exists(this.animationKey)) {
      this.anims.play(this.animationKey, true);
    }
  }

  applyDirectionalVisuals() {
    const directionalRotationDeg = Number.isFinite(this.directionalRotationDeg)
      ? this.directionalRotationDeg
      : 0;
    this.setAngle(directionalRotationDeg * this.direction);
    this.setFlipX(this.flipWithDirection ? this.direction < 0 : false);
  }

  update(time) {
    if (!this.active) {
      return;
    }

    if (this.hasFireFlightEffect) {
      const elapsedSeconds = (time - this.spawnedAt) / 1000;
      const flicker = Math.sin((elapsedSeconds * 15) + this.fireFlightPhase);
      const stretch = 1 + (flicker * 0.07);
      const squeeze = 1 - (flicker * 0.035);
      this.setScale(this.baseScaleX * stretch, this.baseScaleY * squeeze);
      this.setAlpha(0.92 + ((flicker + 1) * 0.04));
      this.setAngle((this.directionalRotationDeg * this.direction) + (flicker * 2));
    }

    if (
      time - this.spawnedAt >= this.lifetimeMs
      || this.x < this.boundsLeft - 140
      || this.x > this.boundsRight + 140
    ) {
      this.destroyProjectile();
    }
  }

  destroyProjectile() {
    if (!this.active) {
      return;
    }

    this.destroy();
  }
}
