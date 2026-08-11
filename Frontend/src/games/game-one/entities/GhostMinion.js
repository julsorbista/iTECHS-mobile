import Phaser from 'phaser';
import {
  applyArcadeBodyFromManifest,
  applyConfiguredSpriteScale,
} from '../systems/arcadeBody';
import { applyCombatDamage } from '../systems/combatHealth';

export default class GhostMinion extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.spawnX = x;
    this.spawnY = y;
    this.speed = Number(config.speed || manifest.speed || 72);
    this.patrolDistance = Number(config.patrolDistance || 180);
    this.movementDirection = typeof config.movementDirection === 'string'
      ? config.movementDirection.trim().toUpperCase()
      : 'LEFT';
    this.axis = ['UP', 'DOWN'].includes(this.movementDirection) ? 'y' : 'x';
    this.direction = ['RIGHT', 'DOWN'].includes(this.movementDirection) ? 1 : -1;
    this.maxHitPoints = Math.max(1, Math.round(Number(config.hitPoints || manifest.hitPoints || 1)));
    this.hitPoints = this.maxHitPoints;

    applyConfiguredSpriteScale(this, manifest, config);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    applyArcadeBodyFromManifest(this, manifest, {
      width: 28,
      height: 28,
      offsetX: 0,
      offsetY: 0,
    });
    this.anims.play('game-one-ghost-float', true);
  }

  applyProjectileHit(damage = 1) {
    if (!this.active) {
      return false;
    }

    const damageResult = applyCombatDamage(this.hitPoints, damage);
    this.hitPoints = damageResult.hitPoints;

    if (damageResult.defeated) {
      this.disableBody(true, true);
      this.destroy();
      return true;
    }

    this.setTint(0xfef08a);
    this.scene.time.delayedCall(90, () => {
      if (this.active) {
        this.clearTint();
      }
    });
    return false;
  }

  update() {
    if (this.axis === 'y') {
      this.setVelocityX(0);
      this.setVelocityY(this.speed * this.direction);

      if (this.y >= this.spawnY + this.patrolDistance) {
        this.direction = -1;
      } else if (this.y <= this.spawnY - this.patrolDistance) {
        this.direction = 1;
      }
      return;
    }

    this.setVelocityY(0);
    this.setVelocityX(this.speed * this.direction);
    this.setFlipX(this.direction < 0);

    if (this.x >= this.spawnX + this.patrolDistance) {
      this.direction = -1;
    } else if (this.x <= this.spawnX - this.patrolDistance) {
      this.direction = 1;
    }
  }
}
