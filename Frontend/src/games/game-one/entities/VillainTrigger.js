import Phaser from 'phaser';
import {
  applyArcadeBodyFromManifest,
  applyArcadeBodySpec,
} from '../systems/arcadeBody';

const DEFAULT_STATUE_TEXTURE_KEY = 'teacher-statue-elem12';
const STATUE_IDLE_SHEET_KEY = 'statue-idle-sheet';
const STATUE_IDLE_ANIM_KEY = 'game-one-statue-idle';
const DEFAULT_STATUE_SIZE = 212;

const getFrameSize = (sprite, fallbackWidth = 128, fallbackHeight = fallbackWidth) => ({
  width: Math.max(1, Math.round(Number(sprite?.displayWidth) || Number(sprite?.frame?.realWidth) || Number(sprite?.frame?.width) || Number(sprite?.width) || fallbackWidth)),
  height: Math.max(1, Math.round(Number(sprite?.displayHeight) || Number(sprite?.frame?.realHeight) || Number(sprite?.frame?.height) || Number(sprite?.height) || fallbackHeight)),
});

const buildStatueBodySpec = (sprite) => {
  const frameSize = getFrameSize(sprite, 212, 256);
  const width = Math.max(84, Math.round(frameSize.width * 0.76));
  const height = Math.max(164, Math.round(frameSize.height * 0.9));
  const offsetX = Math.round((frameSize.width - width) / 2);
  const offsetY = Math.round(Math.max(0, frameSize.height - height - Math.max(2, frameSize.height * 0.02)));

  return {
    width,
    height,
    offsetX,
    offsetY,
  };
};

const resolveVillainTextureKey = (scene, manifest, config = {}) => {
  const configuredTexture = typeof config.textureKey === 'string' ? config.textureKey.trim() : '';
  if (configuredTexture && scene.textures.exists(configuredTexture)) {
    return configuredTexture;
  }

  if (config.appearance === 'STATUE') {
    if (scene.textures.exists(STATUE_IDLE_SHEET_KEY)) {
      return STATUE_IDLE_SHEET_KEY;
    }
    if (scene.textures.exists(DEFAULT_STATUE_TEXTURE_KEY)) {
      return DEFAULT_STATUE_TEXTURE_KEY;
    }
  }

  return manifest.key;
};

export default class VillainTrigger extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    const resolvedTextureKey = resolveVillainTextureKey(scene, manifest, config);
    super(scene, x, y, resolvedTextureKey, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.questionId = config.questionId || null;
    this.appearance = config.appearance === 'STATUE' ? 'STATUE' : 'VILLAIN';
    this.interactionLabel = config.interactionLabel || (this.appearance === 'STATUE' ? 'statue' : 'villain');
    this.questionState = 'UNANSWERED';
    this.hoverTween = null;
    this.hasVanished = false;
    this.pedestal = null;
    this.pedestalCap = null;
    this.statusBack = this.appearance === 'STATUE'
      ? null
      : scene.add.circle(x, y - 74, 18, 0x1d4ed8, 0.92);
    this.statusBack?.setStrokeStyle(2, 0xf8fafc, 0.95);
    this.statusLabel = this.appearance === 'STATUE'
      ? null
      : scene.add.text(x, y - 74, '?', {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '16px',
        color: '#f8fafc'
      }).setOrigin(0.5);

    this.applyConfiguredVisual(manifest, config);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.pedestal?.setDepth(this.depth - 0.5);
    this.pedestalCap?.setDepth(this.depth - 0.45);
    this.statusBack?.setDepth(this.depth + 0.5);
    this.statusLabel?.setDepth(this.depth + 0.6);
    this.playHoverLoop();
    this.setQuestionState('UNANSWERED', { animate: false });

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.tweens.killTweensOf([
        this,
        this.statusBack,
        this.statusLabel,
        this.pedestal,
        this.pedestalCap
      ].filter(Boolean));
      this.statusBack?.destroy();
      this.statusLabel?.destroy();
      this.pedestal?.destroy();
      this.pedestalCap?.destroy();
    });
  }

  applyConfiguredVisual(manifest, config = {}) {
    const resolvedTextureKey = resolveVillainTextureKey(this.scene, manifest, config);

    if (resolvedTextureKey && this.texture?.key !== resolvedTextureKey) {
      this.setTexture(resolvedTextureKey, 0);
    }

    const rawSize = Number(config.size);
    const fallbackSize = this.appearance === 'STATUE' ? DEFAULT_STATUE_SIZE : null;
    const displaySize = Number.isFinite(rawSize) && rawSize > 0
      ? rawSize
      : fallbackSize;

    if (Number.isFinite(displaySize) && displaySize > 0) {
      const targetWidth = Math.max(16, Math.round(displaySize));
      const sourceWidth = Math.max(1, Number(this.width) || Number(this.frame?.realWidth) || Number(this.frame?.width) || 1);
      this.setScale(targetWidth / sourceWidth);
    } else {
      this.setScale(manifest.scale);
    }

    if (this.body) {
      if (this.appearance === 'STATUE') {
        const dw = Math.max(16, Math.round(this.displayWidth));
        const dh = Math.max(16, Math.round(this.displayHeight));
        this.body.setSize(dw, dh, true);
      } else {
        applyArcadeBodyFromManifest(this, manifest, {
          width: 28,
          height: 32,
          offsetX: 0,
          offsetY: 0,
        });
      }
    }

    if (this.appearance === 'STATUE' && this.texture?.key === STATUE_IDLE_SHEET_KEY) {
      if (!this.anims?.isPlaying || this.anims.currentAnim?.key !== STATUE_IDLE_ANIM_KEY) {
        if (this.scene.anims.exists(STATUE_IDLE_ANIM_KEY)) {
          this.play(STATUE_IDLE_ANIM_KEY);
        }
      }
    }

    this.layoutDecorations();
  }

  faceTarget(targetX) {
    if (this.hasVanished || this.appearance !== 'STATUE') return;
    this.setFlipX(targetX < this.x);
  }

  layoutDecorations() {
    const displayHeight = Number(this.displayHeight) || 96;
    const pedestalOffset = Math.round(Math.max(34, Math.min(96, displayHeight * 0.52)));
    const statusOffset = Math.round(Math.max(52, displayHeight * 0.72));

    if (this.pedestal) {
      this.pedestal.setPosition(this.x, this.y + pedestalOffset);
    }
    if (this.statusBack) {
      this.statusBack.setPosition(this.x, this.y - statusOffset);
    }
    if (this.statusLabel) {
      this.statusLabel.setPosition(this.x, this.y - statusOffset);
    }
  }

  playHoverLoop() {
    this.hoverTween?.stop();

    if (this.appearance === 'STATUE') {
      return;
    }

    this.hoverTween = this.scene.tweens.add({
      targets: [this, this.statusBack, this.statusLabel],
      y: '-=8',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  createStatueVanishBurst() {
    const flash = this.scene.add.circle(this.x, this.y - 10, 18, 0xf8fafc, 0.3);
    flash.setStrokeStyle(3, 0xe2e8f0, 0.82);
    flash.setDepth(this.depth + 1.2);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 4.2,
      scaleY: 2.6,
      alpha: 0,
      duration: 320,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });

    [
      { x: -52, y: -36, radius: 4, delay: 0 },
      { x: -24, y: -58, radius: 5, delay: 20 },
      { x: 18, y: -62, radius: 4, delay: 36 },
      { x: 48, y: -32, radius: 5, delay: 54 },
      { x: -42, y: 6, radius: 3, delay: 72 },
      { x: 40, y: 10, radius: 3, delay: 90 }
    ].forEach((fragment) => {
      const dust = this.scene.add.circle(this.x, this.y - 8, fragment.radius, 0xe2e8f0, 0.84);
      dust.setDepth(this.depth + 1.1);

      this.scene.tweens.add({
        targets: dust,
        x: this.x + fragment.x,
        y: (this.y - 8) + fragment.y,
        alpha: 0,
        scaleX: 0.24,
        scaleY: 0.24,
        delay: fragment.delay,
        duration: 320,
        ease: 'Quad.Out',
        onComplete: () => dust.destroy()
      });
    });
  }

  hideAsCleared() {
    if (this.body) {
      this.body.enable = false;
    }

    this.hasVanished = true;
    this.setVisible(false);
    this.setAlpha(0);
    [this.statusBack, this.statusLabel, this.pedestal, this.pedestalCap]
      .filter(Boolean)
      .forEach((object) => object.setVisible(false));
  }

  playStatueVanish() {
    if (this.hasVanished) {
      return;
    }

    this.hasVanished = true;
    this.hoverTween?.stop();
    this.hoverTween = null;

    if (this.body) {
      this.body.enable = false;
    }

    this.createStatueVanishBurst();

    this.scene.tweens.add({
      targets: [this, this.statusBack, this.statusLabel].filter(Boolean),
      y: '-=22',
      alpha: 0,
      scaleX: 0.72,
      scaleY: 1.18,
      duration: 280,
      ease: 'Quad.Out'
    });

    this.scene.tweens.add({
      targets: [this.pedestal, this.pedestalCap].filter(Boolean),
      y: '+=14',
      alpha: 0,
      duration: 240,
      ease: 'Quad.In',
      onComplete: () => this.hideAsCleared()
    });
  }

  setQuestionState(state, { animate = true } = {}) {
    this.questionState = state === 'ANSWERED' ? 'ANSWERED' : 'UNANSWERED';

    if (this.questionState === 'ANSWERED') {
      if (this.appearance === 'STATUE') {
        if (animate) {
          this.playStatueVanish();
        } else {
          this.hideAsCleared();
        }
        return;
      }

      this.setTint(0x86efac);
      this.statusBack.setFillStyle(0x166534, 0.94);
      this.statusLabel.setText('OK');
      return;
    }

    this.hasVanished = false;
    this.setVisible(true);
    this.setAlpha(1);
    this.layoutDecorations();
    if (this.body) {
      this.body.enable = true;
    }

    [this.statusBack, this.statusLabel, this.pedestal, this.pedestalCap]
      .filter(Boolean)
      .forEach((object) => {
        object.setVisible(true);
        object.setAlpha(1);
        object.setScale(1);
      });

    if (this.appearance === 'STATUE') {
      this.setTint(0xcbd5e1);
      return;
    }

    this.setTint(0xfbbf24);
    this.statusBack.setFillStyle(0x1d4ed8, 0.92);
    this.statusLabel.setText('?');
    this.statusLabel.setColor('#f8fafc');
  }
}
