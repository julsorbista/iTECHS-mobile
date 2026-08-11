import Phaser from 'phaser';
import Player from '../entities/Player';
import Coin from '../entities/Coin';
import Portal from '../entities/Portal';
import GhostMinion from '../entities/GhostMinion';
import SlimeEnemy from '../entities/SlimeEnemy';
import VillainTrigger from '../entities/VillainTrigger';
import ProjectileCaster from '../entities/ProjectileCaster';
import EnemyProjectile from '../entities/EnemyProjectile';
import { createControls, readMovementIntent, wasPausePressed } from '../systems/controls';
import { normalizePlayerAbilityConfig } from '../systems/playerAbilityConfig';
import { resolvePortalQuestionId } from '../systems/portalLocks';
import { getPortalRoomId, isReturnToBlockedRoom } from '../systems/roomBacktrack';
import {
  getLocalCellSpawn,
  getPortalExitPosition,
  resolveLevelRestartPosition,
  resolveQuestionRestartPosition,
  resolveRespawnPosition,
  resolveRoomStartPosition,
  resolveTargetRoomEntryPosition,
} from '../systems/roomEntry';
import { shouldUsePortalOnlyRoomTraversal } from '../systems/roomTraversal';
import {
  getGameOneSurfaceGeometry,
  shouldProcessSurfaceCollision,
} from '../systems/surfaceGeometry';
import { buildWorldGridLayout, getCellCount, getCellRecordAtWorldPoint, getCellWorldBounds, getQuestionById } from '../systems/roomFlow';
import { buildQuestionRetryVariant, getQuestionTopicLabel } from '../systems/questionRetryVariants';
import { normalizeLevelData } from '../../../features/level-editor/levelEditorUtils';
import { getLevelEditorSource } from '../../../features/level-editor/levelEditorConfig';

const DANGER_SURGE_DURATION_MS = 7000;
const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const RENDER_LAYER_BACK = 'back';
const RENDER_LAYER_FRONT = 'front';
const BACKGROUND_TILE_BACK_DEPTH_BASE = -8;
const BACKGROUND_TILE_FRONT_DEPTH_BASE = 8;
const WORLD_OBJECT_BACK_DEPTH_BASE = -2;
const WORLD_OBJECT_FRONT_DEPTH_BASE = 6;

const normalizeLevelSettings = (settings = {}) => {
  const playerHealth = Number(settings.playerHealth);
  const timerSeconds = Number(settings.timerSeconds);

  return {
    playerHealth: Number.isFinite(playerHealth) ? Phaser.Math.Clamp(Math.round(playerHealth), 1, 10) : 3,
    timerEnabled: Boolean(settings.timerEnabled),
    timerSeconds: Number.isFinite(timerSeconds) ? Phaser.Math.Clamp(Math.round(timerSeconds), 10, 3600) : 120,
    allowMidairDash: settings.allowMidairDash !== false,
    allowProjectile: settings.allowProjectile !== false,
    allowDoubleJump: settings.allowDoubleJump !== false,
    debugInvisibleCollision: Boolean(settings.debugInvisibleCollision),
  };
};

const normalizeHintCoinCost = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Phaser.Math.Clamp(Math.round(parsed), 0, 3) : 1;
};

const normalizeCharacterRenderLayer = (value, fallback = RENDER_LAYER_BACK) => {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';

  if (normalized === RENDER_LAYER_FRONT) {
    return RENDER_LAYER_FRONT;
  }

  if (normalized === RENDER_LAYER_BACK) {
    return RENDER_LAYER_BACK;
  }

  return fallback === RENDER_LAYER_FRONT ? RENDER_LAYER_FRONT : RENDER_LAYER_BACK;
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSurfaceDedupKey = (config, index = 0) => {
  const idKey = typeof config?.id === 'string' && config.id.trim()
    ? `id:${config.id.trim()}`
    : `idx:${index}`;

  return [
    idKey,
    Math.round(toFiniteNumber(config?.x, 0)),
    Math.round(toFiniteNumber(config?.y, 0)),
    Math.round(toFiniteNumber(config?.width, 0)),
    Math.round(toFiniteNumber(config?.height, 0)),
    Boolean(config?.invisible) ? 'invisible' : 'visible',
    typeof config?.textureKey === 'string' ? config.textureKey : '',
  ].join('|');
};

const dedupeSurfaceConfigs = (configs = []) => {
  const seenKeys = new Set();

  return configs.filter((config, index) => {
    const key = buildSurfaceDedupKey(config, index);
    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
};

export default class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  create() {
    const bootPayload = this.game.__ITECHS_BOOT__ || {};
    this.runtimeAssets = bootPayload.runtimeAssets;
    this.callbacks = bootPayload.callbacks || {};
    this.manifest = this.runtimeAssets.manifest;
    const source = getLevelEditorSource(bootPayload.levelData?.gameType || 'GAME_ONE') || { gameType: 'GAME_ONE', defaultLevelNumber: bootPayload.levelData?.levelNumber || 1, runtimeAssets: this.runtimeAssets };
    this.levelData = normalizeLevelData(bootPayload.levelData, { ...source, runtimeAssets: this.runtimeAssets });
    this.worldObjectsData = this.levelData.worldObjects || {};
    this.worldLayout = buildWorldGridLayout(this.levelData);

    this.controls = null;
    this.sceneObjects = [];
    this.ghosts = [];
    this.projectileCasters = [];
    this.bossEntities = [];
    this.projectiles = [];
    this.playerProjectiles = [];
    this.staticBodies = [];
    this.surfaceEntries = [];
    this.surfaceCollisionTargets = [];
    this.portals = [];
    this.portalsByLinkName = new Map();
    this.villains = [];
    this.questionBarriers = new Map();
    this.questionUnlockPlatforms = new Map();
    this.questionPortals = new Map();
    this.questionTriggerPlatforms = new Map();
    this.triggerPlatformRecords = [];
    this.questionHintProgress = new Map();
    this.questionRetryCounts = new Map();
    this.completedQuestions = new Set();
    this.requiredStatueQuestionIds = this.collectRequiredStatueQuestionIds();
    this.collectedCoinIds = new Set();
    this.totalCoins = (this.worldObjectsData.coins || []).length;
    this.coinGoal = this.resolveCoinGoal();
    this.levelSettings = normalizeLevelSettings(this.levelData?.settings);
    this.requireBossDefeat = Boolean(this.levelData?.settings?.requireBossDefeat);
    this.maxHealth = this.levelSettings.playerHealth;
    this.currentHealth = this.levelSettings.playerHealth;
    this.allowMidairDash = this.levelSettings.allowMidairDash;
    this.allowProjectile = this.levelSettings.allowProjectile;
    this.coinsCollected = 0;
    this.coinBalance = 0;
    this.wrongAnswers = 0;
    this.hintsUsed = 0;
    this.hintCoinCost = normalizeHintCoinCost(bootPayload.hintCoinCost ?? bootPayload.hintStarCost);
    this.isPaused = false;
    this.isInteractionLocked = false;
    this.hasFinished = false;
    this.damageCooldownUntil = 0;
    this.damageTween = null;
    this.questionCooldownUntil = 0;
    this.playerProjectileCooldownUntil = 0;
    this.playerShotsFired = 0;
    this.playerShotsHit = 0;
    this.dangerSurgeUntil = 0;
    this.dangerStateActive = false;
    this.lastStatueHintAt = 0;
    this.guidedStatue = null;
    this.activeInteractableVillain = null;
    this.interactionPrompt = null;
    this.objectiveLockUntil = 0;
    this.levelStartedAt = Date.now();
    this.timerEnabled = this.levelSettings.timerEnabled;
    this.remainingTimeMs = this.timerEnabled ? (this.levelSettings.timerSeconds * 1000) : 0;
    this.lastTimerSecond = null;
    this.currentCellRecord = this.worldLayout.cells[0] || null;
    this.activeQuestionContext = null;
    this.backgroundMusic = null;
    this.blockedReturnRoomId = null;
    this.portalRoomTraversalOnly = shouldUsePortalOnlyRoomTraversal(this.levelData, this.worldObjectsData);
    this.roomStartPositions = new Map();

    this.physics.world.setBounds(this.worldLayout.bounds.left, this.worldLayout.bounds.top, this.worldLayout.bounds.width, this.worldLayout.bounds.height);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(this.worldLayout.bounds.left, this.worldLayout.bounds.top, this.worldLayout.bounds.width, this.worldLayout.bounds.height);
    this.cameras.main.fadeIn(260, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);

    const spawnConfig = this.worldObjectsData.spawn && typeof this.worldObjectsData.spawn === 'object'
      ? this.worldObjectsData.spawn
      : {};
    this.allowMidairDash = spawnConfig.allowMidairDash !== false && this.levelSettings.allowMidairDash;
    this.allowProjectile = spawnConfig.allowProjectile !== false && this.levelSettings.allowProjectile;
    this.allowDoubleJump = spawnConfig.allowDoubleJump !== false && this.levelSettings.allowDoubleJump;
    this.playerAbilityConfig = normalizePlayerAbilityConfig(spawnConfig);
    this.controls = createControls(this, this.playerAbilityConfig, bootPayload.mobileControls);
    const spawnPoint = this.getSpawnPoint();
    this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.manifest.player, {
      ...spawnConfig,
      ...this.playerAbilityConfig,
      allowDoubleJump: this.allowDoubleJump,
    });

    const currentCellRecord = getCellRecordAtWorldPoint(this.worldLayout, spawnPoint.x, spawnPoint.y)
      || this.worldLayout.cells[0]
      || null;
    this.currentCellRecord = currentCellRecord;
    this.saveRoomStartPosition(currentCellRecord, spawnPoint);

    if (currentCellRecord) {
      const cellBounds = currentCellRecord.bounds;
      const paddingFactor = 1;
      const zoomLevel = Math.min(
        (this.cameras.main.width * paddingFactor) / cellBounds.width,
        (this.cameras.main.height * paddingFactor) / cellBounds.height
      );
      this.cameras.main.setZoom(Math.max(0.25, Math.min(2.5, zoomLevel)));
      this.updateCameraBoundsForCell(currentCellRecord, { snap: true });
    }

    this.time.delayedCall(1800, () => {
      this.updateCameraBoundsForCell(this.currentCellRecord, { snap: true });
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    });

    this.events.on('question:answered', this.handleQuestionAnswered, this);
    this.events.on('question:hintPurchased', this.handleQuestionHintPurchased, this);
    this.events.on('question:closed', this.handleQuestionClosed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('question:answered', this.handleQuestionAnswered, this);
      this.events.off('question:hintPurchased', this.handleQuestionHintPurchased, this);
      this.events.off('question:closed', this.handleQuestionClosed, this);
      this.stopBackgroundMusic();
      this.scene.stop('HudScene');
      this.scene.stop('QuestionScene');
    });

    this.registry.set('totalCoins', this.totalCoins);
    this.registry.set('coinsCollected', this.coinsCollected);
    this.registry.set('coinBalance', this.coinBalance);
    this.registry.set('roomCount', getCellCount(this.levelData));
    this.registry.set('maxHealth', this.maxHealth);
    this.registry.set('health', this.currentHealth);
    this.registry.set('timerEnabled', this.timerEnabled);
    this.registry.set('coinGoal', this.coinGoal);
    this.registry.set('statueProgress', '0/0');
    this.registry.set('missionStage', 'INIT');
    this.registry.set('missionPrimary', 'Preparing mission...');
    this.registry.set('missionSecondary', '');
    this.registry.set('dangerActive', false);
    this.registry.set('shotsFired', 0);
    this.registry.set('shotsHit', 0);
    this.registry.set('bossRemaining', 0);
    this.syncTimerRegistry(true);
    this.startBackgroundMusic();

    this.buildWorld();
    this.createInteractionPrompt();
    this.syncCurrentCellFromPlayer(true);
    this.syncMissionRegistry(true);
    this.showMissionBriefing();
  }

  startBackgroundMusic() {
    const backgroundMusicKey = this.runtimeAssets?.backgroundMusicKey;
    if (!backgroundMusicKey || !this.cache.audio.exists(backgroundMusicKey)) {
      return;
    }

    const playTrack = () => {
      if (!this.backgroundMusic) {
        this.backgroundMusic = this.sound.add(backgroundMusicKey, {
          loop: true,
          volume: 0.38,
        });
      }

      if (!this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      }
    };

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, playTrack);
      return;
    }

    playTrack();
  }

  stopBackgroundMusic() {
    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.stop();
    this.backgroundMusic.destroy();
    this.backgroundMusic = null;
  }

  resolveRenderLayerDepth(renderLayer, {
    backBase = WORLD_OBJECT_BACK_DEPTH_BASE,
    frontBase = WORLD_OBJECT_FRONT_DEPTH_BASE,
    index = 0,
  } = {}) {
    const layer = normalizeCharacterRenderLayer(renderLayer);
    const baseDepth = layer === RENDER_LAYER_FRONT ? frontBase : backBase;
    return baseDepth + (Number(index) * 0.0001);
  }

  buildWorld() {
    this.worldLayout.cells.forEach((cellRecord) => {
      const colorHex = typeof cellRecord.cell?.backgroundColor === 'string'
        ? cellRecord.cell.backgroundColor.trim()
        : DEFAULT_ROOM_BACKGROUND_COLOR;
      const normalizedHex = /^#[0-9a-fA-F]{6}$/.test(colorHex)
        ? colorHex
        : DEFAULT_ROOM_BACKGROUND_COLOR;
      const colorValue = Number.parseInt(normalizedHex.slice(1), 16);

      this.sceneObjects.push(
        this.add
          .rectangle(
            cellRecord.bounds.centerX,
            cellRecord.bounds.centerY,
            cellRecord.bounds.width,
            cellRecord.bounds.height,
            colorValue,
            1,
          )
          .setDepth(-12),
      );

      const backgroundKey = this.manifest.backgrounds[cellRecord.cell.backgroundKey]?.key;
      if (backgroundKey) {
        this.sceneObjects.push(
          this.add
            .image(cellRecord.bounds.centerX, cellRecord.bounds.centerY, backgroundKey)
            .setDisplaySize(cellRecord.bounds.width, cellRecord.bounds.height)
            .setDepth(-11),
        );
      }
    });

    const backgroundTiles = Array.isArray(this.worldObjectsData.backgroundTiles)
      ? [...this.worldObjectsData.backgroundTiles]
      : [];

    backgroundTiles
      .map((tileConfig, index) => ({
        tileConfig,
        index,
        renderLayer: normalizeCharacterRenderLayer(tileConfig?.renderLayer),
        zIndex: Number.isFinite(Number(tileConfig?.zIndex))
          ? Number(tileConfig.zIndex)
          : index,
      }))
      .sort((left, right) => {
        if (left.renderLayer !== right.renderLayer) {
          return left.renderLayer === RENDER_LAYER_FRONT ? 1 : -1;
        }

        if (left.zIndex !== right.zIndex) {
          return left.zIndex - right.zIndex;
        }

        return left.index - right.index;
      })
      .forEach(({ tileConfig, index, renderLayer }) => {
      const textureKey = typeof tileConfig?.textureKey === 'string' ? tileConfig.textureKey.trim() : '';
      if (!textureKey || !this.textures.exists(textureKey)) {
        return;
      }

      const size = Phaser.Math.Clamp(Math.round(Number(tileConfig.size) || 96), 16, 1024);
      const x = Number(tileConfig.x);
      const y = Number(tileConfig.y);
      const tileX = Number.isFinite(x) ? x : 640;
      const tileY = Number.isFinite(y) ? y : 360;
      const rotationDeg = ((Math.round(Number(tileConfig.rotationDeg) || 0) % 360) + 360) % 360;
      const flipX = Boolean(tileConfig.flipX);
      const flipY = Boolean(tileConfig.flipY);
      const blendMode = String(tileConfig?.blendMode || '').trim().toLowerCase();

      const tileImage = this.add
        .image(tileX, tileY, textureKey)
        .setAngle(rotationDeg)
        .setFlip(flipX, flipY)
        .setDepth(this.resolveRenderLayerDepth(renderLayer, {
          backBase: BACKGROUND_TILE_BACK_DEPTH_BASE,
          frontBase: BACKGROUND_TILE_FRONT_DEPTH_BASE,
          index,
        }));

      const sourceWidth = Number(tileImage.width) || 0;
      if (sourceWidth > 0) {
        const uniformScale = size / sourceWidth;
        tileImage.setScale(uniformScale, uniformScale);
      } else {
        tileImage.setDisplaySize(size, size);
      }

      if (blendMode === 'screen') {
        tileImage.setBlendMode(Phaser.BlendModes.SCREEN);
      }

      this.sceneObjects.push(tileImage);
    });

    const invisiblePlatformConfigs = Array.isArray(this.worldObjectsData.invisiblePlatforms)
      ? this.worldObjectsData.invisiblePlatforms
      : [];
    const mergedPlatformConfigs = dedupeSurfaceConfigs([
      ...(this.worldObjectsData.platforms || []),
      ...invisiblePlatformConfigs.map((config) => ({
        ...config,
        invisible: true,
        collisionMode: typeof config?.collisionMode === 'string' && config.collisionMode.trim()
          ? config.collisionMode
          : 'SOLID',
      })),
    ]);

    mergedPlatformConfigs.forEach((config) => this.createSolidSurface(config));
    (this.worldObjectsData.unlockPlatforms || []).forEach((config) => this.registerQuestionTarget(this.questionUnlockPlatforms, config.lockedByQuestionId, this.createSolidSurface(config, { startsHidden: Boolean(config.startsHidden) })));
    (this.worldObjectsData.barriers || []).forEach((config) => this.registerQuestionTarget(this.questionBarriers, config.lockedByQuestionId, this.createSolidSurface(config)));
    (this.worldObjectsData.triggerPlatforms || []).forEach((config) => {
      const record = this.createTriggerPlatform(config);
      if (record) {
        this.triggerPlatformRecords.push(record);
      }
    });

    (this.worldObjectsData.coins || []).filter((coinConfig) => !this.collectedCoinIds.has(coinConfig.id)).forEach((coinConfig) => {
      const coin = new Coin(this, coinConfig.x, coinConfig.y, this.manifest.coin, coinConfig);
      coin.setDepth(this.resolveRenderLayerDepth(coinConfig.renderLayer));
      coin.coinId = coinConfig.id;
      this.physics.add.overlap(this.player, coin, this.handleCoinPickup, null, this);
      this.sceneObjects.push(coin);
    });

    (this.worldObjectsData.ghosts || []).forEach((ghostConfig) => {
      const enemyType = this.normalizeGhostEnemyType(ghostConfig.enemyType);
      const enemyManifest = this.resolveGhostEnemyManifest(enemyType);
      const enemyAnimation = this.resolveGhostEnemyAnimationConfig(enemyType);
      const ghost = enemyType === 'ghost'
        ? new GhostMinion(this, ghostConfig.x, ghostConfig.y, enemyManifest, {
          ...ghostConfig,
          enemyType,
        })
        : new SlimeEnemy(this, ghostConfig.x, ghostConfig.y, enemyManifest, {
          ...ghostConfig,
          enemyType,
          animationKey: enemyAnimation.animationKey,
          frameKeys: enemyAnimation.frameKeys,
        });

      ghost.enemyType = enemyType;
      ghost.setDepth(this.resolveRenderLayerDepth(ghostConfig.renderLayer));
      this.physics.add.overlap(this.player, ghost, () => this.applyDamage(1, enemyType, { respawn: true }), null, this);
      this.registerSurfaceCollisionTarget(ghost);

      this.ghosts.push(ghost);
      this.sceneObjects.push(ghost);
    });

    (this.worldObjectsData.projectileEnemies || []).forEach((projectileConfig) => {
      const enemyType = this.normalizeEnemyType(projectileConfig.enemyType);
      const enemyManifest = this.resolveProjectileEnemyManifest(enemyType);
      const projectileManifest = this.resolveProjectileManifest(enemyType);
      const projectileAnimationKey = enemyType === 'boss' || enemyType === 'spiritboss'
        ? 'game-one-boss-projectile-float'
        : enemyType === 'villain1'
          ? 'game-one-villain1-projectile'
        : 'game-one-projectile-float';
      const animationKey = enemyType === 'villain1'
        ? 'game-one-villain1-hover'
        : (enemyType === 'spiritboss' ? 'game-one-spirit-boss-run' : undefined);
      const warningAnimationKey = enemyType === 'spiritboss'
        ? 'game-one-spirit-boss-attack'
        : null;
      const caster = new ProjectileCaster(this, projectileConfig.x, projectileConfig.y, enemyManifest, {
        ...projectileConfig,
        enemyType,
        projectileManifest,
        projectileAnimationKey,
        animationKey,
        warningAnimationKey,
        baseTint: enemyType === 'spiritboss' ? 0x67e8f9 : undefined,
        warningTint: enemyType === 'spiritboss' ? 0x22d3ee : undefined,
      });
      caster.setDepth(this.resolveRenderLayerDepth(projectileConfig.renderLayer));
      if (enemyType === 'elemental') {
        this.physics.add.overlap(this.player, caster, () => this.applyDamage(1, 'elemental', { respawn: true }), null, this);
      }
      this.registerSurfaceCollisionTarget(caster);
      this.projectileCasters.push(caster);
      if (enemyType === 'boss' || enemyType === 'spiritboss') {
        this.bossEntities.push(caster);
      }
      this.sceneObjects.push(caster);
    });

    this.getVillainConfigs().forEach((villainConfig) => {
      const villain = new VillainTrigger(this, villainConfig.x, villainConfig.y, this.manifest.villain, villainConfig);
      villain.damageOnWrongAnswer = this.normalizeQuestionDamageAmount(villainConfig.damageOnWrongAnswer);
      villain.setDepth(this.resolveRenderLayerDepth(villainConfig.renderLayer));
      villain.setQuestionState(this.completedQuestions.has(villainConfig.questionId) ? 'ANSWERED' : 'UNANSWERED', { animate: false });
      this.physics.add.overlap(this.player, villain, () => this.handleVillainTouch(villain), null, this);
      this.villains.push(villain);
      this.sceneObjects.push(villain);
    });

    const villainConfigs = this.getVillainConfigs();
    this.getPortalConfigs().forEach((portalConfig, index) => {
      const variant = typeof portalConfig?.variant === 'string'
        ? portalConfig.variant.trim().toLowerCase()
        : '';
      const resolvedQuestionId = resolvePortalQuestionId(portalConfig, villainConfigs, this.worldLayout);
      const portalManifest = this.resolvePortalManifest(variant);
      const portal = new Portal(this, portalConfig.x, portalConfig.y, portalManifest, {
        ...portalConfig,
        questionId: resolvedQuestionId || null,
        animationKey: this.resolvePortalAnimationKey(variant),
      });
      portal.setDepth(this.resolveRenderLayerDepth(portalConfig.renderLayer));
      portal.portalIndex = index;
      portal.touchCooldownUntil = 0;
      portal.lockedByConfig = Boolean(portalConfig.locked) && !resolvedQuestionId;
      if (resolvedQuestionId && !this.completedQuestions.has(resolvedQuestionId)) {
        portal.setLocked(true);
      }
      this.physics.add.overlap(this.player, portal, () => this.handlePortalTouch(portal), null, this);
      this.registerQuestionTarget(this.questionPortals, resolvedQuestionId, portal);
      this.registerPortalLink(portal);
      this.portals.push(portal);
      this.sceneObjects.push(portal);
    });

    this.syncEndingPortalLocks();
  }

  getVillainConfigs() {
    const rawVillain = this.worldObjectsData?.villain;

    if (Array.isArray(rawVillain)) {
      return rawVillain.filter((entry) => entry && typeof entry === 'object');
    }

    return rawVillain && typeof rawVillain === 'object' ? [rawVillain] : [];
  }

  collectRequiredStatueQuestionIds() {
    return this.getVillainConfigs().reduce((accumulator, villainConfig) => {
      const appearance = typeof villainConfig?.appearance === 'string'
        ? villainConfig.appearance.trim().toUpperCase()
        : '';
      const questionId = typeof villainConfig?.questionId === 'string'
        ? villainConfig.questionId.trim()
        : '';

      if (appearance === 'STATUE' && questionId) {
        accumulator.add(questionId);
      }

      return accumulator;
    }, new Set());
  }

  getStatueQuestionProgress() {
    const total = this.requiredStatueQuestionIds.size;
    if (!total) {
      return { total: 0, answered: 0 };
    }

    let answered = 0;
    this.requiredStatueQuestionIds.forEach((questionId) => {
      if (this.completedQuestions.has(questionId)) {
        answered += 1;
      }
    });

    return { total, answered };
  }

  areAllRequiredStatuesAnswered() {
    const { total, answered } = this.getStatueQuestionProgress();
    return total === 0 || answered >= total;
  }

  normalizeEnemyType(value) {
    if (typeof value !== 'string') {
      return 'elemental';
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'ghost') {
      return 'ghost';
    }

    if (normalized === 'hunter') {
      return 'hunter';
    }

    if (normalized === 'boss') {
      return 'boss';
    }

    if (normalized === 'villain1') {
      return 'villain1';
    }

    if (normalized === 'slimegreen' || normalized === 'slime-green') {
      return 'slimegreen';
    }

    if (normalized === 'slimeorange' || normalized === 'slime-orange' || normalized === 'slimepurple' || normalized === 'slime-purple') {
      return 'slimeorange';
    }

    if (normalized === 'spiritboss' || normalized === 'spirit-boss' || normalized === 'boss6') {
      return 'spiritboss';
    }

    if (normalized === 'caster') {
      return 'elemental';
    }

    return 'elemental';
  }

  normalizeGhostEnemyType(value) {
    const normalized = this.normalizeEnemyType(value);
    if (normalized === 'slimegreen' || normalized === 'slimeorange') {
      return normalized;
    }

    return 'ghost';
  }

  buildManifestImageFrameKeys(manifestEntry) {
    const textureKey = typeof manifestEntry?.key === 'string' ? manifestEntry.key.trim() : '';
    if (!textureKey) {
      return [];
    }

    const frameCount = Math.max(1, Number(manifestEntry?.frameCount || 1));
    if (frameCount <= 1) {
      return [textureKey];
    }

    return Array.from({ length: frameCount }, (_, index) => `${textureKey}-frame-${String(index).padStart(2, '0')}`);
  }

  resolveGhostEnemyManifest(enemyType) {
    if (enemyType === 'slimegreen') {
      return this.manifest.slimeGreen || this.manifest.ghost;
    }

    if (enemyType === 'slimeorange') {
      return this.manifest.slimeOrange || this.manifest.slimePurple || this.manifest.ghost;
    }

    return this.manifest.ghost;
  }

  resolveGhostEnemyAnimationConfig(enemyType) {
    if (enemyType === 'slimegreen') {
      return {
        animationKey: 'game-one-slime-green-move',
        frameKeys: this.buildManifestImageFrameKeys(this.manifest.slimeGreen),
      };
    }

    if (enemyType === 'slimeorange') {
      return {
        animationKey: 'game-one-slime-orange-move',
        frameKeys: this.buildManifestImageFrameKeys(this.manifest.slimeOrange || this.manifest.slimePurple),
      };
    }

    return {
      animationKey: 'game-one-ghost-float',
      frameKeys: [],
    };
  }

  resolveProjectileEnemyManifest(enemyType) {
    if (enemyType === 'villain1') {
      return this.manifest.villain1Enemy || this.manifest.projectileCaster;
    }

    if (enemyType === 'spiritboss') {
      return this.manifest.spiritBossEnemy || this.manifest.bossEnemy || this.manifest.projectileCaster;
    }

    if (enemyType === 'hunter') {
      return this.manifest.hunterEnemy || this.manifest.projectileCaster;
    }

    if (enemyType === 'boss') {
      return this.manifest.bossEnemy || this.manifest.projectileCaster;
    }

    return this.manifest.projectileCaster;
  }

  resolveProjectileManifest(enemyType) {
    if (enemyType === 'villain1') {
      return this.manifest.villain1Projectile || this.manifest.enemyProjectile;
    }

    if (enemyType === 'boss') {
      return this.manifest.bossProjectile || this.manifest.enemyProjectile;
    }

    if (enemyType === 'spiritboss') {
      return this.manifest.bossProjectile || this.manifest.enemyProjectile;
    }

    return this.manifest.enemyProjectile;
  }

  getEnemyLabel(enemyType) {
    if (enemyType === 'ghost') {
      return 'Ghost';
    }

    if (enemyType === 'slimegreen') {
      return 'Slime Green';
    }

    if (enemyType === 'slimeorange') {
      return 'Slime Orange';
    }

    if (enemyType === 'hunter') {
      return 'Hunter Drone';
    }

    if (enemyType === 'boss') {
      return 'Boss Sentinel';
    }

    if (enemyType === 'villain1') {
      return 'Villain One';
    }

    if (enemyType === 'spiritboss') {
      return 'Spirit Boss';
    }

    return 'Caster';
  }

  getBossRemaining() {
    return this.projectileCasters.reduce((count, caster) => (
      caster?.active && (caster.enemyType === 'boss' || caster.enemyType === 'spiritboss') ? count + 1 : count
    ), 0);
  }

  resolvePortalManifest(variant = '') {
    return this.manifest.portal3 || this.manifest.portal;
  }

  resolvePortalAnimationKey(variant = '') {
    return this.manifest.portal3 ? 'game-one-portal3-spin' : 'game-one-portal-spin';
  }

  resolveCoinGoal() {
    const configuredGoal = Number(this.levelData?.settings?.coinGoal);
    if (Number.isFinite(configuredGoal)) {
      return Phaser.Math.Clamp(Math.round(configuredGoal), 0, this.totalCoins);
    }

    if (this.totalCoins <= 0) {
      return 0;
    }

    if (this.totalCoins <= 3) {
      return this.totalCoins;
    }

    return Phaser.Math.Clamp(Math.ceil(this.totalCoins * 0.6), 1, this.totalCoins);
  }

  setObjectiveMessage(message, holdMs = 2000) {
    this.registry.set('objective', message);
    this.objectiveLockUntil = this.time.now + holdMs;
  }

  getMissionSnapshot() {
    const statues = this.getStatueQuestionProgress();
    const coinsGoalMet = this.coinGoal <= 0 || this.coinsCollected >= this.coinGoal;
    const statuesGoalMet = statues.total === 0 || statues.answered >= statues.total;
    const dangerActive = this.time.now < this.dangerSurgeUntil;
    const bossesRemaining = this.getBossRemaining();

    if (!coinsGoalMet) {
      return {
        stage: 'COLLECT',
        primary: `Collect relic shards (${this.coinsCollected}/${this.coinGoal}).`,
        secondary: dangerActive
          ? 'Enemies are enraged. Stay mobile while collecting.'
          : 'Search each room for coins before challenging all statues.',
      };
    }

    if (!statuesGoalMet) {
      return {
        stage: 'STATUES',
        primary: `Answer statue riddles (${statues.answered}/${statues.total}).`,
        secondary: dangerActive
          ? 'Danger surge active. Wrong answers increase pressure.'
          : 'Find statues, answer correctly, and unlock the exit path.',
      };
    }

    if (this.requireBossDefeat && bossesRemaining > 0) {
      return {
        stage: 'BOSS',
        primary: `Defeat the sentinel boss (${bossesRemaining} remaining).`,
        secondary: dangerActive
          ? 'Danger surge active. Focus shots and avoid burst fire.'
          : 'Use attack timing and cover to break the boss guard.',
      };
    }

    return {
      stage: 'ESCAPE',
      primary: 'Objective complete. Reach the ending portal.',
      secondary: dangerActive
        ? 'Danger surge active. Push to the portal while enemies are fast.'
        : 'Use linked portals and route knowledge to finish the level.',
    };
  }

  syncMissionRegistry(forceObjective = false) {
    const mission = this.getMissionSnapshot();
    const statues = this.getStatueQuestionProgress();
    const localObjective = this.getCurrentObjective();

    this.registry.set('coinGoal', this.coinGoal);
    this.registry.set('statueProgress', `${statues.answered}/${statues.total}`);
    this.registry.set('missionStage', mission.stage);
    this.registry.set('missionPrimary', mission.primary);
    this.registry.set('missionSecondary', mission.secondary);
    this.registry.set('dangerActive', this.time.now < this.dangerSurgeUntil);
    this.registry.set('shotsFired', this.playerShotsFired);
    this.registry.set('shotsHit', this.playerShotsHit);
    this.registry.set('bossRemaining', this.getBossRemaining());

    if (forceObjective || this.time.now >= this.objectiveLockUntil) {
      this.registry.set('objective', `${mission.primary} ${localObjective}`.trim());
    }
  }

  showMissionBriefing() {
    const mission = this.getMissionSnapshot();
    const bossLine = this.requireBossDefeat
      ? '\nDefeat the sentinel before using the ending portal.'
      : '';
    const briefing = this.add.text(
      this.cameras.main.width / 2,
      72,
      `Mission Online\n${mission.primary}\nPress J to fire arc bolts.${bossLine}`,
      {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '20px',
        align: 'center',
        color: '#f8fafc',
      },
    );

    briefing
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1400)
      .setPadding(18, 12, 18, 12)
      .setBackgroundColor('#0f172acc');

    this.tweens.add({
      targets: briefing,
      alpha: 0,
      delay: 3200,
      duration: 700,
      ease: 'Sine.InOut',
      onComplete: () => briefing.destroy(),
    });
  }

  triggerDangerSurge(durationMs = DANGER_SURGE_DURATION_MS) {
    this.dangerSurgeUntil = Math.max(this.dangerSurgeUntil, this.time.now + durationMs);
    this.updateDangerState(this.time.now);
    this.setObjectiveMessage('Wrong answer! Enemies are enraged for a short time.', 2600);
  }

  updateDangerState(now) {
    const shouldBeActive = now < this.dangerSurgeUntil;
    if (shouldBeActive === this.dangerStateActive) {
      return;
    }

    this.dangerStateActive = shouldBeActive;

    this.ghosts.forEach((ghost) => {
      if (!ghost || !ghost.active) {
        return;
      }

      if (typeof ghost.baseSpeed !== 'number') {
        ghost.baseSpeed = ghost.speed;
      }

      ghost.speed = shouldBeActive
        ? Math.round(ghost.baseSpeed * 1.35)
        : ghost.baseSpeed;
      ghost.setTint(shouldBeActive ? 0xf97316 : 0xffffff);
    });

    this.projectileCasters.forEach((caster) => {
      if (!caster || !caster.active) {
        return;
      }

      if (typeof caster.baseFireIntervalMs !== 'number') {
        caster.baseFireIntervalMs = caster.fireIntervalMs;
      }
      if (typeof caster.baseWarningLeadMs !== 'number') {
        caster.baseWarningLeadMs = caster.warningLeadMs;
      }

      caster.fireIntervalMs = shouldBeActive
        ? Math.max(450, Math.round(caster.baseFireIntervalMs * 0.75))
        : caster.baseFireIntervalMs;
      caster.warningLeadMs = shouldBeActive
        ? Math.max(130, Math.round(caster.baseWarningLeadMs * 0.7))
        : caster.baseWarningLeadMs;
    });

    this.syncMissionRegistry(true);
  }

  spawnPlayerProjectile(direction, burstIndex = 0, burstCount = 1) {
    if (!this.player?.active || this.hasFinished) {
      return;
    }

    const abilityConfig = this.playerAbilityConfig || {};
    const spawnX = this.player.x + (direction * (44 + (burstIndex * 8)));
    const spreadOffset = burstCount > 1 ? (burstIndex - ((burstCount - 1) / 2)) * 10 : 0;
    const spawnY = this.player.y - 10 + spreadOffset;
    const projectile = new EnemyProjectile(this, spawnX, spawnY, this.manifest.enemyProjectile, {
      direction,
      speed: abilityConfig.projectileSpeed,
      lifetimeMs: abilityConfig.projectileLifetimeMs,
      boundsLeft: this.worldLayout.bounds.left,
      boundsRight: this.worldLayout.bounds.right,
      size: abilityConfig.projectileSize || 48,
      // The player attack effect needs a hitbox close to its visible footprint.
      // The enemy projectile manifest uses a deliberately tiny body that made
      // visible hits pass through ghosts when reused here.
      hitboxDisplayRatio: 0.78,
    });

    projectile.setTint(0x34d399);
    projectile.playerOwned = true;
    projectile.damage = Math.max(1, Math.round(Number(abilityConfig.projectileDamage) || 1));

    this.ghosts.forEach((ghost) => {
      this.physics.add.overlap(projectile, ghost, () => this.handlePlayerProjectileHit(projectile, ghost, ghost.enemyType || 'ghost'), null, this);
    });

    this.projectileCasters.forEach((caster) => {
      this.physics.add.overlap(projectile, caster, () => this.handlePlayerProjectileHit(projectile, caster, caster.enemyType || 'elemental'), null, this);
    });

    this.registerProjectileSurfaceColliders(projectile);

    this.playerProjectiles.push(projectile);
    this.sceneObjects.push(projectile);
    this.playerShotsFired += 1;
    this.syncMissionRegistry();
  }

  firePlayerProjectile() {
    if (this.time.now < this.playerProjectileCooldownUntil) {
      return;
    }

    const abilityConfig = this.playerAbilityConfig || {};
    const direction = this.player?.facing === -1 ? -1 : 1;
    const burstCount = Math.max(1, Math.round(Number(abilityConfig.projectileBurstCount) || 1));
    for (let index = 0; index < burstCount; index += 1) {
      if (index === 0) {
        this.spawnPlayerProjectile(direction, index, burstCount);
      } else {
        this.time.delayedCall(index * 70, () => this.spawnPlayerProjectile(direction, index, burstCount));
      }
    }

    this.playerProjectileCooldownUntil = this.time.now + Math.max(80, Math.round(Number(abilityConfig.projectileCooldownMs) || 280));
  }

  handlePlayerProjectileHit(projectile, enemy, enemyType) {
    if (!projectile?.active || !enemy?.active) {
      return;
    }

    projectile.destroyProjectile();
    const resolvedEnemyType = this.normalizeEnemyType(enemyType || enemy.enemyType);
    const projectileDamage = Math.max(1, Math.round(Number(projectile.damage) || 1));
    const defeated = typeof enemy.applyProjectileHit === 'function'
      ? enemy.applyProjectileHit(projectileDamage)
      : (() => {
        enemy.destroy();
        return true;
      })();
    this.playerShotsHit += 1;

    if (!defeated) {
      const healthLabel = Number.isFinite(enemy.hitPoints)
        ? ` (${enemy.hitPoints}/${enemy.maxHitPoints})`
        : '';
      this.setObjectiveMessage(`${this.getEnemyLabel(resolvedEnemyType)} hit${healthLabel}. Keep firing.`, 900);
      this.syncMissionRegistry();
      return;
    }

    const isGhostFamily = ['ghost', 'slimegreen', 'slimeorange'].includes(resolvedEnemyType);

    if (isGhostFamily) {
      this.ghosts = this.ghosts.filter((ghost) => ghost !== enemy && ghost.active);
    }

    if (!isGhostFamily) {
      this.projectileCasters = this.projectileCasters.filter((caster) => caster !== enemy && caster.active);
      if (resolvedEnemyType === 'boss' || resolvedEnemyType === 'spiritboss') {
        this.bossEntities = this.bossEntities.filter((boss) => boss !== enemy && boss.active);
      }
    }

    this.syncEndingPortalLocks();
    this.setObjectiveMessage(`Great shot! ${this.getEnemyLabel(resolvedEnemyType)} destroyed.`, 1300);
    this.syncMissionRegistry();
  }

  clearGuidedStatue() {
    if (!this.guidedStatue || !this.guidedStatue.active) {
      this.guidedStatue = null;
      return;
    }

    if (this.guidedStatue.questionState !== 'ANSWERED') {
      if (this.guidedStatue.appearance === 'STATUE') {
        this.guidedStatue.setTint(0xcbd5e1);
      } else {
        this.guidedStatue.setTint(0xfbbf24);
      }
    }

    this.guidedStatue = null;
  }

  createInteractionPrompt() {
    const background = this.add
      .rectangle(0, 0, 150, 30, 0x020617, 0.9)
      .setStrokeStyle(2, 0x67e8f9, 0.85)
      .setOrigin(0.5);
    const label = this.add
      .text(0, 0, 'Walk into it to answer', {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: '13px',
        color: '#cffafe',
      })
      .setOrigin(0.5);
    const container = this.add.container(0, 0, [background, label]).setDepth(30).setVisible(false);

    this.interactionPrompt = {
      container,
      background,
      label,
    };

    this.sceneObjects.push(container);
  }

  findNearbyInteractableVillain(maxDistance = 84) {
    if (!this.player?.active) {
      return null;
    }

    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.villains.forEach((villain) => {
      if (!villain?.active || !villain.questionId || villain.questionState === 'ANSWERED') {
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, villain.x, villain.y);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = villain;
      }
    });

    return nearest;
  }

  updateInteractionPrompt(villain) {
    this.activeInteractableVillain = villain || null;

    if (!this.interactionPrompt?.container) {
      return;
    }

    const shouldHide = !villain || villain.appearance === 'STATUE' || this.hasFinished || this.isPaused || this.isInteractionLocked;
    if (shouldHide) {
      this.interactionPrompt.container.setVisible(false);
      return;
    }

    const promptText = 'Walk into it to answer';
    this.interactionPrompt.label.setText(promptText);
    this.interactionPrompt.background.width = Math.max(150, this.interactionPrompt.label.width + 28);
    this.interactionPrompt.container
      .setPosition(villain.x, villain.y - Math.max(44, (Number(villain.displayHeight) || 92) * 0.66))
      .setVisible(true);
  }

  updateStatueGuidance(now) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.villains.forEach((villain) => {
      if (!villain?.active || !villain.questionId || villain.questionState === 'ANSWERED') {
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, villain.x, villain.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = villain;
      }
    });

    if (!nearest || nearestDistance > 210) {
      this.clearGuidedStatue();
      return;
    }

    if (this.guidedStatue !== nearest) {
      this.clearGuidedStatue();
      this.guidedStatue = nearest;
    }

    if (nearest.questionState !== 'ANSWERED') {
      nearest.setTint(nearest.appearance === 'STATUE' ? 0xfde68a : 0xf97316);
    }

    if (now - this.lastStatueHintAt >= 2400) {
      this.lastStatueHintAt = now;
      this.setObjectiveMessage(`You are near a ${this.getQuestionTriggerLabel()}. Walk into it to answer and progress.`, 1400);
    }
  }

  syncEndingPortalLocks() {
    if (!this.portals.length) {
      return;
    }

    const requiresStatueUnlock = this.requiredStatueQuestionIds.size > 0;
    const allStatuesAnswered = this.areAllRequiredStatuesAnswered();
    const lockedByBoss = this.requireBossDefeat && this.getBossRemaining() > 0;

    this.portals.forEach((portal) => {
      if (!portal || portal.endsLevel === false) {
        return;
      }

      const lockedByQuestion = Boolean(portal.questionId) && !this.completedQuestions.has(portal.questionId);
      const lockedByStatues = requiresStatueUnlock && !allStatuesAnswered;
      const lockedByConfig = Boolean(portal.lockedByConfig);
      portal.setLocked(lockedByConfig || lockedByQuestion || lockedByStatues || lockedByBoss);
    });
  }

  getPortalConfigs() {
    const rawPortal = this.worldObjectsData?.portal;
    if (Array.isArray(rawPortal)) {
      return rawPortal.filter((entry) => entry && typeof entry === 'object');
    }

    return rawPortal && typeof rawPortal === 'object' ? [rawPortal] : [];
  }

  registerPortalLink(portal) {
    const linkName = typeof portal?.linkName === 'string' ? portal.linkName.trim() : '';
    if (!linkName) {
      return;
    }

    if (!this.portalsByLinkName.has(linkName)) {
      this.portalsByLinkName.set(linkName, []);
    }

    this.portalsByLinkName.get(linkName).push(portal);
  }

  registerQuestionTarget(targetMap, questionId, target) {
    if (!questionId) return;
    if (!targetMap.has(questionId)) targetMap.set(questionId, []);
    targetMap.get(questionId).push(target);
  }

  normalizeTriggerPlatformGoThrough(value = {}) {
    return {
      player: Boolean(value?.player),
      entities: Boolean(value?.entities),
    };
  }

  shouldSurfaceCollisionRun(surfaceEntry, role, targetObject, platformObject) {
    const goThroughTargets = this.normalizeTriggerPlatformGoThrough(surfaceEntry?.goThroughTargets);
    if (role === 'player' && goThroughTargets.player) {
      return false;
    }

    if ((role === 'entity' || role === 'projectile') && goThroughTargets.entities) {
      return false;
    }

    return shouldProcessSurfaceCollision(
      targetObject?.body || targetObject,
      platformObject?.body || platformObject,
      surfaceEntry?.geometry,
    );
  }

  createSurfaceColliderForTarget(target, surfaceEntry, role = 'entity') {
    if (!target?.body || !surfaceEntry?.body) {
      return null;
    }

    const collider = this.physics.add.collider(target, surfaceEntry.body, null, (targetObject, platformObject) => (
      this.shouldSurfaceCollisionRun(surfaceEntry, role, targetObject, platformObject)
    ), this);
    collider.__surfaceEntry = surfaceEntry;
    collider.__surfaceRole = role;
    return collider;
  }

  registerSurfaceCollisionTarget(target, role = 'entity') {
    if (!target?.body) {
      return;
    }

    const alreadyTracked = this.surfaceCollisionTargets.some((entry) => entry.target === target);
    if (alreadyTracked) {
      return;
    }

    const trackedTarget = {
      target,
      role: role || target.surfaceCollisionRole || 'entity',
      colliders: [],
    };
    this.surfaceCollisionTargets.push(trackedTarget);

    this.surfaceEntries.forEach((surfaceEntry) => {
      const collider = this.createSurfaceColliderForTarget(target, surfaceEntry, trackedTarget.role);
      if (collider) {
        trackedTarget.colliders.push(collider);
      }
    });
  }

  registerSurfaceEntry(entry) {
    if (!entry?.body) {
      return;
    }

    this.surfaceEntries.push(entry);
    this.surfaceCollisionTargets.forEach((trackedTarget) => {
      if (!trackedTarget?.target?.body) {
        return;
      }

      const collider = this.createSurfaceColliderForTarget(
        trackedTarget.target,
        entry,
        trackedTarget.role || trackedTarget.target?.surfaceCollisionRole || 'entity',
      );
      if (collider) {
        trackedTarget.colliders.push(collider);
      }
    });
  }

  registerProjectileSurfaceColliders(projectile) {
    if (!projectile?.body) {
      return;
    }

    const colliders = this.surfaceEntries
      .map((surfaceEntry) => this.createSurfaceColliderForTarget(projectile, surfaceEntry, 'projectile'))
      .filter(Boolean);

    projectile.surfaceColliders = colliders;
    projectile.once(Phaser.GameObjects.Events.DESTROY, () => {
      colliders.forEach((collider) => collider?.destroy?.());
      projectile.surfaceColliders = [];
    });
  }

  destroySurfaceEntry(entry) {
    if (!entry) {
      return;
    }

    this.surfaceCollisionTargets.forEach((trackedTarget) => {
      trackedTarget.colliders = (trackedTarget.colliders || []).filter((collider) => {
        if (collider?.__surfaceEntry !== entry) {
          return true;
        }

        collider.destroy?.();
        return false;
      });
    });

    [...this.projectiles, ...this.playerProjectiles].forEach((projectile) => {
      projectile.surfaceColliders = (projectile.surfaceColliders || []).filter((collider) => {
        if (collider?.__surfaceEntry !== entry) {
          return true;
        }

        collider.destroy?.();
        return false;
      });
    });

    if (entry.collider) {
      entry.collider.destroy();
    }

    if (entry.body) {
      this.staticBodies = this.staticBodies.filter((body) => body !== entry.body);
      this.surfaceEntries = this.surfaceEntries.filter((surfaceItem) => surfaceItem !== entry);
      entry.body.destroy?.();
    }

    entry.debugCollisionGuide?.destroy?.();
    entry.visual?.destroy?.();
  }

  createSolidSurface(config, { startsHidden = false } = {}) {
    const geometry = getGameOneSurfaceGeometry(this.manifest, config);
    const { textureMeta, visualRect, bodyRect } = geometry;
    const isInvisible = geometry.invisible;
    const requestedTextureKey = typeof config?.textureKey === 'string' ? config.textureKey.trim() : '';
    const resolvedTextureKey = requestedTextureKey && this.textures.exists(requestedTextureKey)
      ? requestedTextureKey
      : textureMeta.key;
    const visual = isInvisible
      ? this.add.rectangle(visualRect.centerX, visualRect.centerY, visualRect.width, visualRect.height, 0xffffff, 0).setOrigin(0.5)
      : this.add.tileSprite(visualRect.centerX, visualRect.centerY, visualRect.width, visualRect.height, resolvedTextureKey).setOrigin(0.5);
    visual.setDepth(this.resolveRenderLayerDepth(config.renderLayer));
    const body = this.physics.add.staticBody(bodyRect.left, bodyRect.top, bodyRect.width, bodyRect.height);
    const debugCollisionGuide = null;
    const entry = {
      config,
      visual,
      body,
      collider: null,
      debugCollisionGuide,
      geometry,
      unlocked: false,
      originalY: visualRect.centerY,
      isInvisible,
      goThroughTargets: this.normalizeTriggerPlatformGoThrough(config?.goThroughTargets),
    };
    entry.collider = this.createSurfaceColliderForTarget(this.player, entry, 'player');
    if (isInvisible) {
      visual.setVisible(false);
      visual.setAlpha(0);
    }
    if (startsHidden) {
      visual.setVisible(false);
      visual.setAlpha(0);
      visual.setY(visualRect.centerY + 18);
      debugCollisionGuide?.setVisible(false);
      body.enable = false;
      entry.collider.active = false;
    }
    this.staticBodies.push(body);
    this.registerSurfaceEntry(entry);
    this.sceneObjects.push(visual);
    if (debugCollisionGuide) {
      this.sceneObjects.push(debugCollisionGuide);
    }
    return entry;
  }

  buildTriggerPlatformSurfaceConfig(record, cell) {
    const nextTileKey = record.triggered
      ? (record.triggeredTileKey || record.untriggeredTileKey || record.currentTileKey)
      : (record.untriggeredTileKey || record.triggeredTileKey || record.currentTileKey);
    const hasConfiguredTiles = Boolean(nextTileKey);

    return {
      id: `${record.id}-${cell.col}-${cell.row}`,
      x: cell.x,
      y: cell.y,
      width: record.cellSize,
      height: record.cellSize,
      bodyWidth: record.cellSize,
      bodyHeight: record.cellSize,
      renderLayer: record.renderLayer,
      invisible: Boolean(record.invisible) && !hasConfiguredTiles,
      textureKey: nextTileKey || Object.keys(this.manifest?.platforms || {})[0] || 'grass',
      collisionMode: 'SOLID',
      passThroughSides: Array.isArray(record.passThroughSides) ? record.passThroughSides : [],
      goThroughTargets: record.activeGoThrough,
    };
  }

  rebuildTriggerPlatformSurfaces(record) {
    if (!record) {
      return;
    }

    (record.surfaces || []).forEach((surfaceEntry) => this.destroySurfaceEntry(surfaceEntry));
    record.surfaces = (record.cells || []).map((cell) => this.createSolidSurface(
      this.buildTriggerPlatformSurfaceConfig(record, cell),
    ));
    record.currentTileKey = record.triggered
      ? (record.triggeredTileKey || record.untriggeredTileKey || record.currentTileKey)
      : (record.untriggeredTileKey || record.triggeredTileKey || record.currentTileKey);
  }

  createTriggerPlatform(config) {
    const rawCells = Array.isArray(config?.cells) && config.cells.length
      ? config.cells
      : [{ x: Number(config?.x || 0), y: Number(config?.y || 0), col: 0, row: 0 }];
    const cells = rawCells.map((cell, index) => ({
      ...cell,
      x: Number(cell?.x || config?.x || 0),
      y: Number(cell?.y || config?.y || 0),
      col: Number.isFinite(Number(cell?.col)) ? Number(cell.col) : index,
      row: Number.isFinite(Number(cell?.row)) ? Number(cell.row) : 0,
    }));
    const cellSize = Math.max(8, Math.round(Number(config?.cellSize) || 48));

    const cellXs = cells.map((cell) => cell.x);
    const cellYs = cells.map((cell) => cell.y);
    const width = Number(config?.width) || ((Math.max(...cellXs) - Math.min(...cellXs)) + cellSize);
    const height = Number(config?.height) || ((Math.max(...cellYs) - Math.min(...cellYs)) + cellSize);
    const untriggeredTileKey = typeof config?.untriggeredTileKey === 'string' ? config.untriggeredTileKey.trim() : '';
    const triggeredTileKey = typeof config?.triggeredTileKey === 'string' ? config.triggeredTileKey.trim() : '';
    const hasConfiguredTiles = Boolean(untriggeredTileKey || triggeredTileKey);
    const normalizedInvisible = typeof config?.invisible === 'boolean'
      ? (config.invisible && !hasConfiguredTiles)
      : !hasConfiguredTiles;
    const resolveMoveTarget = (target) => {
      if (!target || typeof target !== 'object') {
        return null;
      }

      const x = Number(target.x);
      const y = Number(target.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }

      const col = Number(target.col);
      const row = Number(target.row);
      if (Number.isFinite(col) && Number.isFinite(row)) {
        return {
          x: (Math.round(col) * cellSize) + (cellSize * 0.5),
          y: (Math.round(row) * cellSize) + (cellSize * 0.5),
        };
      }

      return null;
    };
    const record = {
      id: String(config?.id || `trigger-platform-${this.triggerPlatformRecords.length + 1}`),
      questionId: typeof config?.questionId === 'string' ? config.questionId.trim() : '',
      triggerId: typeof config?.triggerId === 'string' ? config.triggerId.trim() : '',
      x: Number(config?.x || ((Math.min(...cellXs) + Math.max(...cellXs)) / 2)),
      y: Number(config?.y || ((Math.min(...cellYs) + Math.max(...cellYs)) / 2)),
      width,
      height,
      cellSize,
      renderLayer: normalizeCharacterRenderLayer(config?.renderLayer),
      invisible: normalizedInvisible,
      passThroughSides: Array.isArray(config?.passThroughSides) ? config.passThroughSides : [],
      untriggeredTileKey,
      triggeredTileKey,
      correctAction: typeof config?.correctAction === 'string' ? config.correctAction.trim().toUpperCase() : 'NONE',
      wrongAction: typeof config?.wrongAction === 'string' ? config.wrongAction.trim().toUpperCase() : 'NONE',
      correctMoveTo: resolveMoveTarget(config?.correctMoveTo),
      wrongMoveTo: resolveMoveTarget(config?.wrongMoveTo),
      correctGoThrough: this.normalizeTriggerPlatformGoThrough(config?.correctGoThrough),
      wrongGoThrough: this.normalizeTriggerPlatformGoThrough(config?.wrongGoThrough),
      activeGoThrough: {
        player: false,
        entities: false,
      },
      currentTileKey: typeof config?.untriggeredTileKey === 'string' && config.untriggeredTileKey.trim()
        ? config.untriggeredTileKey.trim()
        : '',
      triggered: false,
      correctTriggered: false,
      wrongTriggered: false,
      cells,
      surfaces: [],
    };

    this.rebuildTriggerPlatformSurfaces(record);
    this.registerQuestionTarget(this.questionTriggerPlatforms, record.questionId, record);
    return record;
  }

  applyTriggerPlatformMove(record, destination) {
    if (!record || !destination) {
      return;
    }

    const anchorX = Math.min(...record.cells.map((cell) => cell.x));
    const anchorY = Math.min(...record.cells.map((cell) => cell.y));
    const deltaX = Number(destination.x || 0) - anchorX;
    const deltaY = Number(destination.y || 0) - anchorY;
    const cellSize = Math.max(1, Number(record.cellSize) || 48);

    record.cells = record.cells.map((cell) => ({
      ...cell,
      x: cell.x + deltaX,
      y: cell.y + deltaY,
      col: Math.max(0, Math.round(((cell.x + deltaX) - (cellSize * 0.5)) / cellSize)),
      row: Math.max(0, Math.round(((cell.y + deltaY) - (cellSize * 0.5)) / cellSize)),
    }));
    record.x += deltaX;
    record.y += deltaY;
  }

  applyTriggerPlatformOutcome(questionId, branch = 'correct') {
    const records = this.questionTriggerPlatforms.get(questionId) || [];
    records.forEach((record) => {
      if (!record) {
        return;
      }

      const branchKey = branch === 'wrong' ? 'wrongTriggered' : 'correctTriggered';
      if (record[branchKey]) {
        return;
      }

      record[branchKey] = true;
      record.triggered = true;

      const action = branch === 'wrong' ? record.wrongAction : record.correctAction;
      const goThrough = branch === 'wrong' ? record.wrongGoThrough : record.correctGoThrough;
      const moveTarget = branch === 'wrong' ? record.wrongMoveTo : record.correctMoveTo;

      record.activeGoThrough = {
        player: Boolean(record.activeGoThrough.player || goThrough.player),
        entities: Boolean(record.activeGoThrough.entities || goThrough.entities),
      };

      if (action === 'MOVE' && moveTarget) {
        this.applyTriggerPlatformMove(record, moveTarget);
      }

      const shouldRebuild = action === 'MOVE'
        || (!record.invisible && Boolean(record.triggeredTileKey || record.untriggeredTileKey));

      if (shouldRebuild) {
        this.rebuildTriggerPlatformSurfaces(record);
      } else {
        (record.surfaces || []).forEach((surfaceEntry) => {
          surfaceEntry.goThroughTargets = this.normalizeTriggerPlatformGoThrough(record.activeGoThrough);
        });
      }
    });
  }

  revealUnlockPlatform(entry) {
    if (!entry || entry.unlocked) return false;
    entry.unlocked = true;
    entry.body.enable = true;
    entry.collider.active = true;

    if (!entry.isInvisible) {
      entry.visual.setVisible(true);
      this.tweens.add({ targets: entry.visual, y: entry.originalY, alpha: 1, duration: 220, ease: 'Back.Out' });
    }

    return true;
  }

  dropBarrier(entry) {
    if (!entry || entry.unlocked) return false;
    entry.unlocked = true;
    entry.body.enable = false;
    entry.collider.active = false;
    this.tweens.add({ targets: entry.visual, y: entry.visual.y + 26, alpha: 0, duration: 220, ease: 'Quad.In' });
    return true;
  }

  unlockQuestionTargets(questionId) {
    (this.questionUnlockPlatforms.get(questionId) || []).forEach((entry) => this.revealUnlockPlatform(entry));
    (this.questionBarriers.get(questionId) || []).forEach((entry) => this.dropBarrier(entry));
    (this.questionPortals.get(questionId) || []).forEach((portal) => { if (!portal.isUnlocked()) portal.setLocked(false); });
  }

  spawnProjectileFromCaster(caster, time) {
    const spawnPoint = caster.getShotSpawnPoint();
    const projectileManifest = caster.projectileManifest || this.manifest.enemyProjectile;
    const projectile = new EnemyProjectile(this, spawnPoint.x, spawnPoint.y, projectileManifest, {
      direction: caster.fireDirection,
      speed: caster.projectileSpeed,
      lifetimeMs: caster.projectileLifetimeMs,
      boundsLeft: this.worldLayout.bounds.left,
      boundsRight: this.worldLayout.bounds.right,
      animationKey: caster.projectileAnimationKey,
    });
    this.physics.add.overlap(this.player, projectile, () => { projectile.destroyProjectile(); this.applyDamage(1, 'projectile', { respawn: true }); }, null, this);
    this.registerProjectileSurfaceColliders(projectile);
    this.projectiles.push(projectile);
    caster.consumeShot(time);
  }

  getSpawnPoint() {
    const spawn = this.worldObjectsData.spawn;
    if (spawn) return { x: spawn.x, y: spawn.y };
    const firstCell = this.worldLayout.cells[0];
    return firstCell ? { x: firstCell.bounds.left + 160, y: firstCell.bounds.top + 560 } : { x: 120, y: 560 };
  }

  getQuestionTriggerLabel() {
    const firstVillain = this.getVillainConfigs()[0] || null;
    return firstVillain?.appearance === 'STATUE' ? 'statue' : (firstVillain?.interactionLabel || 'villain');
  }

  getCurrentObjective() {
    const cell = this.currentCellRecord?.cell;
    if (!cell) return 'Explore the map and keep moving.';
    const cellBounds = getCellWorldBounds(cell, this.levelData.viewport);
    const portalsInCell = this.getPortalConfigs().filter((portal) => (
      portal.x >= cellBounds.left
      && portal.x < cellBounds.right
      && portal.y >= cellBounds.top
      && portal.y < cellBounds.bottom
    ));
    const portalInCell = portalsInCell.length > 0;
    const endingPortalInCell = portalsInCell.some((portal) => portal?.endsLevel !== false);
    const primaryQuestionId = this.getVillainConfigs()[0]?.questionId;
    const unlocked = (this.worldObjectsData.unlockPlatforms || []).some((entry) => this.completedQuestions.has(entry.lockedByQuestionId))
      || (this.worldObjectsData.barriers || []).some((entry) => this.completedQuestions.has(entry.lockedByQuestionId))
      || portalsInCell.some((portal) => portal?.questionId && this.completedQuestions.has(portal.questionId));
    if (primaryQuestionId && this.completedQuestions.has(primaryQuestionId) && cell.postUnlockObjective) return cell.postUnlockObjective;
    if (unlocked && cell.postUnlockObjective) return cell.postUnlockObjective;

    if (endingPortalInCell && this.requiredStatueQuestionIds.size > 0 && !this.areAllRequiredStatuesAnswered()) {
      const { answered, total } = this.getStatueQuestionProgress();
      return `Answer every statue correctly to unseal the ending portal (${answered}/${total}).`;
    }

    if (endingPortalInCell && this.requireBossDefeat && this.getBossRemaining() > 0) {
      return `Defeat the sentinel boss before the ending portal can stabilize (${this.getBossRemaining()} remaining).`;
    }

    return cell.objective || (portalInCell ? 'Reach the final portal to finish the level.' : 'Explore the connected map and push into the next area.');
  }

  syncHealthRegistry() {
    this.registry.set('health', Number(this.currentHealth.toFixed(1)));
    this.registry.set('maxHealth', this.maxHealth);
  }

  updateCameraBoundsForCell(cellRecord, { snap = false } = {}) {
    if (!cellRecord?.bounds) {
      return;
    }

    const camera = this.cameras.main;
    const {
      left,
      top,
      width,
      height,
      centerX,
      centerY,
    } = cellRecord.bounds;

    camera.setBounds(left, top, width, height);
    if (this.portalRoomTraversalOnly) {
      this.physics.world.setBounds(left, top, width, height);
    }

    if (snap) {
      camera.centerOn(centerX, centerY);
    }
  }

  syncTimerRegistry(force = false) {
    this.registry.set('timerEnabled', this.timerEnabled);

    if (!this.timerEnabled) {
      this.registry.set('timerSecondsRemaining', null);
      return;
    }

    const secondsRemaining = Math.max(0, Math.ceil(this.remainingTimeMs / 1000));
    if (force || this.lastTimerSecond !== secondsRemaining) {
      this.lastTimerSecond = secondsRemaining;
      this.registry.set('timerSecondsRemaining', secondsRemaining);
    }
  }

  resetDamageFeedback() {
    if (this.damageTween) {
      this.damageTween.stop();
      this.damageTween = null;
    }
    this.player.setAlpha(1);
    this.player.clearTint();
  }

  playDamageFeedback() {
    this.resetDamageFeedback();
    this.player.setTintFill(0xf87171);
    this.damageTween = this.tweens.add({
      targets: this.player,
      alpha: 0.34,
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.damageTween = null;
        this.player.setAlpha(1);
        this.player.clearTint();
      },
    });
  }

  getCellSpawnPoint(cellRecord = this.currentCellRecord) {
    if (!cellRecord?.bounds) {
      return this.getSpawnPoint();
    }

    const savedRoomStartPosition = this.getSavedRoomStartPosition(cellRecord);
    if (savedRoomStartPosition) {
      return {
        x: savedRoomStartPosition.x,
        y: savedRoomStartPosition.y,
      };
    }

    return getLocalCellSpawn(cellRecord);
  }

  getSavedRoomStartPosition(roomRecord) {
    if (!roomRecord?.cellId) {
      return null;
    }

    return this.roomStartPositions.get(roomRecord.cellId) || null;
  }

  saveRoomStartPosition(roomRecord, position, { overwrite = false } = {}) {
    if (!roomRecord?.cellId || !Number.isFinite(Number(position?.x)) || !Number.isFinite(Number(position?.y))) {
      return null;
    }

    const existingPosition = this.roomStartPositions.get(roomRecord.cellId) || null;
    if (existingPosition && !overwrite) {
      return existingPosition;
    }

    const normalizedPosition = {
      x: Number(position.x),
      y: Number(position.y),
    };

    this.roomStartPositions.set(roomRecord.cellId, normalizedPosition);
    return normalizedPosition;
  }

  respawnPlayer({ roomRecord = this.currentCellRecord, position = null, resetBlockedReturnRoomId = true } = {}) {
    const spawnPoint = resolveRespawnPosition(position, this.getCellSpawnPoint(roomRecord));
    this.player.setPosition(spawnPoint.x, spawnPoint.y);
    this.player.setVelocity(0, 0);
    if (resetBlockedReturnRoomId) {
      this.blockedReturnRoomId = null;
    }
    if (roomRecord) {
      this.currentCellRecord = roomRecord;
      this.updateCameraBoundsForCell(roomRecord, { snap: true });
    }
    this.syncCurrentCellFromPlayer(true);
    this.cameras.main.shake(120, 0.004);
  }

  normalizeQuestionDamageAmount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(10, Math.max(0, Math.trunc(parsed)));
  }

  getQuestionDamageAmount(questionId) {
    const question = getQuestionById(this.levelData, questionId);
    if (question?.damageOnWrongAnswer !== undefined && question?.damageOnWrongAnswer !== null) {
      return this.normalizeQuestionDamageAmount(question.damageOnWrongAnswer);
    }

    const villain = this.villains.find((entry) => entry?.questionId === questionId);
    return this.normalizeQuestionDamageAmount(villain?.damageOnWrongAnswer);
  }

  formatHeartLoss(amount) {
    if (amount <= 0) return 'no hearts';
    return `${amount} ${amount === 1 ? 'heart' : 'hearts'}`;
  }

  getDamageObjective(reason, amount = 1) {
    if (reason === 'question') return `Wrong answer. You lost ${this.formatHeartLoss(amount)}. Walk into the ${this.getQuestionTriggerLabel()} again to retry.`;
    if (reason === 'ghost') return 'The ghost hit you. One heart lost. You were returned to the area start.';
    if (reason === 'slimegreen' || reason === 'slimeorange') {
      return `The ${this.getEnemyLabel(this.normalizeEnemyType(reason)).toLowerCase()} hit you. One heart lost. You were returned to the area start.`;
    }
    if (reason === 'elemental') return 'The fire hit you. One heart lost. You were returned to the area start.';
    if (reason === 'projectile') return 'The projectile hit you. One heart lost. You were returned to the area start.';
    if (reason === 'fall') return 'You fell. One heart lost. You were returned to the area start.';
    return 'You took damage. Keep moving and protect your remaining health.';
  }

  applyDamage(amount, reason, { respawn = false, bypassInvulnerability = false, respawnRoomRecord = null } = {}) {
    if (this.hasFinished) return;
    if (!bypassInvulnerability && this.time.now < this.damageCooldownUntil) return;
    this.currentHealth = Math.max(0, (Math.round((this.currentHealth - amount) * 2) / 2));
    this.syncHealthRegistry();
    if (this.currentHealth <= 0) { this.failLevel(reason); return; }
    this.damageCooldownUntil = this.time.now + (respawn ? 1100 : 400);
    this.playDamageFeedback();
    if (respawn) {
      const firstRoomRecord = this.worldLayout.cells[0] || null;
      const restartRoomRecord = firstRoomRecord || respawnRoomRecord || this.currentCellRecord;
      const restartPosition = resolveLevelRestartPosition({
        firstRoomStartPosition: this.getSavedRoomStartPosition(restartRoomRecord),
        firstRoomSpawnPosition: restartRoomRecord ? getLocalCellSpawn(restartRoomRecord) : this.getSpawnPoint(),
      });

      this.respawnPlayer({
        roomRecord: restartRoomRecord,
        position: restartPosition,
      });
    }
    this.setObjectiveMessage(this.getDamageObjective(reason, amount), 2400);
    this.syncMissionRegistry();
  }

  syncCurrentCellFromPlayer(force = false) {
    if (this.portalRoomTraversalOnly && !force) {
      return;
    }
    const nextRecord = getCellRecordAtWorldPoint(this.worldLayout, this.player.x, this.player.y) || this.currentCellRecord || this.worldLayout.cells[0] || null;
    if (!nextRecord) return;
    const cellChanged = this.currentCellRecord?.cellId !== nextRecord.cellId;
    if (!force && !cellChanged) return;
    this.currentCellRecord = nextRecord;
    this.updateCameraBoundsForCell(nextRecord, { snap: force });
    this.registry.set('roomLabel', 'Area');
    this.registry.set('roomIndex', nextRecord.index + 1);
    this.syncMissionRegistry(force);
  }

  handleCoinPickup(player, coin) {
    if (this.collectedCoinIds.has(coin.coinId)) return;
    this.collectedCoinIds.add(coin.coinId);
    this.coinsCollected += 1;
    this.coinBalance += 1;
    this.registry.set('coinsCollected', this.coinsCollected);
    this.registry.set('coinBalance', this.coinBalance);
    if (this.coinGoal > 0) {
      this.setObjectiveMessage(`Relic shard collected (${this.coinsCollected}/${this.coinGoal}).`, 1000);
    }
    this.syncMissionRegistry();
    coin.destroy();
  }

  handleVillainTouch(villain) {
    if (this.hasFinished || this.isPaused || this.isInteractionLocked || !villain?.questionId || this.completedQuestions.has(villain.questionId) || this.time.now < this.questionCooldownUntil) return;
    const question = getQuestionById(this.levelData, villain.questionId);
    if (!question) return;
    const roomRecord = getCellRecordAtWorldPoint(this.worldLayout, villain.x, villain.y) || this.currentCellRecord || null;
    this.openQuestionScene({
      question,
      questionId: villain.questionId,
      villainId: villain.id || null,
      roomRecord,
    });
  }

  openQuestionScene({
    question,
    questionId,
    villainId = null,
    roomRecord = this.currentCellRecord,
  }) {
    if (!question || !questionId) {
      return;
    }

    this.activeQuestionContext = {
      questionId,
      villainId,
      roomId: roomRecord?.cellId || this.currentCellRecord?.cellId || '',
      checkpointPosition: this.getSavedRoomStartPosition(roomRecord) || this.getCellSpawnPoint(roomRecord),
      triggerPosition: {
        x: this.player.x,
        y: this.player.y,
      },
    };
    this.updateInteractionPrompt(null);
    this.isInteractionLocked = true;
    this.player.freeze(true);
    this.physics.world.pause();
    this.callbacks.onQuestionVisibilityChange?.(true);
    this.scene.launch('QuestionScene', {
      question,
      questionId,
      hintCoinCost: this.hintCoinCost,
      hintStarCost: this.hintCoinCost,
      availableCoins: this.coinBalance,
      revealedHintCount: this.questionHintProgress.get(questionId) || 0,
    });
  }

  replaceQuestionById(questionId, nextQuestion) {
    if (!questionId || !nextQuestion || !Array.isArray(this.levelData?.questions)) {
      return;
    }

    const questionIndex = this.levelData.questions.findIndex((question) => question?.id === questionId);
    if (questionIndex >= 0) {
      this.levelData.questions.splice(questionIndex, 1, nextQuestion);
    }
  }

  resolveQuestionRetryVariant(questionId) {
    const currentQuestion = getQuestionById(this.levelData, questionId);
    if (!currentQuestion) {
      return null;
    }

    const nextRetryIndex = (this.questionRetryCounts.get(questionId) || 0) + 1;
    const nextQuestion = buildQuestionRetryVariant(currentQuestion, nextRetryIndex);
    if (!nextQuestion) {
      return null;
    }

    this.questionRetryCounts.set(questionId, nextRetryIndex);
    this.replaceQuestionById(questionId, nextQuestion);
    this.questionHintProgress.set(questionId, 0);
    return nextQuestion;
  }

  restartQuestionRoom(questionId) {
    const questionContext = this.activeQuestionContext || {};
    const roomRecord = questionContext.roomId
      ? this.worldLayout.byId.get(questionContext.roomId)
      : (this.currentCellRecord || null);
    const restartPosition = resolveQuestionRestartPosition({
      checkpointPosition: questionContext.checkpointPosition,
      triggerPosition: questionContext.triggerPosition,
      fallbackPosition: this.getCellSpawnPoint(roomRecord),
    });
    const nextQuestion = this.resolveQuestionRetryVariant(questionId);
    const topicLabel = getQuestionTopicLabel(nextQuestion || getQuestionById(this.levelData, questionId));

    this.activeQuestionContext = null;
    this.respawnPlayer({
      roomRecord,
      position: restartPosition,
      resetBlockedReturnRoomId: false,
    });
    this.setObjectiveMessage(
      nextQuestion
        ? `Wrong answer. This room restarted, and the statue now has a new question about ${topicLabel}.`
        : 'Wrong answer. This room restarted. Return to the statue for the next challenge.',
      2400,
    );
  }

  handleQuestionHintPurchased(payload = {}) {
    const questionId = typeof payload?.questionId === 'string' ? payload.questionId.trim() : '';
    const hintCoinCost = normalizeHintCoinCost(payload?.hintCoinCost ?? payload?.hintStarCost ?? this.hintCoinCost);
    if (hintCoinCost > 0) {
      if (this.coinBalance < hintCoinCost) {
        this.setObjectiveMessage(`Not enough coins for a hint (${this.coinBalance}/${hintCoinCost}).`, 1200);
        return;
      }

      this.coinBalance = Math.max(0, this.coinBalance - hintCoinCost);
      this.registry.set('coinBalance', this.coinBalance);
    }

    this.hintsUsed += 1;
    if (questionId) {
      const nextHintIndex = Math.max(
        this.questionHintProgress.get(questionId) || 0,
        Math.max(0, Math.round(Number(payload?.hintIndex) || 0)),
      );
      this.questionHintProgress.set(questionId, nextHintIndex);
    }
  }

  handleQuestionAnswered({ questionId, correct }) {
    this.questionCooldownUntil = this.time.now + 600;
    this.isInteractionLocked = false;
    this.player.freeze(false);
    this.physics.world.resume();
    this.callbacks.onQuestionVisibilityChange?.(false);
    if (correct) {
      this.activeQuestionContext = null;
      this.completedQuestions.add(questionId);
      this.villains.filter((villain) => villain.questionId === questionId).forEach((villain) => villain.setQuestionState('ANSWERED', { animate: true }));
      this.applyTriggerPlatformOutcome(questionId, 'correct');
      this.unlockQuestionTargets(questionId);
      this.syncEndingPortalLocks();
      this.syncCurrentCellFromPlayer(true);
      this.setObjectiveMessage('Riddle solved. New paths are opening.', 1600);
      this.syncMissionRegistry();
      return;
    }
    this.wrongAnswers += 1;
    this.triggerDangerSurge();
    this.restartQuestionRoom(questionId);
    this.syncMissionRegistry();
  }

  handleQuestionClosed() {
    const questionId = typeof this.activeQuestionContext?.questionId === 'string'
      ? this.activeQuestionContext.questionId.trim()
      : '';
    const nextQuestion = questionId ? this.resolveQuestionRetryVariant(questionId) : null;
    const topicLabel = getQuestionTopicLabel(nextQuestion || (questionId ? getQuestionById(this.levelData, questionId) : null));

    this.questionCooldownUntil = this.time.now + 700;
    this.activeQuestionContext = null;
    this.isInteractionLocked = false;
    this.player.freeze(false);
    this.physics.world.resume();
    this.callbacks.onQuestionVisibilityChange?.(false);
    this.setObjectiveMessage(
      nextQuestion && topicLabel
        ? `Question closed. The statue now has a new question about ${topicLabel}.`
        : 'Question closed. Return to the statue when you are ready.',
      1700,
    );
    this.syncMissionRegistry();
  }

  handlePortalTouch(portal) {
    if (this.hasFinished || this.isPaused || this.isInteractionLocked || !portal) return;
    if (this.time.now < Number(portal.touchCooldownUntil || 0)) return;
    portal.touchCooldownUntil = this.time.now + 350;
    if (!portal.isUnlocked()) {
      if (portal.endsLevel !== false && this.requiredStatueQuestionIds.size > 0 && !this.areAllRequiredStatuesAnswered()) {
        const { answered, total } = this.getStatueQuestionProgress();
        this.setObjectiveMessage(`The ending portal is sealed. Complete all statue questions first (${answered}/${total}).`, 2200);
      } else if (portal.endsLevel !== false && this.requireBossDefeat && this.getBossRemaining() > 0) {
        this.setObjectiveMessage(`The ending portal is unstable. Defeat the sentinel boss first (${this.getBossRemaining()} remaining).`, 2200);
      } else {
        this.setObjectiveMessage(`The portal is sealed. Answer the ${this.getQuestionTriggerLabel()} question first.`, 2200);
      }
      return;
    }

    if (portal.targetRoomId) {
      if (isReturnToBlockedRoom(this.blockedReturnRoomId, portal.targetRoomId)) {
        this.setObjectiveMessage('You cannot return to the previous room.', 1800);
        return;
      }
      this.teleportPlayerToTargetRoom(portal);
      return;
    }

    const pair = this.resolvePortalPair(portal);
    if (pair?.destination) {
      const destinationRoomId = getPortalRoomId(this.worldLayout, pair.destination);
      if (isReturnToBlockedRoom(this.blockedReturnRoomId, destinationRoomId)) {
        this.setObjectiveMessage('You cannot return to the previous room.', 1800);
        return;
      }
      this.teleportPlayerToPortal(portal, pair.destination, pair.linkName);
      return;
    }

    if (pair && pair.linkName) {
      if (pair.portals.length < 2) {
        this.setObjectiveMessage(`Portal "${pair.linkName}" needs one more matching portal.`, 2200);
      } else {
        this.setObjectiveMessage(`Portal name "${pair.linkName}" is used by more than two portals.`, 2200);
      }
      return;
    }

    if (portal.endsLevel !== false) {
      this.finishLevel();
      return;
    }

    this.setObjectiveMessage('Name this portal and place exactly one matching portal to enable teleporting.', 2200);
  }

  resolvePortalPair(portal) {
    const linkName = typeof portal?.linkName === 'string' ? portal.linkName.trim() : '';
    if (!linkName) {
      if (portal?.endsLevel !== false) {
        return null;
      }

      const unnamedLinkedPortals = this.portals.filter((entry) => (
        entry?.active
        && entry.endsLevel === false
        && !(typeof entry.linkName === 'string' && entry.linkName.trim())
      ));
      if (unnamedLinkedPortals.length === 2 && unnamedLinkedPortals.includes(portal)) {
        return {
          linkName: 'portal',
          portals: unnamedLinkedPortals,
          destination: unnamedLinkedPortals[0] === portal ? unnamedLinkedPortals[1] : unnamedLinkedPortals[0],
        };
      }

      return null;
    }

    const linkedPortals = (this.portalsByLinkName.get(linkName) || []).filter((entry) => entry?.active);
    if (linkedPortals.length !== 2) {
      return {
        linkName,
        portals: linkedPortals,
        destination: null,
      };
    }

    return {
      linkName,
      portals: linkedPortals,
      destination: linkedPortals[0] === portal ? linkedPortals[1] : linkedPortals[0],
    };
  }

  teleportPlayerToPortal(fromPortal, toPortal, linkName) {
    const sourceRoomId = getPortalRoomId(this.worldLayout, fromPortal);
    const destinationRoomId = getPortalRoomId(this.worldLayout, toPortal);
    const destinationRoomRecord = destinationRoomId ? this.worldLayout.byId.get(destinationRoomId) : null;
    const cooldownUntil = this.time.now + 850;
    fromPortal.touchCooldownUntil = cooldownUntil;
    toPortal.touchCooldownUntil = cooldownUntil;
    const destinationPosition = getPortalExitPosition(this.worldLayout.bounds, fromPortal, toPortal);
    const roomStartPosition = resolveRoomStartPosition({
      savedRoomStartPosition: this.getSavedRoomStartPosition(destinationRoomRecord),
      entryPosition: destinationPosition,
      fallbackPosition: destinationPosition,
    });
    this.player.setPosition(roomStartPosition.x, roomStartPosition.y);
    this.player.setVelocity(0, 0);
    this.saveRoomStartPosition(destinationRoomRecord, roomStartPosition);
    this.blockedReturnRoomId = sourceRoomId && sourceRoomId !== destinationRoomId ? sourceRoomId : null;
    if (this.blockedReturnRoomId && !toPortal.lockedByConfig) {
      toPortal.setLocked(false);
    }
    this.syncCurrentCellFromPlayer(true);
    this.setObjectiveMessage(`Teleported through portal "${linkName}".`, 1300);
  }

  teleportPlayerToTargetRoom(portal) {
    const sourceRoomId = getPortalRoomId(this.worldLayout, portal);
    const targetRoomId = typeof portal?.targetRoomId === 'string' ? portal.targetRoomId.trim() : '';
    const targetRecord = targetRoomId ? this.worldLayout.byId.get(targetRoomId) : null;

    if (!targetRecord) {
      this.setObjectiveMessage('This portal target is missing.', 1600);
      return;
    }

    const cooldownUntil = this.time.now + 850;
    portal.touchCooldownUntil = cooldownUntil;
    const targetPortals = this.portals.filter((entry) => getPortalRoomId(this.worldLayout, entry) === targetRoomId);
    const destinationPosition = resolveTargetRoomEntryPosition({
      worldBounds: this.worldLayout.bounds,
      sourcePortal: portal,
      sourceRoomId,
      targetRecord,
      targetPortals,
    });
    const roomStartPosition = resolveRoomStartPosition({
      savedRoomStartPosition: this.getSavedRoomStartPosition(targetRecord),
      entryPosition: destinationPosition,
      fallbackPosition: destinationPosition,
    });

    this.player.setPosition(roomStartPosition.x, roomStartPosition.y);
    this.player.setVelocity(0, 0);
    this.saveRoomStartPosition(targetRecord, roomStartPosition);
    this.blockedReturnRoomId = sourceRoomId && sourceRoomId !== targetRoomId ? sourceRoomId : null;
    this.syncCurrentCellFromPlayer(true);
    this.setObjectiveMessage(`Moved to ${targetRoomId}.`, 1300);
  }

  getPauseMenuSnapshot() {
    const mission = this.getMissionSnapshot();
    const timerSecondsRemaining = this.timerEnabled
      ? Math.max(0, Math.ceil(this.remainingTimeMs / 1000))
      : null;

    return {
      missionStage: mission.stage,
      missionPrimary: mission.primary,
      missionSecondary: mission.secondary,
      objective: this.getCurrentObjective(),
      settings: {
        timerEnabled: this.timerEnabled,
        timerSecondsRemaining,
        allowMidairDash: this.allowMidairDash,
        allowProjectile: this.allowProjectile,
        allowDoubleJump: this.allowDoubleJump,
      },
    };
  }

  togglePause(nextState = !this.isPaused) {
    if (this.hasFinished || this.isInteractionLocked) return;
    if (this.isPaused === nextState) return;
    this.isPaused = nextState;
    this.player.freeze(nextState);
    nextState ? this.physics.world.pause() : this.physics.world.resume();
    this.callbacks.onPauseChange?.(nextState);
  }

  resumeFromOverlay() { this.togglePause(false); }
  requestExitFromOverlay() { this.callbacks.onExitRequest?.(); }

  failLevel(reason) {
    if (this.hasFinished) return;
    this.hasFinished = true;
    this.resetDamageFeedback();
    this.player.freeze(true);
    this.physics.world.pause();
    this.callbacks.onPauseChange?.(false);
    const statues = this.getStatueQuestionProgress();
    this.callbacks.onLevelFail?.({
      outcome: 'FAILED',
      reason,
      coinsCollected: this.coinsCollected,
      coinBalance: this.coinBalance,
      totalCoins: this.totalCoins,
      coinGoal: this.coinGoal,
      wrongAnswers: this.wrongAnswers,
      hintsUsed: this.hintsUsed,
      statuesAnswered: statues.answered,
      totalStatues: statues.total,
      shotsFired: this.playerShotsFired,
      shotsHit: this.playerShotsHit,
      elapsedMs: Date.now() - this.levelStartedAt,
      missionStage: this.getMissionSnapshot().stage,
    });
  }

  finishLevel() {
    if (this.hasFinished) return;
    this.hasFinished = true;
    this.resetDamageFeedback();
    this.player.freeze(true);
    this.physics.world.pause();
    this.callbacks.onPauseChange?.(false);
    const statues = this.getStatueQuestionProgress();
    this.callbacks.onLevelComplete?.({
      outcome: 'COMPLETED',
      coinsCollected: this.coinsCollected,
      coinBalance: this.coinBalance,
      totalCoins: this.totalCoins,
      coinGoal: this.coinGoal,
      wrongAnswers: this.wrongAnswers,
      hintsUsed: this.hintsUsed,
      statuesAnswered: statues.answered,
      totalStatues: statues.total,
      shotsFired: this.playerShotsFired,
      shotsHit: this.playerShotsHit,
      elapsedMs: Date.now() - this.levelStartedAt,
      missionStage: this.getMissionSnapshot().stage,
    });
  }

  update() {
    if (this.hasFinished) {
      this.updateInteractionPrompt(null);
      return;
    }
    if (wasPausePressed(this.controls)) { this.togglePause(); return; }
    if (this.isPaused || this.isInteractionLocked) {
      this.updateInteractionPrompt(null);
      return;
    }

    if (this.timerEnabled) {
      this.remainingTimeMs = Math.max(0, this.remainingTimeMs - Number(this.game.loop?.delta || 0));
      this.syncTimerRegistry();
      if (this.remainingTimeMs <= 0) {
        this.failLevel('timeout');
        return;
      }
    }

    const intent = readMovementIntent(this.controls);
    const playerIntent = {
      ...intent,
      dashPressed: this.allowMidairDash ? intent.dashPressed : false,
      attackPressed: this.allowProjectile ? intent.attackPressed : false,
      allowDoubleJump: this.allowDoubleJump,
    };
    const now = this.time.now;
    this.updateDangerState(now);

    if (playerIntent.attackPressed) {
      this.firePlayerProjectile();
    }

    this.player.update(playerIntent);
    this.ghosts.forEach((ghost) => ghost.update(now));
    this.villains.forEach((villain) => villain.faceTarget(this.player.x));
    this.projectileCasters.forEach((caster) => { caster.update(now); if (caster.shouldFire(now)) this.spawnProjectileFromCaster(caster, now); });
    this.projectiles = this.projectiles.filter((projectile) => {
      if (!projectile.active) return false;
      projectile.update(now);
      return projectile.active;
    });
    this.playerProjectiles = this.playerProjectiles.filter((projectile) => {
      if (!projectile.active) return false;
      projectile.update(now);
      return projectile.active;
    });

    this.updateInteractionPrompt(this.findNearbyInteractableVillain());

    this.updateStatueGuidance(now);
    const roomRecordBeforeSync = this.currentCellRecord;
    this.syncCurrentCellFromPlayer();
    if (this.player.y > this.worldLayout.bounds.bottom + 80) {
      this.applyDamage(1, 'fall', {
        respawn: true,
        bypassInvulnerability: true,
        respawnRoomRecord: roomRecordBeforeSync,
      });
    }
  }
}
