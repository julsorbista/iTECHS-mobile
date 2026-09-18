import Coin from './Coin';

const STYLES = {
  coin: ['COIN', 0xffffff], key: ['KEY', 0xfacc15], scroll: ['SCROLL', 0xfef3c7], speed: ['SPEED', 0x38bdf8],
  jump: ['JUMP', 0xc084fc], health: ['HEALTH', 0xfb7185], shield: ['SHIELD', 0x67e8f9],
  doubleJump: ['2X JUMP', 0x4ade80], poison: ['POISON', 0x111827],
};

const SPRITE_FRAMES = {
  coin: null, key: 'key-red', scroll: 'scroll-plain', speed: 'speed-potion-green', jump: 'jump-potion-purple',
  health: 'health-heart', shield: 'shield', doubleJump: 'double-jump',
  poison: 'poison-potion-black',
};

const KEY_STYLE_FRAMES = {
  red: 'key-red', blue: 'key-blue', green: 'key-green', purple: 'key-purple',
};

const SCROLL_STYLE_FRAMES = {
  plain: 'scroll-plain', red: 'scroll-red', blue: 'scroll-blue', green: 'scroll-green',
};

const resolveTreasureFrame = (config, pickupType) => {
  // Movement boosts have distinct potion artwork while retaining their
  // existing placement, collision, duration, and gameplay behavior.
  if (pickupType === 'speed' || pickupType === 'jump') return SPRITE_FRAMES[pickupType];
  if (config.spriteFrame) return config.spriteFrame;
  if (pickupType === 'key') return KEY_STYLE_FRAMES[config.keyStyle] || SPRITE_FRAMES.key;
  if (pickupType === 'scroll') return SCROLL_STYLE_FRAMES[config.scrollStyle] || SPRITE_FRAMES.scroll;
  return SPRITE_FRAMES[pickupType];
};

export default class TreasurePickup extends Coin {
  constructor(scene, x, y, manifest, config = {}) {
    super(scene, x, y, manifest, config);
    this.pickupType = config.collectibleType;
    this.pickupLabel = config.label || '';
    this.clueText = config.clueText || '';
    this.scrollId = config.scrollId || '';
    const [, tint] = STYLES[this.pickupType] || [this.pickupLabel, 0xffffff];
    const treasureFrame = resolveTreasureFrame(config, this.pickupType);
    const textureKey = treasureFrame ? `game-one-treasure-${treasureFrame}` : '';
    if (textureKey && scene.textures.exists(textureKey)) {
      this.anims.stop();
      this.setTexture(textureKey);
      const targetSize = Math.max(30, Number(config.size) || (this.pickupType === 'scroll' ? 54 : 46));
      this.setDisplaySize(targetSize, targetSize);
      this.clearTint();
      this.body.updateFromGameObject?.();
      // Scroll clues open a blocking popup, so their contact body must stay
      // inside the artwork instead of activating while the player is merely
      // approaching it. Other instant pickups keep a small tolerance so a
      // fast-moving player cannot skip over them between physics frames.
      const interactionScale = this.pickupType === 'scroll' ? 0.72 : 1.15;
      const bodyWidth = (targetSize * interactionScale) / (Math.abs(this.scaleX) || 1);
      const bodyHeight = (targetSize * interactionScale) / (Math.abs(this.scaleY) || 1);
      this.body.setSize(bodyWidth, bodyHeight, true);
    } else {
      this.setTint(tint);
    }
  }
}
