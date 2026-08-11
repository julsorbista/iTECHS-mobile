import Phaser from 'phaser';

const DEFAULT_COIN_SIZE = 36;

export default class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.manifest = manifest;
    const requestedSize = Number(config.size);
    const resolvedSize = Number.isFinite(requestedSize) && requestedSize > 0
      ? requestedSize
      : DEFAULT_COIN_SIZE;
    const targetWidth = Math.max(16, Math.round(resolvedSize));
    const sourceWidth = Math.max(1, Number(this.width) || Number(this.frame?.realWidth) || Number(this.frame?.width) || 1);
    this.setScale(targetWidth / sourceWidth);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.updateFromGameObject?.();
    this.anims.play('game-one-coin-spin', true);
  }

  playCoinSound() {
    if (this.scene.sound && this.scene.manifest?.sounds?.coin) {
      const coinSoundKey = this.scene.manifest.sounds.coin.key;
      if (this.scene.cache.audio.exists(coinSoundKey)) {
        this.scene.sound.play(coinSoundKey, { 
          volume: this.scene.manifest.sounds.coin.volume || 0.7 
        });
      }
    }
  }
}
