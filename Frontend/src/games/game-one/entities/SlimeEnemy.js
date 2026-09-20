import Phaser from 'phaser';
import {
  applyArcadeBodySpec,
  applyConfiguredSpriteScale,
} from '../systems/arcadeBody';

const GRAVITY_Y = 760;
const DIRECTION_CHANGE_INTERVAL_MS = 2000;
const JUMP_FORCE = -420;

const buildSlimeBodySpec = (sprite) => {
  const frameWidth = Math.max(1, Math.round(Number(sprite?.frame?.realWidth) || Number(sprite?.frame?.width) || Number(sprite?.width) || 64));
  const frameHeight = Math.max(1, Math.round(Number(sprite?.frame?.realHeight) || Number(sprite?.frame?.height) || Number(sprite?.height) || 64));
  const width = Math.max(24, Math.round(frameWidth * 0.44));
  const height = Math.max(20, Math.round(frameHeight * 0.38));
  const offsetX = Math.round((frameWidth - width) / 2);
  const offsetY = Math.round(frameHeight - height - Math.max(6, frameHeight * 0.09));

  return {
    width,
    height,
    offsetX,
    offsetY,
  };
};

export default class SlimeEnemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    const frameKeys = Array.isArray(config.frameKeys)
      ? config.frameKeys.filter((entry) => typeof entry === 'string' && entry.trim())
      : [];
    const initialTextureKey = frameKeys[0] || manifest.key;
    super(scene, x, y, initialTextureKey, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = typeof config.enemyType === 'string'
      ? config.enemyType.trim().toLowerCase()
      : 'slimegreen';
    this.manifest = manifest;
    this.spawnX = x;
    this.patrolDistance = Math.max(20, Number(config.patrolDistance || 220));
    const movementDirection = typeof config.movementDirection === 'string'
      ? config.movementDirection.trim().toUpperCase()
      : '';
    this.speed = Number(config.speed || manifest.speed || 60);
    this.direction = movementDirection === 'LEFT'
      ? -1
      : (movementDirection === 'RIGHT' ? 1 : (Number(config.direction) < 0 ? -1 : 1));
    this.lastDirectionChangeAt = scene.time.now;
    this.nextJumpAt = 0;
    this.jumpForce = Number(config.jumpForce || manifest.jumpForce || JUMP_FORCE);
    this.canJump = config.canJump !== false;
    this.directionChangeIntervalMs = Number(config.directionChangeIntervalMs || DIRECTION_CHANGE_INTERVAL_MS);
    this.animationKey = typeof config.animationKey === 'string' && config.animationKey.trim()
      ? config.animationKey.trim()
      : 'game-one-slime-move';

    applyConfiguredSpriteScale(this, manifest, config, { minWidth: 18 });

    this.body.setAllowGravity(true);
    this.body.setGravityY(Number.isFinite(Number(config.gravityY)) ? Number(config.gravityY) : GRAVITY_Y);
    this.body.setCollideWorldBounds(true);
    this.body.setImmovable(false);
    this.body.setBounce(0.25, 0);

    applyArcadeBodySpec(this, buildSlimeBodySpec(this), {
      width: 28,
      height: 24,
      offsetX: 0,
      offsetY: 0,
    });

    if (scene.anims.exists(this.animationKey)) {
      this.anims.play(this.animationKey, true);
    }

    this.nextJumpAt = scene.time.now + Phaser.Math.Between(360, 760);
  }

  update(now = this.scene.time.now) {
    if (!this.active || !this.body) return;

    const currentTime = Number.isFinite(Number(now)) ? Number(now) : this.scene.time.now;
    if (currentTime - this.lastDirectionChangeAt > this.directionChangeIntervalMs) {
      this.lastDirectionChangeAt = currentTime;
      this.direction = Phaser.Math.Between(0, 1) ? 1 : -1;
      this.nextJumpAt = currentTime + Phaser.Math.Between(400, 800);
    }

    this.setVelocityX(this.direction * this.speed);

    if (Math.abs(this.x - this.spawnX) >= this.patrolDistance) {
      this.direction *= -1;
    }

    if (this.canJump && currentTime >= this.nextJumpAt && (this.body.blocked.down || this.body.touching.down)) {
      this.setVelocityY(this.jumpForce);
      this.nextJumpAt = currentTime + this.directionChangeIntervalMs;
    }

    this.setFlipX(this.direction < 0);
  }
}
