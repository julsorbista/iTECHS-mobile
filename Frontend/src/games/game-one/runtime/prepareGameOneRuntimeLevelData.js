const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const MAX_RUNTIME_TILE_SIZE = 1024;
const MAX_RUNTIME_TILE_Z_INDEX = 9999;
const MIN_RUNTIME_TILE_ROTATION = 0;
const MAX_RUNTIME_TILE_ROTATION = 359;
const REMOVED_FIRE_PLATFORM_MARKERS = Symbol('removed-fire-platform-markers');

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHexColor = (value, fallback = DEFAULT_ROOM_BACKGROUND_COLOR) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized.toLowerCase()
    : fallback;
};

const normalizeRenderLayer = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'front' ? 'front' : 'back';
};

const normalizeBlendMode = (value) => (
  String(value || '').trim().toLowerCase() === 'screen' ? 'screen' : 'normal'
);

const replaceLegacyLaserHazards = (worldObjects = {}) => {
  const platforms = Array.isArray(worldObjects.platforms) ? worldObjects.platforms : [];
  const coins = Array.isArray(worldObjects.coins) ? worldObjects.coins : [];
  const isLaserHazard = (platform) => (
    platform?.hazardType === 'laser'
    || platform?.hazardSpriteFrame === 'laser'
  );
  const isFireHazard = (platform) => (
    platform?.hazardType === 'fire' || platform?.hazardSpriteFrame === 'fireball'
  );
  const laserPlatforms = platforms.filter(isLaserHazard);
  const firePlatforms = platforms.filter(isFireHazard);
  if (laserPlatforms.length === 0 && firePlatforms.length === 0) {
    return { platforms, coins, firePatrolGhosts: [] };
  }

  const existingIds = new Set(coins.map((pickup) => pickup?.id));
  const poisonPickups = laserPlatforms
    .map((platform, index) => ({
      id: `${platform.id || `legacy-laser-${index + 1}`}-poison`,
      collectibleType: 'poison',
      spriteFrame: 'poison-potion-black',
      x: Number(platform.x) || 0,
      y: (Number(platform.y) || 0) - 62,
      size: 44,
    }))
    .filter((pickup) => !existingIds.has(pickup.id));

  return {
    platforms: platforms.flatMap((platform) => {
      if (isFireHazard(platform)) {
        return [];
      }
      if (!isLaserHazard(platform)) {
        return [platform];
      }
      const { hazard, hazardType, hazardSpriteFrame, damage, ...safePlatform } = platform;
      return [{
        ...safePlatform,
        id: `${platform.id || 'removed-hazard'}-poison-platform`,
      }];
    }),
    coins: [...coins, ...poisonPickups],
    firePatrolGhosts: firePlatforms.map((platform, index) => ({
      id: `${platform.id || `legacy-fire-${index + 1}`}-patrol-ghost`,
      enemyType: 'ghost',
      x: Number(platform.x) || 0,
      y: (Number(platform.y) || 0) - 72,
      patrolDistance: Math.max(38, Math.min(90, (Number(platform.width) || 76) * 0.4)),
      speed: 112,
      size: 60,
      chasePlayer: false,
      canJump: false,
    })),
  };
};

const replaceFireProjectileEnemies = (projectileEnemies = []) => {
  const enemies = Array.isArray(projectileEnemies) ? projectileEnemies : [];
  return {
    projectileEnemies: enemies,
    firePatrolGhosts: [],
  };
};

const POISON_ROOMS_BY_LEVEL = Object.freeze({
  1: [],
  2: [],
  3: [],
  4: [],
  5: [2, 4],
});

const LEVEL_ONE_SCROLL_CLUES = Object.freeze({
  'scroll-1': 'A program can give a reusable name to stored information so it can find and use that value again later.',
  'scroll-2': 'Stored information may be a number, word, or truth value, and it can be updated while the program runs.',
  'scroll-3': 'Use a named storage place when code must remember a score, price, message, or other value for later instructions.',
});

const applyCanonicalLevelOneScrollClues = (coins, levelNumber) => {
  if (!Array.isArray(coins) || Number(levelNumber) !== 1) return coins;
  return coins.map((pickup) => {
    const scrollId = String(pickup?.scrollId || pickup?.id || '').trim();
    const clueText = LEVEL_ONE_SCROLL_CLUES[scrollId];
    return clueText ? { ...pickup, clueText } : pickup;
  });
};

const removePlatformMovement = (platform) => {
  const { moveAxis, moveDistance, moveDuration, ...fixedPlatform } = platform;
  return fixedPlatform;
};

const removePlatformDisappearing = (platform) => {
  const { disappearEveryMs, collapseDelayMs, ...fixedPlatform } = platform;
  return fixedPlatform;
};

const applyCanonicalRoomLayout = (room, levelNumber, roomNumber) => {
  const numericLevel = Number(levelNumber);
  const numericRoom = Number(roomNumber);

  if (numericLevel === 2 && [3, 4, 5].includes(numericRoom)) {
    const fixedMovementIds = new Set(
      numericRoom === 3 ? ['r3-c'] : numericRoom === 4 ? ['r4-b'] : ['r5-a', 'r5-c'],
    );
    const fixedDisappearingIds = new Set(
      numericRoom === 4 ? ['r4-d'] : numericRoom === 5 ? ['r5-d'] : [],
    );
    return {
      ...room,
      platforms: (Array.isArray(room?.platforms) ? room.platforms : []).map((platform) => {
        let normalizedPlatform = platform;
        if (fixedMovementIds.has(platform?.id)) {
          normalizedPlatform = removePlatformMovement(normalizedPlatform);
        }
        if (fixedDisappearingIds.has(platform?.id)) {
          normalizedPlatform = removePlatformDisappearing(normalizedPlatform);
        }
        return normalizedPlatform;
      }),
    };
  }

  if (numericLevel === 3 && [2, 3].includes(numericRoom)) {
    const fixedMovementIds = new Set(
      numericRoom === 2
        ? ['r1-high-shuttle', 'r1-scroll-shuttle']
        : ['r3-center-shuttle'],
    );
    return {
      ...room,
      platforms: (Array.isArray(room?.platforms) ? room.platforms : []).map((platform) => (
        fixedMovementIds.has(platform?.id) ? removePlatformMovement(platform) : platform
      )),
      ghosts: (Array.isArray(room?.ghosts) ? room.ghosts : []).map((ghost) => (
        numericRoom === 3 && ghost?.id === 'r3-ghost'
          ? { ...ghost, x: 920, y: 565 }
          : ghost
      )),
    };
  }

  if (numericLevel === 4) {
    const fixedMovementIdsByRoom = {
      1: ['r1-scroll-shuttle'],
      2: ['r2-shuttle'],
      3: ['r3-left-lift', 'r3-right-lift'],
      5: ['r5-lift', 'r5-shuttle', 'r5-final-lift'],
    };
    const fixedMovementIds = new Set(fixedMovementIdsByRoom[numericRoom] || []);
    const shadowSpiritByRoom = {
      1: {
        id: 'r1-shadow-spirit', enemyType: 'shadowspirit', x: 895, y: 600,
        patrolDistance: 55, speed: 62, canJump: false,
      },
    };
    const roomGhosts = (Array.isArray(room?.ghosts) ? room.ghosts : [])
      .filter(({ id }) => !(numericRoom === 4 && id === 'r4-shadow-spirit'));
    const requiredShadowSpirit = shadowSpiritByRoom[numericRoom];
    const ghostsWithReplacement = requiredShadowSpirit
      && !roomGhosts.some(({ id }) => id === requiredShadowSpirit.id)
      ? [...roomGhosts, requiredShadowSpirit]
      : roomGhosts;
    return {
      ...room,
      platforms: (Array.isArray(room?.platforms) ? room.platforms : []).map((platform) => {
        if (!fixedMovementIds.has(platform?.id)) return platform;
        const fixedPlatform = removePlatformMovement(platform);
        return numericRoom === 1 && platform?.id === 'r1-scroll-shuttle'
          ? { ...fixedPlatform, x: 830 }
          : fixedPlatform;
      }),
      ghosts: ghostsWithReplacement.map((ghost) => {
        if (numericRoom === 1 && ghost?.id === 'r1-ghost') {
          return { ...ghost, visualOriginY: 0.44 };
        }
        return [4, 5].includes(numericRoom) && ['r4-ghost', 'r5-ghost'].includes(ghost?.id)
          ? { ...ghost, x: 920 }
          : ghost;
      }),
      projectileEnemies: (Array.isArray(room?.projectileEnemies) ? room.projectileEnemies : [])
        .map((enemy) => (
          numericRoom === 4 && enemy?.id === 'r4-elemental'
            ? { ...enemy, y: 390 }
            : enemy
        )),
    };
  }

  if (numericLevel === 5 && [1, 2, 5].includes(numericRoom)) {
    const roomPlatforms = Array.isArray(room?.platforms) ? room.platforms : [];
    const roomGhosts = Array.isArray(room?.ghosts) ? room.ghosts : [];
    const fixedHorizontalIds = new Set(
      numericRoom === 1
        ? ['r1-high-shuttle', 'r1-scroll-shuttle']
        : numericRoom === 2
          ? ['r2-shuttle']
          : ['r5-shuttle'],
    );
    const normalizedPlatforms = roomPlatforms.map((platform) => {
      if (numericRoom === 2 && platform?.id === 'r2-lower-one') {
        return {
          ...removePlatformMovement(platform),
          moveAxis: 'x',
          moveDistance: 60,
          moveDuration: 2050,
        };
      }
      if (!fixedHorizontalIds.has(platform?.id)) return platform;
      const fixedPlatform = removePlatformMovement(platform);
      return numericRoom === 1 && platform?.id === 'r1-scroll-shuttle'
        ? { ...fixedPlatform, x: 815, y: 480 }
        : fixedPlatform;
    });
    const levelFiveShadowSpirit = {
      id: 'r1-shadow-spirit', enemyType: 'shadowspirit', x: 895, y: 600,
      patrolDistance: 55, speed: 62, canJump: false,
    };
    return {
      ...room,
      platforms: normalizedPlatforms,
      ghosts: numericRoom === 1
        && !roomGhosts.some(({ id }) => id === levelFiveShadowSpirit.id)
        ? [...roomGhosts, levelFiveShadowSpirit]
        : roomGhosts,
    };
  }

  if (numericLevel !== 1) return room;

  if (numericRoom === 5) {
    return {
      ...room,
      platforms: (Array.isArray(room?.platforms) ? room.platforms : []).map((platform) => {
        if (!['room5-step-2', 'room5-step-4'].includes(platform?.id)) return platform;
        return removePlatformDisappearing(platform);
      }),
    };
  }

  if (numericRoom !== 4) return room;

  return {
    ...room,
    platforms: (Array.isArray(room?.platforms) ? room.platforms : []).map((platform) => (
      platform?.id === 'room4-moving'
        ? { ...platform, moveAxis: 'y', moveDistance: 114, moveDuration: 1900 }
        : platform
    )),
    ghosts: (Array.isArray(room?.ghosts) ? room.ghosts : []).map((ghost) => (
      ghost?.id === 'room4-ghost'
        ? { ...ghost, x: 920, y: 520 }
        : ghost
    )),
  };
};

const removeUnsupportedPoisonPickups = (coins, platforms) => {
  if (!Array.isArray(coins)) return coins;
  const visiblePlatforms = (Array.isArray(platforms) ? platforms : []).filter((platform) => (
    !platform?.hazard && !platform?.invisible
  ));
  return coins.filter((pickup) => {
    if (pickup?.collectibleType !== 'poison') return true;
    const poisonX = Number(pickup.x);
    const poisonY = Number(pickup.y);
    if (!Number.isFinite(poisonX) || !Number.isFinite(poisonY)) return false;
    return visiblePlatforms.some((platform) => {
      const platformX = Number(platform.x);
      const platformY = Number(platform.y);
      const platformWidth = Math.max(1, Number(platform.width ?? platform.bodyWidth) || 1);
      if (!Number.isFinite(platformX) || !Number.isFinite(platformY)) return false;
      const verticalGap = platformY - poisonY;
      return Math.abs(poisonX - platformX) <= (platformWidth / 2) + 8
        && verticalGap >= 20
        && verticalGap <= 100;
    });
  });
};

const FIXED_PLATFORM_ORDINAL_BY_LEVEL_ROOM = Object.freeze({
});

const FIXED_POISON_PLATFORM_ID_BY_LEVEL_ROOM = Object.freeze({});

const REMOVED_PLATFORM_IDS_BY_LEVEL = Object.freeze({
  2: new Set(['r5-fire-1']),
  3: new Set(['r1-right-lift', 'r3-fire', 'r4-rest', 'r5-right-rest', 'r5-fire-left', 'r5-fire-right']),
  4: new Set(['r2-lower-two', 'r4-fire', 'r5-fire-left', 'r5-fire-right']),
  5: new Set([
    'r1-right-lift', 'r2-lift', 'r2-lower-two',
    'r3-center-shuttle', 'r4-gate-two',
    'r5-fire-left', 'r5-fire-right',
  ]),
});

const REMOVED_PICKUP_IDS_BY_LEVEL = Object.freeze({
  5: new Set(['r3-jump']),
});

const removeSlimes = (ghosts) => (
  Array.isArray(ghosts)
    ? ghosts.filter((enemy) => !String(enemy?.enemyType || '').toLowerCase().includes('slime'))
    : []
);

const addMarkedPatrolGhosts = (ghosts, levelNumber, roomNumber) => {
  const cleanGhosts = removeSlimes(ghosts);
  const markedPatrols = {
    '2-3': { id: 'level2-r3-marked-patrol-ghost', x: 930, y: 600, patrolDistance: 62 },
    '3-2': { id: 'level3-r2-marked-patrol-ghost', x: 895, y: 600, patrolDistance: 62 },
    '3-4': { id: 'level3-r4-marked-patrol-ghost', x: 940, y: 600, patrolDistance: 62 },
    '4-2': { id: 'r2-marked-patrol-ghost', x: 910, y: 600, patrolDistance: 62 },
  };
  const config = markedPatrols[`${Number(levelNumber)}-${roomNumber}`];
  if (!config) return cleanGhosts;
  if (cleanGhosts.some(({ id }) => id === config.id)) return cleanGhosts;
  return [...cleanGhosts, {
    ...config,
    enemyType: 'ghost',
    speed: 112,
    size: 60,
    chasePlayer: false,
    canJump: false,
  }];
};

const finalizeGhostPlacementAndChaseDelay = (ghosts, platforms) => {
  const roomPlatforms = Array.isArray(platforms) ? platforms : [];
  return (Array.isArray(ghosts) ? ghosts : [])
    .filter((ghost) => {
      if (ghost?.chasePlayer !== false) return true;
      const ghostX = Number(ghost.x) || 0;
      const ghostY = Number(ghost.y) || 0;
      const ghostHalfHeight = (Number(ghost.size) || 60) / 2;
      return roomPlatforms.some((platform) => {
        if (platform?.hazard || platform?.invisible) return false;
        const platformX = Number(platform.x) || 0;
        const platformY = Number(platform.y) || 0;
        const platformWidth = Number(platform.width) || 0;
        const platformTop = platformY - ((Number(platform.bodyHeight) || 34) / 2);
        return Math.abs(ghostX - platformX) <= (platformWidth / 2) + 18
          && Math.abs((ghostY + ghostHalfHeight) - platformTop) <= 42;
      });
    })
    .map((ghost) => (
      ghost?.chasePlayer === false
        ? ghost
        : { ...ghost, chaseDelayMs: 1000 }
    ));
};

const addConfiguredPoisonPickups = (rooms, levelNumber) => {
  if (!Array.isArray(rooms)) return rooms;
  const configuredRooms = POISON_ROOMS_BY_LEVEL[Number(levelNumber)];
  if (!configuredRooms) return rooms;
  const targetRooms = new Set(configuredRooms);

  return rooms.map((room, roomIndex) => {
    const roomNumber = roomIndex + 1;
    const coins = (Array.isArray(room?.coins) ? room.coins : [])
      .filter(({ collectibleType }) => collectibleType !== 'poison');
    if (!targetRooms.has(roomNumber)) {
      return { ...room, coins };
    }

    const platforms = Array.isArray(room?.platforms) ? room.platforms : [];
    const removedFireMarkers = Array.isArray(room?.[REMOVED_FIRE_PLATFORM_MARKERS])
      ? room[REMOVED_FIRE_PLATFORM_MARKERS]
      : [];
    const numberedPlatforms = platforms.filter((platform) => (
      !platform?.hazard
      && !platform?.invisible
      && !/(exit|chest|floor|poison-platform)/i.test(String(platform?.id || ''))
    ));
    const playablePlatforms = numberedPlatforms.filter((platform) => (
      !platform?.hazard
      && !platform?.invisible
      && !/(start|exit|chest|floor|poison-platform)/i.test(String(platform?.id || ''))
      && Number(platform?.width) >= 70
    ));
    const thirdOrFourthPlatforms = playablePlatforms.slice(2, 4);
    const stableCandidates = thirdOrFourthPlatforms.filter((platform) => (
      !platform?.moveAxis && !platform?.disappearEveryMs && !platform?.collapseDelayMs
    ));
    const candidates = stableCandidates.length > 0 ? stableCandidates : thirdOrFourthPlatforms;
    const fixedOrdinal = FIXED_PLATFORM_ORDINAL_BY_LEVEL_ROOM[`${Number(levelNumber)}-${roomNumber}`];
    const fixedPlatformId = FIXED_POISON_PLATFORM_ID_BY_LEVEL_ROOM[`${Number(levelNumber)}-${roomNumber}`];
    const useMarkedPoisonPlatform = Number(levelNumber) === 5
      || (Number(levelNumber) === 2 && [2, 4, 5].includes(roomNumber))
      || (Number(levelNumber) === 4 && [1, 3].includes(roomNumber));
    const markedLevelFivePlatforms = useMarkedPoisonPlatform
      ? [...platforms, ...removedFireMarkers]
          .filter((platform) => /poison-platform/i.test(String(platform?.id || '')))
      : [];
    const markedLevelFivePlatform = markedLevelFivePlatforms.reduce((rightmost, platform) => (
      !rightmost || Number(platform.x) > Number(rightmost.x) ? platform : rightmost
    ), null);
    if (!fixedOrdinal && !fixedPlatformId && !markedLevelFivePlatform && candidates.length === 0) return room;

    const platform = platforms.find(({ id }) => id === fixedPlatformId) || markedLevelFivePlatform || (fixedOrdinal
      ? numberedPlatforms[fixedOrdinal - 1]
      : candidates.reduce((highest, candidate) => (
          Number(candidate.y) < Number(highest.y) ? candidate : highest
        )));
    if (!platform) return room;
    const platformWidth = Math.max(0, Number(platform.width) || 0);
    const sideOffset = Number(levelNumber) === 1 && roomNumber === 1
      ? Math.max(0, (platformWidth / 2) - 24)
      : (markedLevelFivePlatform
        ? 0
        : Math.min(36, platformWidth * 0.22) * (roomNumber % 2 === 0 ? -1 : 1));
    const poison = {
      id: `level-${Number(levelNumber)}-room-${roomNumber}-poison`,
      collectibleType: 'poison',
      spriteFrame: 'poison-potion-black',
      x: (Number(platform.x) || 0) + sideOffset,
      y: (Number(platform.y) || 0) - ((Number(platform.bodyHeight) || 34) / 2) - 26,
      size: 44,
    };

    return { ...room, coins: [...coins, poison] };
  });
};

const relocateTreasureAdjacentShields = (room, levelNumber, roomNumber) => {
  const coins = Array.isArray(room?.coins) ? room.coins : [];
  const portal = room?.portal;
  if (!portal?.endsLevel) return room;

  const treasureX = Number(portal.x) || 1160;
  const hazards = (Array.isArray(room?.platforms) ? room.platforms : [])
    .filter(({ hazard }) => hazard);
  const poisons = coins.filter(({ collectibleType }) => collectibleType === 'poison');
  const platforms = (Array.isArray(room?.platforms) ? room.platforms : []).filter((platform) => (
    !platform?.hazard
    && !platform?.invisible
    && !/(start|exit|chest|floor|poison-platform)/i.test(String(platform?.id || ''))
  ));
  const explicitTargetId = Number(levelNumber) === 1 && roomNumber === 5 ? 'room5-step-1' : null;
  const safePlatforms = platforms.filter((platform) => {
    const x = Number(platform.x) || 0;
    const width = Number(platform.width) || 0;
    const nearPoison = poisons.some((poison) => Math.abs((Number(poison.x) || 0) - x) < 150);
    const nearHazard = hazards.some((hazard) => (
      Math.abs((Number(hazard.x) || 0) - x) < (((Number(hazard.width) || 0) + width) / 2 + 70)
    ));
    return !nearPoison && !nearHazard;
  });
  const target = platforms.find(({ id }) => id === explicitTargetId)
    || safePlatforms.sort((left, right) => Number(left.x) - Number(right.x))[0];
  if (!target) return room;

  return {
    ...room,
    coins: coins.map((pickup) => {
      if (pickup?.collectibleType !== 'shield' || Math.abs((Number(pickup.x) || 0) - treasureX) > 240) {
        return pickup;
      }
      return {
        ...pickup,
        x: Number(target.x) || 0,
        y: (Number(target.y) || 0) - ((Number(target.bodyHeight) || 34) / 2) - 28,
      };
    }),
  };
};

export const toGameOneRuntimeTileTextureKey = (tileId, index) => {
  const safeTileId = typeof tileId === 'string' && tileId.trim()
    ? tileId.trim()
    : `tile-${index + 1}`;

  return `runtime-bg-${safeTileId}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
};

export const normalizeGameOneRuntimeBackgroundTiles = (
  tiles,
  {
    platformTileByKey = {},
    viewport = {},
  } = {},
) => {
  if (!Array.isArray(tiles)) {
    return [];
  }

  const viewportWidth = Math.max(1, Number(viewport?.width) || 1280);
  const viewportHeight = Math.max(1, Number(viewport?.height) || 720);
  const fallbackX = Math.round(viewportWidth * 0.5);
  const fallbackY = Math.round(viewportHeight * 0.5);

  return tiles
    .map((tile, index) => {
      if (!tile || typeof tile !== 'object' || Array.isArray(tile)) {
        return null;
      }

      const tileKey = typeof tile.tileKey === 'string' ? tile.tileKey.trim().slice(0, 120) : '';
      if (!tileKey) {
        return null;
      }

      const visual = platformTileByKey[tileKey];
      const imageUrl = typeof tile.imageUrl === 'string' && tile.imageUrl.trim()
        ? tile.imageUrl.trim()
        : visual?.url;
      if (!imageUrl) {
        return null;
      }

      const id = typeof tile.id === 'string' && tile.id.trim()
        ? tile.id.trim().slice(0, 120)
        : `bg-tile-${index + 1}`;

      return {
        id,
        tileKey,
        textureKey: typeof tile.textureKey === 'string' && tile.textureKey.trim()
          ? tile.textureKey.trim().slice(0, 140)
          : toGameOneRuntimeTileTextureKey(id, index),
        imageUrl,
        renderLayer: normalizeRenderLayer(tile.renderLayer),
        x: toFiniteNumber(tile.x, fallbackX),
        y: toFiniteNumber(tile.y, fallbackY),
        size: clampNumber(tile.size, 16, MAX_RUNTIME_TILE_SIZE, 96),
        zIndex: clampNumber(tile.zIndex, 0, MAX_RUNTIME_TILE_Z_INDEX, index),
        rotationDeg: clampNumber(
          ((Math.round(Number(tile.rotationDeg) || 0) % 360) + 360) % 360,
          MIN_RUNTIME_TILE_ROTATION,
          MAX_RUNTIME_TILE_ROTATION,
          0,
        ),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
        blendMode: normalizeBlendMode(tile.blendMode || visual?.blendMode),
        __sourceIndex: index,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.renderLayer !== right.renderLayer) {
        return left.renderLayer === 'front' ? 1 : -1;
      }

      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex;
      }

      return left.__sourceIndex - right.__sourceIndex;
    })
    .map(({ __sourceIndex, ...tile }) => tile);
};

export const prepareGameOneRuntimeLevelData = (
  rawLevelData,
  {
    platformTileByKey = {},
  } = {},
) => {
  if (!rawLevelData || typeof rawLevelData !== 'object') {
    return rawLevelData;
  }

  const viewport = {
    width: Math.max(1, Number(rawLevelData?.viewport?.width) || 1280),
    height: Math.max(1, Number(rawLevelData?.viewport?.height) || 720),
  };
  const worldObjects = rawLevelData.worldObjects && typeof rawLevelData.worldObjects === 'object'
    ? rawLevelData.worldObjects
    : {};
  const cells = Array.isArray(rawLevelData?.grid?.cells)
    ? rawLevelData.grid.cells.map((cell) => ({
        ...cell,
        backgroundColor: normalizeHexColor(cell?.backgroundColor),
      }))
    : [];
  const migratedObjects = replaceLegacyLaserHazards(worldObjects);
  const migratedWorldProjectileEnemies = replaceFireProjectileEnemies(worldObjects.projectileEnemies);
  const migratedRooms = Array.isArray(rawLevelData.rooms)
    ? rawLevelData.rooms.map((room, roomIndex) => {
        const canonicalRoom = applyCanonicalRoomLayout(
          room,
          rawLevelData.levelNumber,
          roomIndex + 1,
        );
        const removedPlatformIds = REMOVED_PLATFORM_IDS_BY_LEVEL[Number(rawLevelData.levelNumber)];
        const roomPlatforms = removedPlatformIds
          ? (Array.isArray(canonicalRoom?.platforms) ? canonicalRoom.platforms : [])
              .filter((platform) => (
                !removedPlatformIds.has(platform.id)
                || platform?.hazardType === 'fire'
                || platform?.hazardSpriteFrame === 'fireball'
              ))
          : canonicalRoom?.platforms;
        const removedPickupIds = REMOVED_PICKUP_IDS_BY_LEVEL[Number(rawLevelData.levelNumber)];
        const roomCoins = removedPickupIds
          ? (Array.isArray(canonicalRoom?.coins) ? canonicalRoom.coins : [])
              .filter(({ id }) => !removedPickupIds.has(id))
          : canonicalRoom?.coins;
        const migratedRoomObjects = replaceLegacyLaserHazards({
          platforms: roomPlatforms,
          coins: roomCoins,
        });
        const migratedProjectileEnemies = replaceFireProjectileEnemies(canonicalRoom?.projectileEnemies);
        const firePatrolGhosts = Number(rawLevelData.levelNumber) === 1 && roomIndex === 4
          ? []
          : migratedRoomObjects.firePatrolGhosts;
        return {
          ...canonicalRoom,
          platforms: migratedRoomObjects.platforms,
          coins: applyCanonicalLevelOneScrollClues(
            migratedRoomObjects.coins,
            rawLevelData.levelNumber,
          ),
          [REMOVED_FIRE_PLATFORM_MARKERS]: roomPlatforms
            .filter((platform) => (
              platform?.hazardType === 'fire' || platform?.hazardSpriteFrame === 'fireball'
            ))
            .map((platform) => ({
              ...platform,
              id: `${platform.id || 'removed-fire'}-poison-platform`,
              hazard: false,
            })),
          projectileEnemies: migratedProjectileEnemies.projectileEnemies,
          ghosts: finalizeGhostPlacementAndChaseDelay(
            addMarkedPatrolGhosts(
              [
                ...(Array.isArray(canonicalRoom?.ghosts) ? canonicalRoom.ghosts : []),
                ...firePatrolGhosts,
                ...migratedProjectileEnemies.firePatrolGhosts,
              ],
              rawLevelData.levelNumber,
              roomIndex + 1,
            ),
            migratedRoomObjects.platforms,
          ),
        };
      })
    : rawLevelData.rooms;
  const rooms = addConfiguredPoisonPickups(migratedRooms, rawLevelData.levelNumber)
    ?.map((room, roomIndex) => {
      const relocatedRoom = relocateTreasureAdjacentShields(
        room,
        rawLevelData.levelNumber,
        roomIndex + 1,
      );
      const { [REMOVED_FIRE_PLATFORM_MARKERS]: ignoredMarkers, ...cleanRoom } = relocatedRoom;
      return {
        ...cleanRoom,
        coins: removeUnsupportedPoisonPickups(cleanRoom.coins, cleanRoom.platforms),
      };
    });

  return {
    ...rawLevelData,
    settings: {
      ...(rawLevelData.settings || {}),
      playerHealth: 3,
    },
    rooms,
    viewport,
    grid: {
      ...(rawLevelData.grid || {}),
      cells,
    },
    worldObjects: {
      ...worldObjects,
      platforms: migratedObjects.platforms,
      coins: removeUnsupportedPoisonPickups(
        applyCanonicalLevelOneScrollClues(migratedObjects.coins, rawLevelData.levelNumber),
        migratedObjects.platforms,
      ),
      projectileEnemies: migratedWorldProjectileEnemies.projectileEnemies,
      ghosts: finalizeGhostPlacementAndChaseDelay(
        removeSlimes([
          ...(Array.isArray(worldObjects.ghosts) ? worldObjects.ghosts : []),
          ...migratedObjects.firePatrolGhosts,
          ...migratedWorldProjectileEnemies.firePatrolGhosts,
        ]),
        migratedObjects.platforms,
      ),
      backgroundTiles: normalizeGameOneRuntimeBackgroundTiles(worldObjects.backgroundTiles, {
        platformTileByKey,
        viewport,
      }),
    },
  };
};

export default prepareGameOneRuntimeLevelData;
