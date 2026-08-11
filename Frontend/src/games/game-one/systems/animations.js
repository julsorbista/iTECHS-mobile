export const registerGameOneAnimations = (scene, manifest) => {
  const playerIdleEndFrame = Math.max(0, Number(manifest.player?.frameCount || 1) - 1);
  const playerRunEndFrame = Math.max(0, Number(manifest.playerRun?.frameCount || 1) - 1);
  const playerJumpEndFrame = Math.max(0, Number(manifest.playerJump?.frameCount || 1) - 1);
  const portalEndFrame = Math.max(0, Number(manifest.portal?.frameCount || 4) - 1);
  const portalThreeEndFrame = Math.max(0, Number(manifest.portal3?.frameCount || 4) - 1);
  const villain1EndFrame = Math.max(0, Number(manifest.villain1Enemy?.frameCount || 1) - 1);
  const villain1ProjectileEndFrame = Math.max(0, Number(manifest.villain1Projectile?.frameCount || 1) - 1);
  const spiritBossEndFrame = Math.max(0, Number(manifest.spiritBossEnemy?.frameCount || 32) - 1);
  const spiritBossRunStart = Math.min(4, spiritBossEndFrame);
  const spiritBossRunEnd = Math.min(7, spiritBossEndFrame);
  const spiritBossAttackStart = Math.min(12, spiritBossEndFrame);
  const spiritBossAttackEnd = Math.min(15, spiritBossEndFrame);
  const slimeGreenFrameCount = Math.max(1, Number(manifest.slimeGreen?.frameCount || 1));
  const slimeOrangeFrameCount = Math.max(1, Number(manifest.slimeOrange?.frameCount || 1));

  const toImageSequenceFrames = (textureKey, frameCount) => {
    const safeTextureKey = typeof textureKey === 'string' ? textureKey.trim() : '';
    if (!safeTextureKey) {
      return [];
    }

    const safeCount = Math.max(1, Number(frameCount) || 1);
    if (safeCount <= 1) {
      return [{ key: safeTextureKey }];
    }

    return Array.from({ length: safeCount }, (_, index) => ({
      key: `${safeTextureKey}-frame-${String(index).padStart(2, '0')}`,
    }));
  };

  if (!scene.anims.exists('game-one-player-idle')) {
    scene.anims.create({
      key: 'game-one-player-idle',
      frames: scene.anims.generateFrameNumbers(manifest.player.key, { start: 0, end: playerIdleEndFrame }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-player-run')) {
    scene.anims.create({
      key: 'game-one-player-run',
      frames: scene.anims.generateFrameNumbers(manifest.playerRun.key, { start: 0, end: playerRunEndFrame }),
      frameRate: 16,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-player-jump')) {
    scene.anims.create({
      key: 'game-one-player-jump',
      frames: scene.anims.generateFrameNumbers(manifest.playerJump.key, { start: 0, end: playerJumpEndFrame }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-ghost-float')) {
    scene.anims.create({
      key: 'game-one-ghost-float',
      frames: scene.anims.generateFrameNumbers(manifest.ghost.key, { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-caster-idle')) {
    scene.anims.create({
      key: 'game-one-caster-idle',
      frames: scene.anims.generateFrameNumbers(manifest.projectileCaster.key, { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-hunter-hover')) {
    scene.anims.create({
      key: 'game-one-hunter-hover',
      frames: scene.anims.generateFrameNumbers(manifest.hunterEnemy.key, { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-boss-idle')) {
    scene.anims.create({
      key: 'game-one-boss-idle',
      frames: scene.anims.generateFrameNumbers(manifest.bossEnemy.key, { start: 0, end: 7 }),
      frameRate: 9,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-projectile-float')) {
    scene.anims.create({
      key: 'game-one-projectile-float',
      frames: scene.anims.generateFrameNumbers(manifest.enemyProjectile.key, { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-boss-projectile-float')) {
    scene.anims.create({
      key: 'game-one-boss-projectile-float',
      frames: scene.anims.generateFrameNumbers(manifest.bossProjectile.key, { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-coin-spin')) {
    scene.anims.create({
      key: 'game-one-coin-spin',
      frames: scene.anims.generateFrameNumbers(manifest.coin.key, { start: 0, end: 6 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-portal-spin')) {
    scene.anims.create({
      key: 'game-one-portal-spin',
      frames: scene.anims.generateFrameNumbers(manifest.portal.key, { start: 0, end: portalEndFrame }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (manifest.portal3?.key && !scene.anims.exists('game-one-portal3-spin')) {
    scene.anims.create({
      key: 'game-one-portal3-spin',
      frames: scene.anims.generateFrameNumbers(manifest.portal3.key, { start: 0, end: portalThreeEndFrame }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (manifest.villain1Enemy?.key && !scene.anims.exists('game-one-villain1-hover')) {
    scene.anims.create({
      key: 'game-one-villain1-hover',
      frames: scene.anims.generateFrameNumbers(manifest.villain1Enemy.key, { start: 0, end: villain1EndFrame }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (manifest.villain1Projectile?.key && !scene.anims.exists('game-one-villain1-projectile')) {
    scene.anims.create({
      key: 'game-one-villain1-projectile',
      frames: scene.anims.generateFrameNumbers(manifest.villain1Projectile.key, { start: 0, end: villain1ProjectileEndFrame }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (manifest.spiritBossEnemy?.key && !scene.anims.exists('game-one-spirit-boss-run')) {
    scene.anims.create({
      key: 'game-one-spirit-boss-run',
      frames: scene.anims.generateFrameNumbers(manifest.spiritBossEnemy.key, { start: spiritBossRunStart, end: spiritBossRunEnd }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (manifest.spiritBossEnemy?.key && !scene.anims.exists('game-one-spirit-boss-attack')) {
    scene.anims.create({
      key: 'game-one-spirit-boss-attack',
      frames: scene.anims.generateFrameNumbers(manifest.spiritBossEnemy.key, { start: spiritBossAttackStart, end: spiritBossAttackEnd }),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (manifest.slimeGreen?.key && !scene.anims.exists('game-one-slime-green-move')) {
    scene.anims.create({
      key: 'game-one-slime-green-move',
      frames: toImageSequenceFrames(manifest.slimeGreen.key, slimeGreenFrameCount),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('game-one-statue-idle') && scene.textures.exists('statue-idle-sheet')) {
    scene.anims.create({
      key: 'game-one-statue-idle',
      frames: scene.anims.generateFrameNumbers('statue-idle-sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (manifest.slimeOrange?.key && !scene.anims.exists('game-one-slime-orange-move')) {
    scene.anims.create({
      key: 'game-one-slime-orange-move',
      frames: toImageSequenceFrames(manifest.slimeOrange.key, slimeOrangeFrameCount),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (manifest.slimeGreen?.key && !scene.anims.exists('game-one-slime-move')) {
    scene.anims.create({
      key: 'game-one-slime-move',
      frames: toImageSequenceFrames(manifest.slimeGreen.key, slimeGreenFrameCount),
      frameRate: 12,
      repeat: -1,
    });
  }
};

export const freezeAnimatedObject = (gameObject, frame = 0) => {
  if (!gameObject) {
    return;
  }

  if (gameObject.hoverTween?.stop) {
    gameObject.hoverTween.stop();
    gameObject.hoverTween = null;
  }

  if (gameObject.scene?.tweens) {
    gameObject.scene.tweens.killTweensOf(gameObject);
  }

  if (gameObject.anims) {
    try {
      gameObject.anims.stop();
    } catch (error) {
      // Some game objects may not have an active animation to stop.
    }
  }

  if (typeof gameObject.setFrame === 'function') {
    gameObject.setFrame(frame);
  }

  if (typeof gameObject.setVelocity === 'function') {
    gameObject.setVelocity(0, 0);
  }

  if (typeof gameObject.setAlpha === 'function' && gameObject.alpha === 0) {
    gameObject.setAlpha(1);
  }
};
