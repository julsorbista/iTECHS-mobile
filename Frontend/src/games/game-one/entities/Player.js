import Phaser from 'phaser';
import {
  applyArcadeBodyFromManifest,
  applyConfiguredSpriteScale,
} from '../systems/arcadeBody';

const MOVE_SPEED = 230;
const JUMP_VELOCITY = -720;
const DASH_SPEED = 760;
const DASH_DURATION_MS = 160;
const DASH_TILT_DEGREES = 14;
const DEFAULT_MAX_AIR_JUMPS = 1;
const DASH_MODE_AIR_ONLY = 'AIR_ONLY';
const DASH_MODE_GROUND_ONLY = 'GROUND_ONLY';
const DASH_MODE_BOTH = 'BOTH';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.manifest = manifest;
    this.facing = 1;
    this.isFrozen = false;
    this.jumpVelocity = Number.isFinite(Number(config.jumpVelocity))
      ? Number(config.jumpVelocity)
      : JUMP_VELOCITY;
    this.dashSpeed = Number.isFinite(Number(config.dashSpeed)) && Number(config.dashSpeed) > 0
      ? Math.round(Number(config.dashSpeed))
      : DASH_SPEED;
    this.dashDurationMs = Number.isFinite(Number(config.dashDurationMs)) && Number(config.dashDurationMs) > 0
      ? Math.round(Number(config.dashDurationMs))
      : DASH_DURATION_MS;
    this.dashCooldownMs = Number.isFinite(Number(config.dashCooldownMs)) && Number(config.dashCooldownMs) >= 0
      ? Math.round(Number(config.dashCooldownMs))
      : 0;
    this.dashMode = [DASH_MODE_AIR_ONLY, DASH_MODE_GROUND_ONLY, DASH_MODE_BOTH].includes(config.dashMode)
      ? config.dashMode
      : DASH_MODE_AIR_ONLY;
    this.dashResetsOnJump = Boolean(config.dashResetsOnJump);
    this.maxAirJumps = config.allowDoubleJump === false ? 0 : DEFAULT_MAX_AIR_JUMPS;
    this.airJumpsUsed = 0;
    this.airDashUsed = false;
    this.isDashing = false;
    this.dashEndsAt = 0;
    this.dashReadyAt = 0;

    applyConfiguredSpriteScale(this, manifest, config);
    const maxFallSpeed = Number(config.maxFallSpeed);

    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(
      Math.max(this.dashSpeed, MOVE_SPEED),
      Number.isFinite(maxFallSpeed) && maxFallSpeed > 0 ? Math.round(maxFallSpeed) : 980,
    );
    applyArcadeBodyFromManifest(this, manifest, {
      width: 28,
      height: 28,
      offsetX: 0,
      offsetY: 0,
    });

    this.anims.play('game-one-player-idle', true);
  }

  applyDashTilt() {
    this.setAngle(this.facing >= 0 ? DASH_TILT_DEGREES : -DASH_TILT_DEGREES);
  }

  playJumpSound() {
    if (this.scene.sound && this.scene.manifest?.sounds?.jump) {
      const jumpSoundKey = this.scene.manifest.sounds.jump.key;
      if (this.scene.cache.audio.exists(jumpSoundKey)) {
        this.scene.sound.play(jumpSoundKey, { volume: this.scene.manifest.sounds.jump.volume || 0.5 });
      }
    }
  }

  performJump() {
    this.stopDash();
    this.setVelocityY(this.jumpVelocity);
    if (this.dashResetsOnJump) {
      this.airDashUsed = false;
    }
    this.playJumpSound();
  }

  freeze(shouldFreeze) {
    this.isFrozen = shouldFreeze;

    if (shouldFreeze) {
      this.stopDash();
      this.setVelocity(0, 0);
      this.anims.pause();
      return;
    }

    this.anims.resume();
  }

  isOnGround() {
    return Boolean(this.body?.blocked.down || this.body?.touching.down);
  }

  startDash({ airborne = true } = {}) {
    if (airborne) {
      this.airDashUsed = true;
    }
    this.isDashing = true;
    this.dashEndsAt = this.scene.time.now + this.dashDurationMs;
    this.dashReadyAt = this.dashEndsAt + this.dashCooldownMs;

    this.body.setAllowGravity(false);
    this.setVelocity(this.facing * this.dashSpeed, 0);
    this.applyDashTilt();
  }

  stopDash() {
    if (!this.isDashing) {
      return;
    }

    this.isDashing = false;
    this.dashEndsAt = 0;
    this.body.setAllowGravity(true);
    this.setAngle(0);
  }

  update(intent) {
    if (this.isFrozen) {
      return;
    }

    const now = this.scene.time.now;
    const allowDoubleJump = intent.allowDoubleJump !== false;
    this.maxAirJumps = allowDoubleJump ? DEFAULT_MAX_AIR_JUMPS : 0;
    let onGround = this.isOnGround();

    if (onGround) {
      this.airDashUsed = false;
      this.airJumpsUsed = 0;
      this.stopDash();
    }

    let consumedJumpInput = false;
    if (intent.jumpPressed) {
      if (onGround) {
        this.performJump();
        onGround = false;
        consumedJumpInput = true;
      } else if (!this.isDashing && this.airJumpsUsed < this.maxAirJumps) {
        this.performJump();
        this.airJumpsUsed += 1;
        consumedJumpInput = true;
      }
    }

    if (intent.dashPressed && !consumedJumpInput && !this.isDashing && now >= this.dashReadyAt) {
      const canDashFromGround = this.dashMode === DASH_MODE_GROUND_ONLY || this.dashMode === DASH_MODE_BOTH;
      const canDashFromAir = this.dashMode === DASH_MODE_AIR_ONLY || this.dashMode === DASH_MODE_BOTH;
      if (onGround && canDashFromGround) {
        this.startDash({ airborne: false });
      } else if (!onGround && canDashFromAir && !this.airDashUsed) {
        this.startDash({ airborne: true });
      }
    }

    if (this.isDashing) {
      if (now >= this.dashEndsAt) {
        this.stopDash();
      } else {
        this.setVelocity(this.facing * this.dashSpeed, 0);
        this.applyDashTilt();
        this.anims.play('game-one-player-jump', true);
        return;
      }
    }

    const horizontalDirection = Number(Boolean(intent.right)) - Number(Boolean(intent.left));

    if (horizontalDirection !== 0) {
      this.setVelocityX(horizontalDirection * MOVE_SPEED);

      if (horizontalDirection !== this.facing) {
        this.setFlipX(horizontalDirection < 0);
        this.facing = horizontalDirection;
      }
    } else {
      this.setVelocityX(0);
    }

    if (!onGround) {
      this.anims.play('game-one-player-jump', true);
      return;
    }

    if (Math.abs(this.body.velocity.x) > 5) {
      this.anims.play('game-one-player-run', true);
      return;
    }

    this.anims.play('game-one-player-idle', true);
  }
}
