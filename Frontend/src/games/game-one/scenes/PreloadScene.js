import Phaser from 'phaser';
import { registerGameOneAnimations } from '../systems/animations';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const bootPayload = this.game.__ITECHS_BOOT__ || {};
    const runtimeAssets = bootPayload.runtimeAssets;
    const runtimeLevelData = bootPayload.levelData || {};
    const showPreloadUi = !bootPayload.suppressPreloadUi
      && runtimeLevelData?.settings?.showPreloadUi !== false;

    this.cameras.main.setBackgroundColor('#0f172a');

    if (showPreloadUi) {
      const loadingTips = [
        'Preparing rooms, enemies, and question gates.',
        'Loading player controls and level art.',
        'Setting up hints and progress tracking.',
      ];

      const panelShadow = this.add.rectangle(648, 368, 560, 260, 0x4a3040)
        .setOrigin(0.5);
      const panel = this.add.rectangle(640, 360, 560, 260, 0xead9ab)
        .setOrigin(0.5)
        .setStrokeStyle(5, 0x6b4d72);

      const iconBox = this.add.rectangle(640, 278, 72, 72, 0xf2e6c2)
        .setOrigin(0.5)
        .setStrokeStyle(4, 0x6b4d72);

      const icon = this.add.text(640, 278, '01', {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '24px',
        color: '#724964',
        fontStyle: '700',
      }).setOrigin(0.5);

      const loadingLabel = this.add.text(640, 338, 'Loading Game One', {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '30px',
        color: '#2d241b',
        fontStyle: '700'
      }).setOrigin(0.5);

      const loadingSubtext = this.add.text(640, 380, loadingTips[0], {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '18px',
        color: '#5b4631',
        align: 'center',
        wordWrap: { width: 460 }
      }).setOrigin(0.5);

      const progressTrack = this.add.rectangle(640, 440, 420, 22, 0xf2e6c2)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x6b4d72);
      const progressBar = this.add.rectangle(432, 440, 0, 14, 0x724964).setOrigin(0, 0.5);

      this.load.on('progress', (value) => {
        progressBar.width = 416 * value;
        const tipIndex = Math.min(loadingTips.length - 1, Math.floor(value * loadingTips.length));
        loadingSubtext.setText(loadingTips[tipIndex]);
      });

      this.load.on('complete', () => {
        panelShadow.destroy();
        panel.destroy();
        iconBox.destroy();
        icon.destroy();
        loadingLabel.destroy();
        loadingSubtext.destroy();
        progressBar.destroy();
        progressTrack.destroy();
      });
    }

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
        : `room-bg-tile-${index + 1}`;

      if (queuedTextureKeys.has(textureKey) || this.textures.exists(textureKey)) {
        return;
      }

      queuedTextureKeys.add(textureKey);
      this.load.image(textureKey, imageUrl);
    });
  }

  create() {
    const bootPayload = this.game.__ITECHS_BOOT__ || {};
    const { manifest } = bootPayload.runtimeAssets;
    registerGameOneAnimations(this, manifest);
    bootPayload.callbacks?.onPreloadComplete?.();

    this.scene.launch('HudScene');
    this.scene.launch('MenuScene');
    this.scene.start('LevelScene');
  }
}
