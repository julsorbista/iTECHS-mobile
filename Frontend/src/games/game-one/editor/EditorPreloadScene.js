import Phaser from 'phaser';
import { registerGameOneAnimations } from '../systems/animations';

export default class EditorPreloadScene extends Phaser.Scene {
  constructor() {
    super('GameOneEditorPreloadScene');
  }

  preload() {
    const runtimeAssets = this.game.__ITECHS_EDITOR__?.runtimeAssets;
    const runtimeLevelData = this.game.__ITECHS_EDITOR__?.levelData || {};

    this.cameras.main.setBackgroundColor('#020617');
    this.add.rectangle(640, 360, 1280, 720, 0x0b1120, 1);
    this.add.rectangle(640, 360, 1080, 560, 0x0f172a, 0.94).setStrokeStyle(2, 0x1e293b, 1);
    this.add.rectangle(640, 360, 980, 420, 0x111c33, 0.96).setStrokeStyle(2, 0x22d3ee, 0.18);
    this.add.rectangle(640, 244, 460, 50, 0x0b1328, 0.96).setStrokeStyle(2, 0x334155, 1);

    const eyebrow = this.add.text(640, 220, 'Teacher Workspace', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#67e8f9',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const label = this.add.text(640, 262, 'Preparing editor canvas', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const sublabel = this.add.text(640, 308, 'Loading tiles, components, and room tools for edit mode.', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: 720 },
    }).setOrigin(0.5);

    const shimmerTrack = this.add.rectangle(640, 392, 420, 18, 0x0f172a, 1)
      .setStrokeStyle(2, 0x334155, 1)
      .setOrigin(0.5);
    const progressGlow = this.add.rectangle(430, 392, 0, 10, 0x22d3ee, 0.42).setOrigin(0, 0.5);
    const progress = this.add.rectangle(430, 392, 0, 10, 0x34d399, 1).setOrigin(0, 0.5);
    const status = this.add.text(640, 432, 'Starting loader...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
    const accentLeft = this.add.rectangle(410, 184, 10, 10, 0x22d3ee, 1).setAngle(45);
    const accentRight = this.add.rectangle(870, 184, 10, 10, 0x34d399, 1).setAngle(45);

    this.load.on('progress', (value) => {
      const clampedValue = Phaser.Math.Clamp(Number(value) || 0, 0, 1);
      progress.width = 420 * clampedValue;
      progressGlow.width = 420 * clampedValue;
      status.setText(`Loading assets ${(clampedValue * 100).toFixed(0)}%`);
    });

    this.load.on('complete', () => {
      this.tweens.killTweensOf([accentLeft, accentRight]);
      eyebrow.destroy();
      label.destroy();
      sublabel.destroy();
      shimmerTrack.destroy();
      progressGlow.destroy();
      progress.destroy();
      status.destroy();
      accentLeft.destroy();
      accentRight.destroy();
    });

    this.tweens.add({
      targets: [accentLeft, accentRight],
      y: '+=10',
      alpha: 0.5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    runtimeAssets.images.forEach((asset) => {
      this.load.image(asset.key, asset.url);
    });

    runtimeAssets.spritesheets.forEach((asset) => {
      this.load.spritesheet(asset.key, asset.url, asset.frameConfig);
    });

    (runtimeAssets.audio || []).forEach((asset) => {
      this.load.audio(asset.key, asset.url);
    });

    const dynamicBackgroundTiles = Array.isArray(runtimeLevelData?.worldObjects?.backgroundTiles)
      ? runtimeLevelData.worldObjects.backgroundTiles
      : [];
    const queuedTextureKeys = new Set();

    dynamicBackgroundTiles.forEach((tile, index) => {
      const imageUrl = typeof tile?.imageUrl === 'string' ? tile.imageUrl.trim() : '';
      if (!imageUrl) {
        return;
      }

      const textureKey = typeof tile?.textureKey === 'string' && tile.textureKey.trim()
        ? tile.textureKey.trim()
        : `editor-room-bg-tile-${index + 1}`;

      if (queuedTextureKeys.has(textureKey) || this.textures.exists(textureKey)) {
        return;
      }

      queuedTextureKeys.add(textureKey);
      this.load.image(textureKey, imageUrl);
    });
  }

  create() {
    const { manifest } = this.game.__ITECHS_EDITOR__.runtimeAssets;
    registerGameOneAnimations(this, manifest);
    this.scene.start('GameOneEditorScene');
  }
}
