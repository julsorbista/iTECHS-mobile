import assetManifest from './assetManifest.json';

const tutorialGrove = new URL('../processed/backgrounds/tutorial-grove.png', import.meta.url).href;
const swampTrail = new URL('../processed/backgrounds/swamp-trail.png', import.meta.url).href;
const ruinsGate = new URL('../processed/backgrounds/ruins-gate.png', import.meta.url).href;
const room1Background = new URL('../../../../../assets/Game/game_one/Background/room 1.JPG', import.meta.url).href;
const room2Background = new URL('../../../../../assets/Game/game_one/Background/room 2.JPG', import.meta.url).href;
const room3Background = new URL('../../../../../assets/Game/game_one/Background/room 3.JPG', import.meta.url).href;
const room4Background = new URL('../../../../../assets/Game/game_one/Background/room 4.JPG', import.meta.url).href;
const room5Background = new URL('../../../../../assets/Game/game_one/Background/room 5.JPG', import.meta.url).href;
const room6Background = new URL('../../../../../assets/Game/game_one/Background/room 6.JPG', import.meta.url).href;
const room10Background = new URL('../../../../../assets/Game/game_one/Background/room 10.JPG', import.meta.url).href;
const gameOneBackgroundMusic = new URL('../../../../../assets/Game/game_one/Music & Sound Effects/bg_sound/game_one/game1_sound1.mp3', import.meta.url).href;
const gameOneBackgroundMusic2 = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/music/time_for_adventure.mp3', import.meta.url).href;
const ghostSheet = new URL('../processed/sprites/ghost-sheet.png', import.meta.url).href;
const elementalCasterSheet = new URL('../processed/sprites/elemental-caster-sheet.png', import.meta.url).href;
const shadowSpiritSheet = new URL('../processed/sprites/shadow-spirit-sheet.png', import.meta.url).href;
const hunterEnemySheet = new URL('../processed/sprites/hunter-drone-sheet.svg', import.meta.url).href;
const bossEnemySheet = new URL('../processed/sprites/boss-sentinel-sheet.svg', import.meta.url).href;
const enemyProjectileSheet = new URL('../processed/sprites/enemy-projectile-sheet.png', import.meta.url).href;
const elementalProjectileSheet = new URL('../processed/sprites/villain1-fire-projectile.png', import.meta.url).href;
const bossProjectileSheet = new URL('../processed/sprites/boss-projectile-sheet.svg', import.meta.url).href;
const coinSheet = new URL('../processed/sprites/coin-sheet.png', import.meta.url).href;
const portalSheet = new URL('../../../../../assets/Game/game_one/Platforms/Portal/portal 2.png', import.meta.url).href;
const portalThreeSheet = new URL('../../../../../assets/Game/game_one/Platforms/Portal/portal 3.png', import.meta.url).href;
const villain1EnemySheet = new URL('../../../../../assets/Game/game_one/Sprites Character/Player and Villain/Villain/villain1/villain1 walk.png', import.meta.url).href;
const villain1ProjectileSheet = new URL('../../../../../assets/Game/game_one/Sprites Character/Player and Villain/Villain/villain1/villain1 attack.png', import.meta.url).href;
const spiritBossSheet = new URL('../../../../../assets/Game/game_one/Sprites Character/Others/6.jpg', import.meta.url).href;
const villainIdle = new URL('../processed/sprites/villain-idle.png', import.meta.url).href;
// This is the Teacher Editor's exact `tile-12-1` artwork, normalized to the
// editor's 64px tile size so Phaser repeats it without flattening its details.
const selectedPlatform = new URL('../processed/platforms/platform-teacher-tile.png', import.meta.url).href;
const platformGrass = selectedPlatform;
const platformStone = selectedPlatform;
const platformWood = selectedPlatform;
const questionStatueTile = new URL('../../../../../assets/Game/game_one/Platforms/elem12.png', import.meta.url).href;

// Sound files
const soundCoin = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/coin.wav', import.meta.url).href;
const soundExplosion = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/explosion.wav', import.meta.url).href;
const soundHurt = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/hurt.wav', import.meta.url).href;
const soundJump = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/jump.wav', import.meta.url).href;
const soundPowerUp = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/power_up.wav', import.meta.url).href;
const soundCelebration = new URL('../../../../assets/game-arcade/audio/YAY Kids (Celebration) Sound Effect [Free Download].mp3', import.meta.url).href;
const soundTap = new URL('../../../../../assets/Game/game_one/brackeys_platformer_assets/sounds/tap.wav', import.meta.url).href;
const soundPickupCoin = new URL('../audio/pickup-coin.mp3', import.meta.url).href;
const soundCharacterFiring = new URL('../audio/character-firing.mp3', import.meta.url).href;
const soundPickupKey = new URL('../audio/pickup-key.mp3', import.meta.url).href;
const soundPickupPoison = new URL('../audio/pickup-poison.mp3', import.meta.url).href;
const soundPickupShield = new URL('../audio/pickup-shield.mp3', import.meta.url).href;
const soundPickupHeart = new URL('../audio/pickup-heart.mp3', import.meta.url).href;
const soundPickupScroll = new URL('../audio/pickup-scroll.mp3', import.meta.url).href;
const soundEnemyProjectileHit = new URL('../audio/enemy-projectile-hit.mp3', import.meta.url).href;
const soundDash = new URL('../audio/dash.mp3', import.meta.url).href;
const soundShieldHit = new URL('../audio/shield-hit.mp3', import.meta.url).href;
const soundSpikeHit = new URL('../audio/spike-hit.mp3', import.meta.url).href;
const soundFallFromPlatform = new URL('../audio/fall-from-platform.mp3', import.meta.url).href;
const soundCorrectAnswer = new URL('../../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3', import.meta.url).href;
const soundIncorrectAnswer = new URL('../../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3', import.meta.url).href;
const soundTeleport = new URL('../audio/teleport.mp3', import.meta.url).href;

const slimeGreenFrameModules = import.meta.glob('../../../../../assets/2d_platform/SlimeGreen/SlimeBasic_*.png', {
  eager: true,
  import: 'default',
});
const slimeOrangeFrameModules = import.meta.glob('../../../../../assets/2d_platform/SlimeOrange/SlimeOrange_*.png', {
  eager: true,
  import: 'default',
});

const playerIdleFrameModules = import.meta.glob('../processed/player/frames/idle/*.png', { eager: true, import: 'default' });
const playerRunFrameModules = import.meta.glob('../processed/player/frames/run/*.png', { eager: true, import: 'default' });
const playerJumpFrameModules = import.meta.glob('../processed/player/frames/jump/*.png', { eager: true, import: 'default' });

const toOrderedFrameImageEntries = (frameModules, textureKeyPrefix) => Object.entries(frameModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath, undefined, { numeric: true }))
  .map(([, url], index) => ({
    key: `${textureKeyPrefix}-frame-${String(index).padStart(2, '0')}`,
    url,
  }));

const slimeGreenFrameImages = toOrderedFrameImageEntries(slimeGreenFrameModules, assetManifest.slimeGreen.key);
const slimeOrangeFrameImages = toOrderedFrameImageEntries(slimeOrangeFrameModules, assetManifest.slimeOrange.key);
const playerIdleFrameImages = toOrderedFrameImageEntries(playerIdleFrameModules, assetManifest.player.key);
const playerRunFrameImages = toOrderedFrameImageEntries(playerRunFrameModules, assetManifest.playerRun.key);
const playerJumpFrameImages = toOrderedFrameImageEntries(playerJumpFrameModules, assetManifest.playerJump.key);

if (assetManifest.slimeGreen) {
  assetManifest.slimeGreen.frameCount = Math.max(
    1,
    slimeGreenFrameImages.length || Number(assetManifest.slimeGreen.frameCount || 1),
  );
}

if (assetManifest.slimeOrange) {
  assetManifest.slimeOrange.frameCount = Math.max(
    1,
    slimeOrangeFrameImages.length || Number(assetManifest.slimeOrange.frameCount || 1),
  );
}

export const gameOneRuntimeAssets = {
  backgroundMusicKey: 'gameOneBackgroundMusic',
  manifest: assetManifest,
  images: [
    { key: assetManifest.backgrounds.tutorialGrove.key, url: tutorialGrove },
    { key: assetManifest.backgrounds.swampTrail.key, url: swampTrail },
    { key: assetManifest.backgrounds.ruinsGate.key, url: ruinsGate },
    { key: assetManifest.backgrounds.room_1.key, url: room1Background },
    { key: assetManifest.backgrounds.room_2.key, url: room2Background },
    { key: assetManifest.backgrounds.room_3.key, url: room3Background },
    { key: assetManifest.backgrounds.room_4.key, url: room4Background },
    { key: assetManifest.backgrounds.room_5.key, url: room5Background },
    { key: assetManifest.backgrounds.room_6.key, url: room6Background },
    { key: assetManifest.backgrounds.room_10.key, url: room10Background },
    // Player frames are real image files so production and localhost render
    // exactly the same single frame without runtime sprite-sheet slicing.
    ...playerIdleFrameImages,
    ...playerRunFrameImages,
    ...playerJumpFrameImages,
    { key: assetManifest.villain.key, url: villainIdle },
    { key: assetManifest.platforms.grass.key, url: platformGrass },
    { key: assetManifest.platforms.stone.key, url: platformStone },
    { key: assetManifest.platforms.wood.key, url: platformWood },
    { key: 'teacher-statue-elem12', url: questionStatueTile },
    ...slimeGreenFrameImages,
    ...slimeOrangeFrameImages,
  ],
  spritesheets: [
    { key: assetManifest.ghost.key, url: ghostSheet, frameConfig: { frameWidth: assetManifest.ghost.frameWidth, frameHeight: assetManifest.ghost.frameHeight } },
    { key: assetManifest.projectileCaster.key, url: elementalCasterSheet, frameConfig: { frameWidth: assetManifest.projectileCaster.frameWidth, frameHeight: assetManifest.projectileCaster.frameHeight } },
    { key: assetManifest.shadowSpirit.key, url: shadowSpiritSheet, frameConfig: { frameWidth: assetManifest.shadowSpirit.frameWidth, frameHeight: assetManifest.shadowSpirit.frameHeight } },
    { key: assetManifest.hunterEnemy.key, url: hunterEnemySheet, frameConfig: { frameWidth: assetManifest.hunterEnemy.frameWidth, frameHeight: assetManifest.hunterEnemy.frameHeight } },
    { key: assetManifest.bossEnemy.key, url: bossEnemySheet, frameConfig: { frameWidth: assetManifest.bossEnemy.frameWidth, frameHeight: assetManifest.bossEnemy.frameHeight } },
    { key: assetManifest.enemyProjectile.key, url: enemyProjectileSheet, frameConfig: { frameWidth: assetManifest.enemyProjectile.frameWidth, frameHeight: assetManifest.enemyProjectile.frameHeight } },
    { key: assetManifest.elementalProjectile.key, url: elementalProjectileSheet, frameConfig: { frameWidth: assetManifest.elementalProjectile.frameWidth, frameHeight: assetManifest.elementalProjectile.frameHeight } },
    { key: assetManifest.bossProjectile.key, url: bossProjectileSheet, frameConfig: { frameWidth: assetManifest.bossProjectile.frameWidth, frameHeight: assetManifest.bossProjectile.frameHeight } },
    { key: assetManifest.coin.key, url: coinSheet, frameConfig: { frameWidth: assetManifest.coin.frameWidth, frameHeight: assetManifest.coin.frameHeight } },
    { key: assetManifest.portal.key, url: portalSheet, frameConfig: { frameWidth: assetManifest.portal.frameWidth, frameHeight: assetManifest.portal.frameHeight } },
    { key: assetManifest.portal3.key, url: portalThreeSheet, frameConfig: { frameWidth: assetManifest.portal3.frameWidth, frameHeight: assetManifest.portal3.frameHeight } },
    { key: assetManifest.villain1Enemy.key, url: villain1EnemySheet, frameConfig: { frameWidth: assetManifest.villain1Enemy.frameWidth, frameHeight: assetManifest.villain1Enemy.frameHeight } },
    { key: assetManifest.villain1Projectile.key, url: villain1ProjectileSheet, frameConfig: { frameWidth: assetManifest.villain1Projectile.frameWidth, frameHeight: assetManifest.villain1Projectile.frameHeight } },
    { key: assetManifest.spiritBossEnemy.key, url: spiritBossSheet, frameConfig: { frameWidth: assetManifest.spiritBossEnemy.frameWidth, frameHeight: assetManifest.spiritBossEnemy.frameHeight } },
  ],
  audio: [
    { key: 'gameOneBackgroundMusic', url: gameOneBackgroundMusic },
    { key: assetManifest.sounds.backgroundTrack2.key, url: gameOneBackgroundMusic2 },
    { key: assetManifest.sounds.coin.key, url: soundCoin },
    { key: assetManifest.sounds.explosion.key, url: soundExplosion },
    { key: assetManifest.sounds.hurt.key, url: soundHurt },
    { key: assetManifest.sounds.jump.key, url: soundJump },
    { key: assetManifest.sounds.powerUp.key, url: soundPowerUp },
    { key: 'gameOneCelebration', url: soundCelebration },
    { key: 'gameOnePickupCoin', url: soundPickupCoin },
    { key: 'gameOneCharacterFiring', url: soundCharacterFiring },
    { key: 'gameOnePickupKey', url: soundPickupKey },
    { key: 'gameOnePickupPoison', url: soundPickupPoison },
    { key: 'gameOnePickupShield', url: soundPickupShield },
    { key: 'gameOnePickupHeart', url: soundPickupHeart },
    { key: 'gameOnePickupScroll', url: soundPickupScroll },
    { key: 'gameOneEnemyProjectileHit', url: soundEnemyProjectileHit },
    { key: 'gameOneDash', url: soundDash },
    { key: 'gameOneShieldHit', url: soundShieldHit },
    { key: 'gameOneSpikeHit', url: soundSpikeHit },
    { key: 'gameOneFallFromPlatform', url: soundFallFromPlatform },
    { key: 'gameOneCorrectAnswer', url: soundCorrectAnswer },
    { key: 'gameOneIncorrectAnswer', url: soundIncorrectAnswer },
    { key: 'gameOneTeleport', url: soundTeleport },
    { key: assetManifest.sounds.tap.key, url: soundTap }
  ]
};

export default gameOneRuntimeAssets;
