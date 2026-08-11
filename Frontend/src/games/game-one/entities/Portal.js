import Phaser from 'phaser';
import { applyArcadeBodyFromManifest } from '../systems/arcadeBody';

export default class Portal extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.manifest = manifest;
    this.targetRoomId = config.targetRoomId || null;
    this.endsLevel = Boolean(config.endsLevel);
    this.questionId = config.questionId || null;
    this.linkName = typeof config.linkName === 'string' ? config.linkName.trim() : '';
    this.locked = Boolean(config.locked);
    this.lockLayers = [];
    this.baseScale = Number(manifest.scale) || 1;
    this.animationKey = typeof config.animationKey === 'string' && config.animationKey.trim()
      ? config.animationKey.trim()
      : 'game-one-portal-spin';

    if (Number.isFinite(Number(config.size)) && Number(config.size) > 0) {
      const targetWidth = Math.max(16, Math.round(Number(config.size)));
      const sourceWidth = Math.max(1, Number(this.width) || Number(this.frame?.realWidth) || Number(this.frame?.width) || 1);
      this.baseScale = targetWidth / sourceWidth;
    }

    this.setScale(this.baseScale);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    applyArcadeBodyFromManifest(this, manifest, {
      width: 28,
      height: 28,
      offsetX: 0,
      offsetY: 0,
    });

    this.lockLayers.forEach((layer, index) => {
      layer.setDepth(this.depth + 1 + (index * 0.01));
    });

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.tweens.killTweensOf([this, ...this.lockLayers]);
      this.lockLayers.forEach((layer) => layer?.destroy());
    });

    this.syncVisualState();
  }

  syncVisualState() {
    this.scene.tweens.killTweensOf([this, ...this.lockLayers]);

    if (this.locked) {
      this.anims.stop();
      this.setFrame(0);
      this.setAlpha(0.58);
      this.setScale(this.baseScale * 0.96);
      this.clearTint();
      this.lockLayers.forEach((layer) => {
        layer.setVisible(true);
        layer.setAlpha(layer.baseAlpha);
        layer.setScale(1);
      });
      this.body?.updateFromGameObject?.();
      return;
    }

    this.clearTint();
    this.setAlpha(1);
    this.setScale(this.baseScale);
    if (this.scene.anims.exists(this.animationKey)) {
      this.anims.play(this.animationKey, true);
    }
    this.lockLayers.forEach((layer) => {
      layer.setVisible(false);
      layer.setAlpha(layer.baseAlpha);
      layer.setScale(1);
    });
    this.body?.updateFromGameObject?.();
  }

  playUnlockEffect() {
    this.setAlpha(1);
    this.clearTint();
    this.setScale(this.baseScale * 0.92);
    if (this.scene.anims.exists(this.animationKey)) {
      this.anims.play(this.animationKey, true);
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: 260,
      ease: 'Back.Out'
    });

    if (this.lockLayers.length) {
      this.scene.tweens.add({
        targets: this.lockLayers,
        alpha: 0,
        scaleX: 1.24,
        scaleY: 0.84,
        duration: 260,
        ease: 'Quad.Out',
        onComplete: () => {
          this.lockLayers.forEach((layer) => {
            layer.setVisible(false);
            layer.setAlpha(layer.baseAlpha);
            layer.setScale(1);
          });
        }
      });
    }
  }

  applyConfiguredVisual(config = {}) {
    if (typeof config.animationKey === 'string' && config.animationKey.trim()) {
      this.animationKey = config.animationKey.trim();
    }

    if (Number.isFinite(Number(config.size)) && Number(config.size) > 0) {
      const targetWidth = Math.max(16, Math.round(Number(config.size)));
      const sourceWidth = Math.max(1, Number(this.width) || Number(this.frame?.realWidth) || Number(this.frame?.width) || 1);
      this.baseScale = targetWidth / sourceWidth;
    } else {
      this.baseScale = Number(this.manifest.scale) || 1;
    }

    this.syncVisualState();

    if (this.body) {
      applyArcadeBodyFromManifest(this, this.manifest, {
        width: 28,
        height: 28,
        offsetX: 0,
        offsetY: 0,
      });
    }
  }

  setLocked(locked) {
    const nextLocked = Boolean(locked);
    const wasLocked = this.locked;

    if (nextLocked === wasLocked) {
      return;
    }

    this.locked = nextLocked;

    if (wasLocked && !nextLocked) {
      this.playUnlockEffect();
      return;
    }

    this.syncVisualState();
  }

  isUnlocked() {
    return !this.locked;
  }
}
