import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getPortalExitPosition,
  getLocalCellSpawn,
  getRoomWorldPosition,
  resolveLevelRestartPosition,
  resolveQuestionRestartPosition,
  resolveRespawnPosition,
  resolveRoomStartPosition,
  resolveTargetRoomEntryPosition,
} from '../systems/roomEntry';
import { buildWorldGridLayout } from '../systems/roomFlow';
import { shouldUsePortalOnlyRoomTraversal } from '../systems/roomTraversal';

describe('shouldUsePortalOnlyRoomTraversal', () => {
  it('renders scroll clue copy in the Phaser canvas so it remains visible on mobile', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');

    expect(source).toContain('const title = this.add.text');
    expect(source).toContain('const clue = this.add.text');
    expect(source).toContain("wordWrap: { width: innerTextWidth, useAdvancedWrap: true }");
    expect(source).toContain("const dismiss = this.add.text");
    expect(source).not.toContain('this.add.dom(centerX, centerY, cluePanelElement)');
  });

  it('routes hazards through immediate damage while respecting configured fire damage', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    const surfaces = readFileSync(resolve(process.cwd(), 'src/games/game-one/systems/treasureSurfaces.js'), 'utf8');

    expect(source).toContain("this.applyDamage(1, 'elemental', { respawn: true, immediate: true })");
    expect(source).toContain("const damageReason = caster.enemyType === 'elemental' ? 'elemental' : 'projectile'");
    expect(source).toContain('this.applyDamage(1, damageReason, { respawn: true, immediate: true })');
    expect(surfaces).toContain("scene.applyDamage(Number(config.damage) || 1, reason, { respawn: true, immediate: true })");
    expect(source).toContain("const isFireDamage = reason === 'fire' || reason === 'elemental'");
    expect(source).toContain('const resolvedDamage = Math.max(0, Number(amount) || 0)');
    expect(source).not.toContain('? Math.max(this.currentHealth, Number(amount) || 0)');
    expect(source).toContain('this.shieldCharges = 1');
    expect(source).not.toContain('this.shieldCharges += 1');
  });

  it('resets the player physics body to the resolved authored spawn', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');

    expect(source).toContain('this.player.body.reset(spawnPoint.x, spawnPoint.y)');
  });

  it('uses the authored world spawn so Level 1 begins in Room 1', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    const method = source.split('  getSpawnPoint() {')[1].split('\n  getQuestionTriggerLabel()')[0];
    const getSpawnPoint = new Function('getLocalCellSpawn', `return function() {${method}`)(getLocalCellSpawn);
    const worldLayout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      rooms: Array.from({ length: 5 }, (_, index) => ({
        id: `room-${index + 1}`, spawn: { x: 100, y: 570 },
      })),
    });
    const scene = { levelData: { levelNumber: 1 }, worldLayout, worldObjectsData: { spawn: { x: 120, y: 560 } } };
    expect(getSpawnPoint.call(scene)).toEqual({ x: 120, y: 560 });
  });

  it('returns a ghost to its authored spawn after it damages the player', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    const ghostSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/entities/GhostMinion.js'), 'utf8');

    expect(source).toContain('const healthBeforeContact = this.currentHealth');
    expect(source).toContain('ghost.resetToSpawn?.()');
    expect(ghostSource).toContain('resetToSpawn()');
    expect(ghostSource).toContain('this.body?.reset?.(this.spawnX, this.spawnY)');
    expect(ghostSource).toContain('const resetGraceMs = Math.max(900, this.chaseDelayMs)');
    expect(ghostSource).toContain('this.chaseEnabledAt = this.scene.time.now + resetGraceMs');
  });

  it('registers QuestionScene result listeners so gameplay unfreezes and restarts', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');

    expect(source).toContain("this.events.on('question:answered', this.handleQuestionAnswered, this)");
    expect(source).toContain("this.events.on('question:closed', this.handleQuestionClosed, this)");
    expect(source).toContain("this.events.on('question:hintPurchased', this.handleQuestionHintPurchased, this)");
  });

  it('opens the treasure question on first contact without portal debounce', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).toContain('if (!portal.isTreasureChest) {');
    expect(source).toContain('portal?.isTreasureChest && this.levelData?.treasureHunt');
    expect(source).toContain('? this.collectedScrollIds.size');
    expect(source).toContain('portal.requiredCoins > this.getCollectedRequirementCount(portal)');
    expect(source).toContain('this.openQuestionScene({');
    expect(source).toContain('this.openNearbyTreasureQuestion();');
    expect(source).toContain('Math.abs(Number(portal.x) - Number(this.player.x)) <= 72');
  });

  it('does not freeze an undefined player during early overlay updates', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).toContain('if (!this.player || !this.physics?.world) return;');
  });

  it('plays the Game 1 celebration sound when the level is completed', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).toContain("this.sound.play('gameOneCelebration', { volume: getStudentSfxVolume(1) })");
  });

  it('updates the player power-up aura for shield and jump pickups and damage', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).toContain('this.player.activateShieldAura?.()');
    expect(source).toContain('this.player.activateJumpBoost?.(10000)');
    expect(source).toContain("this.player.clearPowerUpAura?.('shield')");
  });

  it('removes speed and jump boosts on unshielded fire damage only', () => {
    const levelSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    const playerSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/entities/Player.js'), 'utf8');

    expect(levelSource).toContain("const isFireDamage = reason === 'fire' || reason === 'elemental'");
    expect(levelSource).toContain('this.player.clearSpeedAndJumpBoosts?.()');
    expect(playerSource).toContain('clearSpeedAndJumpBoosts()');
    expect(playerSource).toContain('this.speedBoostUntil = 0');
    expect(playerSource).toContain('this.jumpBoostUntil = 0');
  });

  it('uses the requested pickup, firing, poison, shield, and portal sounds', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).toContain("coin: 'gameOnePickupCoin'");
    expect(source).toContain("key: 'gameOnePickupKey'");
    expect(source).toContain("poison: 'gameOnePickupPoison'");
    expect(source).toContain("shield: 'gameOnePickupShield'");
    expect(source).toContain("health: 'gameOnePickupHeart'");
    expect(source).toContain('jump: this.manifest.sounds.powerUp.key');
    expect(source).toContain('speed: this.manifest.sounds.powerUp.key');
    expect(source).toContain("this.sound.play('gameOneCharacterFiring'");
    expect(source).toContain("this.sound.play('gameOneTeleport'");
    expect(source).toContain("this.sound.play('gameOneSpikeHit'");
    expect(source).toContain("this.sound.play('gameOneFallFromPlatform'");
    expect(source).toContain("scroll: 'gameOnePickupScroll'");
    expect(source).not.toContain("seek: 0.12");
    expect(source).not.toContain("this.sound.play('gameOneTreasureOpen'");
    expect(source).toContain("this.sound.play('gameOneShieldHit'");
    expect(source).toContain("this.sound.play('gameOneEnemyProjectileHit'");
    expect(source).toContain("this.sound.play('gameOneEnemyProjectileHit', { volume: getStudentSfxVolume(1) })");
    expect(source).toContain('this.worldLayout.bounds.bottom - 24');
    expect(source).toContain('this.fallWarningSoundPlayed = true');
    expect(source).toContain("reason === 'ghost' && this.cache.audio.exists(this.manifest.sounds.hurt.key)");
  });

  it('collects health pickups immediately and caps healing at max health', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(source).not.toContain("if (pickupType === 'health' && this.currentHealth >= this.maxHealth)");
    expect(source).toContain('this.currentHealth = Math.min(this.maxHealth, this.currentHealth + 1)');
  });

  it('fires elemental projectiles from the caster current floating position', () => {
    const casterSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/entities/ProjectileCaster.js'), 'utf8');
    const levelSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    expect(casterSource).toContain('x: this.x + (this.fireDirection * Math.max(34, halfWidth * 1.2))');
    expect(casterSource).toContain('y: this.y - Math.max(24, halfHeight * 0.55)');
    expect(levelSource).toContain("return this.manifest.elementalProjectile || this.manifest.enemyProjectile");
    expect(levelSource).toContain("? 'game-one-elemental-fire-projectile'");
  });

  it('enables portal-only traversal when the level explicitly requests it', () => {
    expect(shouldUsePortalOnlyRoomTraversal({ roomTraversalMode: 'PORTAL_ONLY' }, { portal: [] })).toBe(true);
  });

  it('enables portal-only traversal when a portal targets another room', () => {
    expect(shouldUsePortalOnlyRoomTraversal({}, {
      portal: [
        { x: 100, y: 200, targetRoomId: 'room-2' },
      ],
    })).toBe(true);
  });

  it('enables portal-only traversal for multi-room levels that use explicit portals', () => {
    expect(shouldUsePortalOnlyRoomTraversal({
      grid: {
        cells: [
          { id: 'room-1', col: 0, row: 0 },
          { id: 'room-2', col: 1, row: 0 },
        ],
      },
    }, {
      portal: [
        { x: 1135, y: 556, linkName: '' },
      ],
    })).toBe(true);
  });

  it('does not enable portal-only traversal for non-room portals', () => {
    expect(shouldUsePortalOnlyRoomTraversal({}, {
      portal: [
        { x: 100, y: 200, endsLevel: true },
        { x: 300, y: 200, linkName: 'alpha' },
      ],
    })).toBe(false);
  });
});

describe('room entry helpers', () => {
  it('preserves and resolves an authored room spawn for treasure-failure restarts', () => {
    const layout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      rooms: [
        { id: 'room-1', spawn: { x: 120, y: 570 } },
        { id: 'room-5', spawn: { x: 100, y: 570 } },
      ],
    });

    expect(getLocalCellSpawn(layout.byId.get('room-5'))).toEqual({
      x: 1380,
      y: 570,
    });
  });

  it('resolves the fixed Room 5 retry point on the far-left start platform', () => {
    const layout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      rooms: Array.from({ length: 5 }, (_, index) => ({ id: `room-${index + 1}` })),
    });

    expect(getRoomWorldPosition(layout.byId.get('room-5'), { x: 100, y: 570 })).toEqual({
      x: 5220,
      y: 570,
    });
  });

  it('prefers the saved checkpoint position over the room spawn on restart', () => {
    expect(resolveRespawnPosition(
      { x: 920, y: 312 },
      { x: 140, y: 560 },
    )).toEqual({
      x: 920,
      y: 312,
    });
  });

  it('falls back to the room spawn when no saved checkpoint exists', () => {
    expect(resolveRespawnPosition(
      null,
      { x: 140, y: 560 },
    )).toEqual({
      x: 140,
      y: 560,
    });
  });

  it('prefers the saved room checkpoint over the question trigger position on wrong-answer restart', () => {
    expect(resolveQuestionRestartPosition({
      checkpointPosition: { x: 1080, y: 312 },
      triggerPosition: { x: 360, y: 490 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 1080,
      y: 312,
    });
  });

  it('uses the saved room start position instead of a newly computed entry position when returning to a room', () => {
    expect(resolveRoomStartPosition({
      savedRoomStartPosition: { x: 1080, y: 312 },
      entryPosition: { x: 220, y: 560 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 1080,
      y: 312,
    });
  });

  it('uses the current room entry position when no room start position has been saved yet', () => {
    expect(resolveRoomStartPosition({
      savedRoomStartPosition: null,
      entryPosition: { x: 220, y: 560 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 220,
      y: 560,
    });
  });

  it('uses the trigger position when no room checkpoint was saved', () => {
    expect(resolveQuestionRestartPosition({
      checkpointPosition: null,
      triggerPosition: { x: 360, y: 490 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 360,
      y: 490,
    });
  });

  it('uses room 1 saved start position for damage restarts', () => {
    expect(resolveLevelRestartPosition({
      firstRoomStartPosition: { x: 180, y: 560 },
      firstRoomSpawnPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 180,
      y: 560,
    });
  });

  it('falls back to room 1 spawn for damage restarts when no saved room 1 start exists', () => {
    expect(resolveLevelRestartPosition({
      firstRoomStartPosition: null,
      firstRoomSpawnPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 140,
      y: 560,
    });
  });

  it('places the player just outside the destination portal exit', () => {
    expect(getPortalExitPosition(
      { left: 0, right: 2560 },
      { x: 1135, y: 556 },
      { x: 1280, y: 556 },
    )).toEqual({
      x: 1336,
      y: 548,
    });
  });

  it('uses the target room start position for room-target portal travel', () => {
    expect(resolveTargetRoomEntryPosition({
      targetRecord: {
        origin: { x: 1280, y: 0 },
        cell: {
          spawn: { x: 140, y: 560 },
        },
      },
    })).toEqual({
      x: 1420,
      y: 560,
    });
  });

  it('falls back to the room spawn when no return portal exists', () => {
    expect(resolveTargetRoomEntryPosition({
      targetRecord: {
        origin: { x: 1280, y: 0 },
        cell: {
          spawn: { x: 140, y: 560 },
        },
      },
    })).toEqual({
      x: 1420,
      y: 560,
    });
  });
});
