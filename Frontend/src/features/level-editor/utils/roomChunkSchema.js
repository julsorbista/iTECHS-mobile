import {
  normalizeTriggerPlatformAction,
  normalizeTriggerPlatformCells,
  normalizeTriggerPlatformComponent,
  normalizeTriggerPlatformGoThrough,
} from '../../../games/game-one/systems/triggerPlatformUtils';

export const ROOM_CHUNK_SCHEMA_VERSION = 1;

const DEFAULT_BACKGROUND_KEY = 'tutorialGrove';
const ROOM_VIEWPORT_WIDTH = 1296;
const ROOM_VIEWPORT_HEIGHT = 720;
const DEFAULT_GRID_ROWS = 18;
const DEFAULT_GRID_COLS = 32;
const MAX_ROOMS = 500;
const MAX_ROOM_COMPONENTS = 200;
const MAX_ROOM_BACKGROUND_TILES = 1200;
const STATUE_TOPIC_MAX_LENGTH = 140;
const DEFAULT_LEVEL_PLAYER_HEALTH = 3;
const DEFAULT_LEVEL_TIMER_SECONDS = 120;
const DEFAULT_LEVEL_ALLOW_MIDAIR_DASH = true;
const DEFAULT_LEVEL_ALLOW_PROJECTILE = true;
const DEFAULT_LEVEL_ALLOW_DOUBLE_JUMP = true;
const DEFAULT_SHARED_GRID_SNAP = 48;
const DEFAULT_JUMP_HEIGHT = 173;
const DEFAULT_JUMP_SPEED = 720;
const DEFAULT_JUMP_KEYBIND = 'SPACE';
const DEFAULT_DASH_MODE = 'AIR_ONLY';
const DEFAULT_DASH_SPEED = 760;
const DEFAULT_DASH_DISTANCE = 122;
const DEFAULT_DASH_KEYBIND = 'SHIFT';
const DEFAULT_DASH_COOLDOWN_MS = 0;
const DEFAULT_PROJECTILE_DAMAGE = 1;
const DEFAULT_PROJECTILE_SIZE = 48;
const DEFAULT_PROJECTILE_BURST_COUNT = 1;
const DEFAULT_PROJECTILE_COOLDOWN_MS = 280;
const DEFAULT_PROJECTILE_KEYBIND = 'J';
const DEFAULT_PROJECTILE_SPEED = 560;
const DEFAULT_PROJECTILE_DISTANCE = 700;
const DEFAULT_ROOM_TILE_SIZE = 96;
const MIN_COMPONENT_SIZE = 16;
const DEFAULT_COMPONENT_SIZE = 60;
const DEFAULT_COIN_SIZE = 36;
const DEFAULT_STATUE_SIZE = 212;
const DEFAULT_STATUE_TEXTURE_KEY = 'teacher-statue-elem12';
const DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER = 1;
const MAX_ROOM_TILE_SIZE = 1024;
const MAX_ROOM_TILE_Z_INDEX = 9999;
const MIN_ROOM_TILE_ROTATION = 0;
const MAX_ROOM_TILE_ROTATION = 359;
const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const DEFAULT_CHARACTER_RENDER_LAYER = 'back';
const INVISIBLE_PLATFORM_Y_MIN = -20000;
const INVISIBLE_PLATFORM_Y_MAX = 20000;
const PASS_THROUGH_SIDES = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
const GHOST_MOVEMENT_DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
const STATUE_AI_DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const DASH_MODE_OPTIONS = ['AIR_ONLY', 'GROUND_ONLY', 'BOTH'];
const DEFAULT_STATUE_AI_LANGUAGE = 'English';
// Keep these as divisors of the 1296x720 editor viewport so grid edges stay full cells.
const SHARED_GRID_SNAP_OPTIONS = new Set([0, 16, 24, 48]);
const COMPONENT_TYPES = new Set([
  'spawn',
  'invisiblePlatform',
  'coin',
  'ghost',
  'slimeGreen',
  'slimeOrange',
  'projectileEnemy',
  'villain1',
  'boss',
  'portal',
  'portal3',
  'statue',
  'triggerPlatform',
]);


const clampInteger = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

export const createDefaultRoomChunkData = () => ({
  version: ROOM_CHUNK_SCHEMA_VERSION,
  grid: {
    rows: DEFAULT_GRID_ROWS,
    cols: DEFAULT_GRID_COLS,
  },
  settings: {
    backgroundKey: DEFAULT_BACKGROUND_KEY,
    playerHealth: DEFAULT_LEVEL_PLAYER_HEALTH,
    timerEnabled: false,
    timerSeconds: DEFAULT_LEVEL_TIMER_SECONDS,
    allowMidairDash: DEFAULT_LEVEL_ALLOW_MIDAIR_DASH,
    allowProjectile: DEFAULT_LEVEL_ALLOW_PROJECTILE,
    allowDoubleJump: DEFAULT_LEVEL_ALLOW_DOUBLE_JUMP,
    sharedGridSnap: DEFAULT_SHARED_GRID_SNAP,
  },
  rooms: [
    {
      id: 'room-1',
      name: 'Room 1',
      row: 0,
      col: 0,
      backgroundKey: DEFAULT_BACKGROUND_KEY,
      backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
      links: [],
      components: [],
      backgroundTiles: [],
    },
  ],
});

const normalizeLinks = (links, roomIds) => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => {
      if (!link || typeof link !== 'object') {
        return null;
      }

      const targetRoomId = typeof link.targetRoomId === 'string' ? link.targetRoomId.trim() : '';
      if (!targetRoomId || !roomIds.has(targetRoomId)) {
        return null;
      }

      const doorway = typeof link.doorway === 'string' ? link.doorway.trim().toUpperCase() : 'AUTO';
      const normalizedDoorway = ['N', 'E', 'S', 'W', 'AUTO'].includes(doorway) ? doorway : 'AUTO';

      return {
        targetRoomId,
        doorway: normalizedDoorway,
      };
    })
    .filter(Boolean);
};

const normalizePortal = (portal, roomIds) => {
  if (!portal || typeof portal !== 'object' || Array.isArray(portal)) {
    return null;
  }

  const targetRoomId = typeof portal.targetRoomId === 'string' ? portal.targetRoomId.trim() : '';
  const hasValidTarget = Boolean(targetRoomId) && roomIds.has(targetRoomId);

  if (!hasValidTarget && portal.endsLevel !== true) {
    return null;
  }

  return {
    targetRoomId: hasValidTarget ? targetRoomId : null,
    endsLevel: hasValidTarget ? false : true,
  };
};

const normalizePassThroughSides = (value) => {
  if (Array.isArray(value)) {
    const nextSides = value
      .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
      .filter((entry) => PASS_THROUGH_SIDES.includes(entry));

    return Array.from(new Set(nextSides));
  }

  if (isPlainObject(value)) {
    return PASS_THROUGH_SIDES.filter((side) => {
      const lowercase = side.toLowerCase();
      return Boolean(value[lowercase] || value[side]);
    });
  }

  return [];
};

const normalizeStatueChoices = (value) => {
  const source = Array.isArray(value) ? value : [];
  const trimmed = source
    .map((entry) => (typeof entry === 'string' ? entry.trim().slice(0, 120) : ''))
    .filter(Boolean)
    .slice(0, 4);

  if (trimmed.length >= 2) {
    return trimmed;
  }

  return ['A', 'B', 'C', 'D'];
};

const normalizeStatueQuestionTopic = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.slice(0, STATUE_TOPIC_MAX_LENGTH);
};

const normalizeStatueAIDifficulty = (value) => {
  if (typeof value !== 'string') {
    return 'medium';
  }

  const normalized = value.trim().toLowerCase();
  return STATUE_AI_DIFFICULTY_OPTIONS.includes(normalized)
    ? normalized
    : 'medium';
};

const normalizeStatueLanguage = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_STATUE_AI_LANGUAGE;
  }

  const normalized = value.trim().slice(0, 40);
  return normalized || DEFAULT_STATUE_AI_LANGUAGE;
};

const normalizeStatueGradeLevel = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 40);
};

const normalizeStatueInstructions = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 500);
};

const normalizeSharedGridSnap = (value, fallback = DEFAULT_SHARED_GRID_SNAP) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && SHARED_GRID_SNAP_OPTIONS.has(parsed)) {
    return parsed;
  }

  const fallbackParsed = Number(fallback);
  if (Number.isInteger(fallbackParsed) && SHARED_GRID_SNAP_OPTIONS.has(fallbackParsed)) {
    return fallbackParsed;
  }

  return DEFAULT_SHARED_GRID_SNAP;
};

const normalizeLevelSettings = (settings, fallbackBackground = DEFAULT_BACKGROUND_KEY) => {
  const source = isPlainObject(settings) ? settings : {};
  const backgroundKey = typeof source.backgroundKey === 'string' && source.backgroundKey.trim()
    ? source.backgroundKey.trim().slice(0, 40)
    : fallbackBackground;
  const timerEnabled = Boolean(source.timerEnabled);

  return {
    backgroundKey,
    playerHealth: clampInteger(source.playerHealth, 1, 10, DEFAULT_LEVEL_PLAYER_HEALTH),
    timerEnabled,
    timerSeconds: clampInteger(source.timerSeconds, 10, 3600, DEFAULT_LEVEL_TIMER_SECONDS),
    allowMidairDash: source.allowMidairDash !== false,
    allowProjectile: source.allowProjectile !== false,
    allowDoubleJump: source.allowDoubleJump !== false,
    sharedGridSnap: normalizeSharedGridSnap(source.sharedGridSnap),
  };
};

const sanitizeTextureKey = (value, fallback = 'grass') => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim().slice(0, 40);
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeBackgroundColor = (value, fallback = DEFAULT_ROOM_BACKGROUND_COLOR) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized.toLowerCase()
    : fallback;
};

const normalizeTileRotation = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampInteger(fallback, MIN_ROOM_TILE_ROTATION, MAX_ROOM_TILE_ROTATION, 0);
  }

  const rounded = Math.round(parsed);
  const normalized = ((rounded % 360) + 360) % 360;
  return clampInteger(normalized, MIN_ROOM_TILE_ROTATION, MAX_ROOM_TILE_ROTATION, 0);
};

const normalizeCharacterRenderLayer = (value, fallback = DEFAULT_CHARACTER_RENDER_LAYER) => {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';

  if (normalized === 'front') {
    return 'front';
  }

  if (normalized === 'back') {
    return 'back';
  }

  return fallback === 'front' ? 'front' : DEFAULT_CHARACTER_RENDER_LAYER;
};

const normalizeProjectileEnemyType = (value, fallback = 'elemental') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['elemental', 'hunter', 'boss', 'villain1', 'spiritboss'].includes(normalized)) {
    return normalized;
  }

  if (normalized === 'spirit-boss' || normalized === 'boss6') {
    return 'spiritboss';
  }

  return fallback;
};

const normalizeBackgroundTiles = (tiles) => {
  if (!Array.isArray(tiles)) {
    return [];
  }

  const usedIds = new Set();

  return tiles
    .slice(0, MAX_ROOM_BACKGROUND_TILES)
    .map((tile, index) => {
      if (!isPlainObject(tile)) {
        return null;
      }

      const tileKey = typeof tile.tileKey === 'string'
        ? tile.tileKey.trim().slice(0, 120)
        : '';

      if (!tileKey) {
        return null;
      }

      const rawId = typeof tile.id === 'string' && tile.id.trim()
        ? tile.id.trim().slice(0, 80)
        : `tile-${index + 1}`;

      let id = rawId;
      while (usedIds.has(id)) {
        id = `${rawId}-${usedIds.size + 1}`.slice(0, 80);
      }
      usedIds.add(id);

      return {
        id,
        tileKey,
        x: clampInteger(tile.x, 0, ROOM_VIEWPORT_WIDTH, Math.round(ROOM_VIEWPORT_WIDTH * 0.5)),
        y: clampInteger(tile.y, 0, ROOM_VIEWPORT_HEIGHT, Math.round(ROOM_VIEWPORT_HEIGHT * 0.5)),
        renderLayer: normalizeCharacterRenderLayer(tile.renderLayer),
        snapToGrid: tile.snapToGrid !== false,
        size: clampInteger(tile.size, 16, MAX_ROOM_TILE_SIZE, DEFAULT_ROOM_TILE_SIZE),
        zIndex: clampInteger(tile.zIndex, 0, MAX_ROOM_TILE_Z_INDEX, index),
        rotationDeg: normalizeTileRotation(tile.rotationDeg, 0),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
      };
    })
    .filter(Boolean);
};

const normalizeComponents = (components, sharedPortalLinkNameCounts = null, gridSize = DEFAULT_SHARED_GRID_SNAP) => {
  if (!Array.isArray(components)) {
    return [];
  }

  const usedIds = new Set();
  const portalLinkNameCounts = sharedPortalLinkNameCounts || new Map();

  return components
    .slice(0, MAX_ROOM_COMPONENTS)
    .map((component, index) => {
      if (!component || typeof component !== 'object' || Array.isArray(component)) {
        return null;
      }

      const rawType = typeof component.type === 'string' ? component.type.trim() : '';
      const type = rawType && COMPONENT_TYPES.has(rawType) ? rawType : null;
      if (!type) {
        return null;
      }

      const x = clampInteger(component.x, 0, ROOM_VIEWPORT_WIDTH, Math.round(ROOM_VIEWPORT_WIDTH * 0.5));
      const y = type === 'invisiblePlatform'
        ? clampInteger(component.y, INVISIBLE_PLATFORM_Y_MIN, INVISIBLE_PLATFORM_Y_MAX, 360)
        : clampInteger(component.y, 0, ROOM_VIEWPORT_HEIGHT, Math.round(ROOM_VIEWPORT_HEIGHT * 0.5));

      const rawId = typeof component.id === 'string' && component.id.trim()
        ? component.id.trim().slice(0, 80)
        : `cmp-${type}-${index + 1}`;
      let id = rawId;
      if (usedIds.has(id)) {
        id = `${rawId}-${index + 1}`.slice(0, 80);
      }
      while (usedIds.has(id)) {
        id = `${rawId}-${usedIds.size + 1}`.slice(0, 80);
      }
      usedIds.add(id);

      const normalized = {
        id,
        type,
        x,
        y,
        snapToGrid: component.snapToGrid !== false,
      };

      if (type !== 'spawn') {
        normalized.renderLayer = normalizeCharacterRenderLayer(component.renderLayer);
      }

      if (['spawn', 'coin', 'ghost', 'slimeGreen', 'slimeOrange', 'projectileEnemy', 'villain1', 'boss', 'portal', 'portal3', 'statue'].includes(type)) {
        normalized.size = clampInteger(
          component.size,
          MIN_COMPONENT_SIZE,
          MAX_ROOM_TILE_SIZE,
          type === 'statue'
            ? DEFAULT_STATUE_SIZE
            : (type === 'coin' ? DEFAULT_COIN_SIZE : DEFAULT_COMPONENT_SIZE),
        );
      }

      if (type === 'spawn') {
        normalized.health = clampInteger(component.health, 1, 10, DEFAULT_LEVEL_PLAYER_HEALTH);
        normalized.allowMidairDash = component.allowMidairDash !== false;
        normalized.allowProjectile = component.allowProjectile !== false;
        normalized.allowDoubleJump = component.allowDoubleJump !== false;
        Object.assign(normalized, normalizePlayerAbilityFields(component));
      }

      if (['ghost', 'slimeGreen', 'slimeOrange'].includes(type)) {
        normalized.patrolDistance = clampInteger(component.patrolDistance, 20, 1200, 220);
        normalized.speed = clampInteger(component.speed, 10, 600, 80);
        const movementDirection = typeof component.movementDirection === 'string'
          ? component.movementDirection.trim().toUpperCase()
          : 'LEFT';
        normalized.movementDirection = GHOST_MOVEMENT_DIRECTIONS.includes(movementDirection)
          ? movementDirection
          : 'LEFT';
      }

      if (type === 'invisiblePlatform') {
        normalized.width = clampInteger(component.width, 40, ROOM_VIEWPORT_WIDTH, 220);
        normalized.height = clampInteger(component.height, 8, 360, 36);
        normalized.passThroughSides = normalizePassThroughSides(component.passThroughSides);
      }

      if (type === 'triggerPlatform') {
        Object.assign(normalized, normalizeTriggerPlatformComponent(component, {
          gridSize,
          viewport: {
            width: ROOM_VIEWPORT_WIDTH,
            height: ROOM_VIEWPORT_HEIGHT,
          },
        }));
        normalized.cells = normalizeTriggerPlatformCells(component.cells, {
          gridSize,
          viewport: {
            width: ROOM_VIEWPORT_WIDTH,
            height: ROOM_VIEWPORT_HEIGHT,
          },
        });
        normalized.passThroughSides = normalizePassThroughSides(component.passThroughSides);
        normalized.correctAction = normalizeTriggerPlatformAction(component.correctAction, 'NONE');
        normalized.wrongAction = normalizeTriggerPlatformAction(component.wrongAction, 'NONE');
        normalized.correctGoThrough = normalizeTriggerPlatformGoThrough(component.correctGoThrough);
        normalized.wrongGoThrough = normalizeTriggerPlatformGoThrough(component.wrongGoThrough);
      }

      if (['projectileEnemy', 'villain1', 'boss'].includes(type)) {
        const baseEnemyType = type === 'villain1'
          ? 'villain1'
          : (type === 'boss' ? 'spiritboss' : 'elemental');
        const enemyType = normalizeProjectileEnemyType(component.enemyType, baseEnemyType);
        const enemyDefaults = enemyType === 'spiritboss'
          ? {
              fireIntervalMs: 1250,
              projectileSpeed: 360,
              projectileLifetimeMs: 3200,
              initialDelayMs: 900,
              hitPoints: 12,
            }
          : (enemyType === 'boss'
            ? {
                fireIntervalMs: 1500,
                projectileSpeed: 320,
                projectileLifetimeMs: 3000,
                initialDelayMs: 900,
                hitPoints: 8,
              }
            : (enemyType === 'villain1'
              ? {
                  fireIntervalMs: 1650,
                  projectileSpeed: 300,
                  projectileLifetimeMs: 2400,
                  initialDelayMs: 700,
                  hitPoints: 2,
                }
              : {
                  fireIntervalMs: 1800,
                  projectileSpeed: 285,
                  projectileLifetimeMs: 2550,
                  initialDelayMs: 900,
                  hitPoints: 1,
                }));

        const fireDirection = typeof component.fireDirection === 'string'
          ? component.fireDirection.trim().toUpperCase()
          : 'LEFT';
        normalized.enemyType = enemyType;
        normalized.fireDirection = ['LEFT', 'RIGHT'].includes(fireDirection) ? fireDirection : 'LEFT';
        normalized.fireIntervalMs = clampInteger(component.fireIntervalMs, 300, 12000, enemyDefaults.fireIntervalMs);
        normalized.projectileSpeed = clampInteger(component.projectileSpeed, 60, 900, enemyDefaults.projectileSpeed);
        normalized.projectileLifetimeMs = clampInteger(component.projectileLifetimeMs, 200, 12000, enemyDefaults.projectileLifetimeMs);
        normalized.initialDelayMs = clampInteger(component.initialDelayMs, 0, 12000, enemyDefaults.initialDelayMs);
        normalized.hitPoints = clampInteger(component.hitPoints, 1, 200, enemyDefaults.hitPoints);
      }

      if (type === 'portal' || type === 'portal3') {
        const rawVariant = typeof component.variant === 'string'
          ? component.variant.trim().toLowerCase()
          : '';
        const rawLinkName = typeof component.linkName === 'string' ? component.linkName.trim().slice(0, 40) : '';
        const currentCount = rawLinkName ? (portalLinkNameCounts.get(rawLinkName) || 0) : 0;
        if (rawLinkName && currentCount < 2) {
          normalized.linkName = rawLinkName;
          portalLinkNameCounts.set(rawLinkName, currentCount + 1);
        } else {
          normalized.linkName = '';
        }

        normalized.locked = Boolean(component.locked);
        normalized.endsLevel = Boolean(component.endsLevel);
        normalized.variant = rawVariant === 'portal3'
          ? 'portal3'
          : 'portal3';
      }

      if (type === 'statue') {
        normalized.textureKey = sanitizeTextureKey(component.textureKey, DEFAULT_STATUE_TEXTURE_KEY);
        normalized.triggerId = typeof component.triggerId === 'string'
          ? component.triggerId.trim().slice(0, 80)
          : (typeof component.questionId === 'string' ? component.questionId.trim().slice(0, 80) : '');
        normalized.questionTopic = normalizeStatueQuestionTopic(component.questionTopic);
        normalized.aiChoicesCount = clampInteger(component.aiChoicesCount, 2, 6, 4);
        normalized.aiDifficulty = normalizeStatueAIDifficulty(component.aiDifficulty);
        normalized.aiLanguage = normalizeStatueLanguage(component.aiLanguage);
        normalized.aiGradeLevel = normalizeStatueGradeLevel(component.aiGradeLevel);
        normalized.aiInstructions = normalizeStatueInstructions(component.aiInstructions);
        normalized.damageOnWrongAnswer = clampInteger(
          component.damageOnWrongAnswer,
          0,
          10,
          DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER,
        );
        normalized.prompt = typeof component.prompt === 'string' && component.prompt.trim()
          ? component.prompt.trim().slice(0, 240)
          : 'Solve the statue riddle.';
        normalized.choices = normalizeStatueChoices(component.choices);
        normalized.correctAnswerIndex = clampInteger(
          component.correctAnswerIndex,
          0,
          Math.max(0, normalized.choices.length - 1),
          0,
        );
      }

      return normalized;
    })
    .filter(Boolean);
};

const clampRoomLocalY = (value) => clampInteger(Math.round(Number(value) || 0), 0, ROOM_VIEWPORT_HEIGHT, Math.round(ROOM_VIEWPORT_HEIGHT * 0.5));

const ensureUniqueComponentId = (component, components) => {
  const usedIds = new Set((components || []).map((entry) => entry?.id).filter(Boolean));
  if (!usedIds.has(component.id)) {
    return component;
  }

  const baseId = String(component.id || 'component').slice(0, 70);
  let suffix = 2;
  let nextId = `${baseId}-${suffix}`.slice(0, 80);

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`.slice(0, 80);
  }

  return {
    ...component,
    id: nextId,
  };
};

const normalizeKeybind = (value, fallback) => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 24)
    : '';
  return normalized || fallback;
};

const normalizeDashMode = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return DASH_MODE_OPTIONS.includes(normalized) ? normalized : DEFAULT_DASH_MODE;
};

const normalizePlayerAbilityFields = (source = {}) => ({
  jumpHeight: clampInteger(source.jumpHeight, 40, 620, DEFAULT_JUMP_HEIGHT),
  jumpSpeed: clampInteger(source.jumpSpeed, 180, 1400, DEFAULT_JUMP_SPEED),
  jumpKeybind: normalizeKeybind(source.jumpKeybind, DEFAULT_JUMP_KEYBIND),
  dashResetsOnJump: Boolean(source.dashResetsOnJump),
  dashMode: normalizeDashMode(source.dashMode),
  dashSpeed: clampInteger(source.dashSpeed, 120, 2200, DEFAULT_DASH_SPEED),
  dashDistance: clampInteger(source.dashDistance, 40, 1200, DEFAULT_DASH_DISTANCE),
  dashKeybind: normalizeKeybind(source.dashKeybind, DEFAULT_DASH_KEYBIND),
  dashCooldownMs: clampInteger(source.dashCooldownMs, 0, 5000, DEFAULT_DASH_COOLDOWN_MS),
  projectileDamage: clampInteger(source.projectileDamage, 1, 20, DEFAULT_PROJECTILE_DAMAGE),
  projectileSize: clampInteger(source.projectileSize, 12, 160, DEFAULT_PROJECTILE_SIZE),
  projectileBurstCount: clampInteger(source.projectileBurstCount, 1, 8, DEFAULT_PROJECTILE_BURST_COUNT),
  projectileCooldownMs: clampInteger(source.projectileCooldownMs, 80, 5000, DEFAULT_PROJECTILE_COOLDOWN_MS),
  projectileKeybind: normalizeKeybind(source.projectileKeybind, DEFAULT_PROJECTILE_KEYBIND),
  projectileSpeed: clampInteger(source.projectileSpeed, 80, 1800, DEFAULT_PROJECTILE_SPEED),
  projectileDistance: clampInteger(source.projectileDistance, 80, 2400, DEFAULT_PROJECTILE_DISTANCE),
});

const createLegacyPortalComponent = (portal, components) => {
  if (!portal || portal.targetRoomId || portal.endsLevel !== true) {
    return null;
  }

  return ensureUniqueComponentId({
    id: 'legacy-portal',
    type: 'portal',
    x: 1135,
    y: 556,
    snapToGrid: true,
    renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
    size: DEFAULT_COMPONENT_SIZE,
    locked: false,
    linkName: '',
    endsLevel: true,
    variant: 'portal3',
  }, components);
};

const localizeLegacyInvisiblePlatforms = (rooms) => {
  const roomByGrid = new Map();
  rooms.forEach((room) => {
    roomByGrid.set(`${room.row}:${room.col}`, room);
  });

  const nextComponentsByRoomId = new Map(rooms.map((room) => [room.id, []]));

  rooms.forEach((room) => {
    (room.components || []).forEach((component) => {
      if (component?.type !== 'invisiblePlatform' || (component.y >= 0 && component.y <= ROOM_VIEWPORT_HEIGHT)) {
        nextComponentsByRoomId.get(room.id).push(component);
        return;
      }

      const targetRow = Math.floor(Number(component.y || 0) / ROOM_VIEWPORT_HEIGHT);
      const targetRoom = roomByGrid.get(`${targetRow}:${room.col}`);
      if (!targetRoom) {
        nextComponentsByRoomId.get(room.id).push({
          ...component,
          y: clampRoomLocalY(component.y),
        });
        return;
      }

      const localizedComponent = {
        ...component,
        y: clampRoomLocalY(Number(component.y || 0) - (targetRow * ROOM_VIEWPORT_HEIGHT)),
      };
      const targetComponents = nextComponentsByRoomId.get(targetRoom.id);
      targetComponents.push(ensureUniqueComponentId(localizedComponent, targetComponents));
    });
  });

  return rooms.map((room) => ({
    ...room,
    components: nextComponentsByRoomId.get(room.id) || [],
  }));
};

export const normalizeRoomChunkData = (value, options = {}) => {
  const fallbackBackground = options.fallbackBackgroundKey || DEFAULT_BACKGROUND_KEY;
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : createDefaultRoomChunkData();
  const settings = normalizeLevelSettings(raw.settings, fallbackBackground);

  const gridRows = clampInteger(raw.grid?.rows, 8, 80, DEFAULT_GRID_ROWS);
  const gridCols = clampInteger(raw.grid?.cols, 8, 80, DEFAULT_GRID_COLS);

  const roomCandidates = Array.isArray(raw.rooms) ? raw.rooms.slice(0, MAX_ROOMS) : [];
  const roomIds = new Set();
  const roomsWithSourceLinks = [];

  for (const candidate of roomCandidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const id = typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim().slice(0, 80)
      : `room-${roomsWithSourceLinks.length + 1}`;

    if (roomIds.has(id)) {
      continue;
    }

    roomIds.add(id);

    roomsWithSourceLinks.push({
      id,
      name: typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name.trim().slice(0, 80)
        : `Room ${roomsWithSourceLinks.length + 1}`,
      row: clampInteger(candidate.row, 0, 79, 0),
      col: clampInteger(candidate.col, 0, 79, 0),
      backgroundKey: typeof candidate.backgroundKey === 'string' && candidate.backgroundKey.trim()
        ? candidate.backgroundKey.trim().slice(0, 40)
        : settings.backgroundKey,
      backgroundColor: normalizeBackgroundColor(candidate.backgroundColor, DEFAULT_ROOM_BACKGROUND_COLOR),
      sourceLinks: candidate.links,
      sourcePortal: candidate.portal,
      sourceComponents: candidate.components,
      sourceBackgroundTiles: candidate.backgroundTiles,
    });
  }

  if (roomsWithSourceLinks.length === 0) {
    roomsWithSourceLinks.push({
      id: 'room-1',
      name: 'Room 1',
      row: 0,
      col: 0,
      backgroundKey: settings.backgroundKey,
      backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
      sourceLinks: [],
      sourcePortal: null,
      sourceComponents: [],
      sourceBackgroundTiles: [],
    });
    roomIds.add('room-1');
  }

  const portalLinkNameCounts = new Map();

  const rooms = roomsWithSourceLinks.map((room) => {
    const sourceComponents = Array.isArray(room.sourceComponents) ? room.sourceComponents : [];
    const normalizedPortal = normalizePortal(room.sourcePortal, roomIds);
    const normalizedComponents = normalizeComponents(
      sourceComponents,
      portalLinkNameCounts,
      settings.sharedGridSnap,
    );
    const hasPortalComponent = normalizedComponents.some((component) => (
      component.type === 'portal' || component.type === 'portal3'
    ));
    const legacyPortalComponent = hasPortalComponent
      ? null
      : createLegacyPortalComponent(normalizedPortal, normalizedComponents);

    return {
      id: room.id,
      name: room.name,
      row: room.row,
      col: room.col,
      backgroundKey: room.backgroundKey,
      backgroundColor: room.backgroundColor,
      links: normalizeLinks(room.sourceLinks, roomIds),
      portal: null,
      components: legacyPortalComponent
        ? [...normalizedComponents, legacyPortalComponent]
        : normalizedComponents,
      backgroundTiles: normalizeBackgroundTiles(room.sourceBackgroundTiles),
    };
  });

  return {
    version: ROOM_CHUNK_SCHEMA_VERSION,
    grid: {
      rows: gridRows,
      cols: gridCols,
    },
    settings,
    rooms: localizeLegacyInvisiblePlatforms(rooms),
  };
};

export const legacyCellBackgroundsToRoomChunk = (cellBackgrounds, gridRows = DEFAULT_GRID_ROWS, gridCols = DEFAULT_GRID_COLS) => {
  const entries = cellBackgrounds && typeof cellBackgrounds === 'object' && !Array.isArray(cellBackgrounds)
    ? Object.entries(cellBackgrounds)
    : [];

  const rooms = entries
    .filter(([key, backgroundKey]) => /^\d+:\d+$/.test(key) && typeof backgroundKey === 'string' && backgroundKey.trim())
    .slice(0, MAX_ROOMS)
    .map(([key, backgroundKey], index) => {
      const [rowPart, colPart] = key.split(':');
      return {
        id: `room-${rowPart}-${colPart}`,
        name: `Room ${index + 1}`,
        row: clampInteger(rowPart, 0, 79, 0),
        col: clampInteger(colPart, 0, 79, 0),
        backgroundKey: backgroundKey.trim().slice(0, 40),
        backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
        links: [],
        portal: null,
        components: [],
        backgroundTiles: [],
      };
    });

  return normalizeRoomChunkData({
    version: ROOM_CHUNK_SCHEMA_VERSION,
    grid: {
      rows: gridRows,
      cols: gridCols,
    },
    rooms,
  });
};

export const roomChunkToLegacyCellBackgrounds = (roomChunkData) => {
  const normalized = normalizeRoomChunkData(roomChunkData);

  return normalized.rooms.reduce((accumulator, room) => {
    accumulator[`${room.row}:${room.col}`] = room.backgroundKey;
    return accumulator;
  }, {});
};

export const getNextRoomPosition = (rooms) => {
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return { row: 0, col: 0 };
  }

  const sorted = [...rooms].sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }
    return a.col - b.col;
  });

  const last = sorted[sorted.length - 1];
  const nextCol = last.col + 1;
  if (nextCol <= 7) {
    return { row: last.row, col: nextCol };
  }

  return { row: last.row + 1, col: 0 };
};
