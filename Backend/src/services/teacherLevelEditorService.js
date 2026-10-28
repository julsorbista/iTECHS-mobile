const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');

const DEFAULT_GRID_ROWS = 18;
const DEFAULT_GRID_COLS = 32;
const ROOM_VIEWPORT_WIDTH = 1296;
const ROOM_VIEWPORT_HEIGHT = 720;
const ROOM_CHUNK_SCHEMA_VERSION = 1;
const VERSION_PAYLOAD_SCHEMA_VERSION = 1;
const EDITOR_GAME_TYPE = 'GAME_ONE';
const VERSION_STATE_DRAFT = 'DRAFT';
const VERSION_STATE_PUBLISHED = 'PUBLISHED';
const MAX_ROOM_COMPONENTS = 200;
const MAX_ROOM_BACKGROUND_TILES = 1200;
const DEFAULT_LEVEL_PLAYER_HEALTH = 3;
const DEFAULT_LEVEL_TIMER_SECONDS = 120;
const DEFAULT_LEVEL_COIN_GOAL = 0;
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
const DEFAULT_STATUE_SIZE = 212;
const DEFAULT_STATUE_TEXTURE_KEY = 'teacher-statue-elem12';
const MAX_ROOM_TILE_SIZE = 1024;
const MAX_ROOM_TILE_Z_INDEX = 9999;
const MIN_ROOM_TILE_ROTATION = 0;
const MAX_ROOM_TILE_ROTATION = 359;
const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const DEFAULT_CHARACTER_RENDER_LAYER = 'back';
const INVISIBLE_PLATFORM_GRID_SIZE = 40;
const INVISIBLE_PLATFORM_DEFAULT_WIDTH = INVISIBLE_PLATFORM_GRID_SIZE * 4;
const INVISIBLE_PLATFORM_DEFAULT_HEIGHT = INVISIBLE_PLATFORM_GRID_SIZE;
const INVISIBLE_PLATFORM_MAX_HEIGHT = 360;
const INVISIBLE_PLATFORM_Y_MIN = -20000;
const INVISIBLE_PLATFORM_Y_MAX = 20000;
const STATUE_TOPIC_MAX_LENGTH = 140;
const PASS_THROUGH_SIDES = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
const GHOST_MOVEMENT_DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
const STATUE_AI_DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const DASH_MODE_OPTIONS = ['AIR_ONLY', 'GROUND_ONLY', 'BOTH'];
const DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER = 1;
const DEFAULT_STATUE_AI_LANGUAGE = 'English';
const SHARED_GRID_SNAP_OPTIONS = new Set([0, 16, 24, 48]);
const TRIGGER_PLATFORM_ACTIONS = new Set(['NONE', 'MOVE', 'GO_THROUGH']);
const COMPONENT_TYPES = new Set([
  'spawn',
  'invisiblePlatform',
  'triggerPlatform',
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
]);
let ensureTablePromise = null;

const ensureTeacherEditorTables = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$transaction([
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`teacher_level_records\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`teacherId\` VARCHAR(191) NOT NULL,
            \`levelNumber\` INTEGER NOT NULL,
            \`gridRows\` INTEGER NOT NULL DEFAULT 18,
            \`gridCols\` INTEGER NOT NULL DEFAULT 32,
            \`cellBackgrounds\` JSON NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,

            UNIQUE INDEX \`teacher_level_records_teacherId_levelNumber_key\`(\`teacherId\`, \`levelNumber\`),
            INDEX \`teacher_level_records_teacherId_updatedAt_idx\`(\`teacherId\`, \`updatedAt\`),
            PRIMARY KEY (\`id\`),
            CONSTRAINT \`teacher_level_records_teacherId_fkey\`
                FOREIGN KEY (\`teacherId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `),
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`teacher_level_workspaces\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`teacherId\` VARCHAR(191) NOT NULL,
            \`gameType\` ENUM('GAME_ONE', 'GAME_TWO', 'GAME_THREE') NOT NULL DEFAULT 'GAME_ONE',
            \`levelNumber\` INTEGER NOT NULL,
            \`title\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

            UNIQUE INDEX \`teacher_level_workspaces_teacherId_gameType_levelNumber_key\`(\`teacherId\`, \`gameType\`, \`levelNumber\`),
            INDEX \`teacher_level_workspaces_teacherId_updatedAt_idx\`(\`teacherId\`, \`updatedAt\`),
            PRIMARY KEY (\`id\`),
            CONSTRAINT \`teacher_level_workspaces_teacherId_fkey\`
                FOREIGN KEY (\`teacherId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `),
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`teacher_level_versions\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`workspaceId\` VARCHAR(191) NOT NULL,
            \`state\` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
            \`versionNumber\` INTEGER NOT NULL,
            \`payload\` JSON NOT NULL,
            \`createdByUserId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

            UNIQUE INDEX \`teacher_level_versions_workspaceId_state_versionNumber_key\`(\`workspaceId\`, \`state\`, \`versionNumber\`),
            INDEX \`teacher_level_versions_workspaceId_state_createdAt_idx\`(\`workspaceId\`, \`state\`, \`createdAt\`),
            INDEX \`teacher_level_versions_createdByUserId_createdAt_idx\`(\`createdByUserId\`, \`createdAt\`),
            PRIMARY KEY (\`id\`),
            CONSTRAINT \`teacher_level_versions_workspaceId_fkey\`
                FOREIGN KEY (\`workspaceId\`) REFERENCES \`teacher_level_workspaces\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`teacher_level_versions_createdByUserId_fkey\`
                FOREIGN KEY (\`createdByUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `),
    ]);
  }

  try {
    await ensureTablePromise;
  } catch (error) {
    ensureTablePromise = null;
    throw error;
  }
};

const clampDimension = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(80, Math.max(8, parsed));
};

const clampRoomCoordinate = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(79, Math.max(0, parsed));
};

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const toFiniteRoomNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const snapInvisiblePlatformValue = (value, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => (
  Math.round(toFiniteRoomNumber(value, 0) / gridSize) * gridSize
);

const floorInvisiblePlatformValue = (value, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => (
  Math.floor(Math.max(0, toFiniteRoomNumber(value, 0)) / gridSize) * gridSize
);

const normalizeInvisiblePlatformDimension = (
  value,
  fallback,
  max,
  gridSize = INVISIBLE_PLATFORM_GRID_SIZE,
) => {
  const rawMax = Math.max(gridSize, Math.round(toFiniteRoomNumber(max, ROOM_VIEWPORT_WIDTH)));
  const resolvedMax = Math.max(gridSize, Math.floor(rawMax / gridSize) * gridSize);
  const fallbackValue = Math.max(gridSize, toFiniteRoomNumber(fallback, gridSize));
  const rawValue = toFiniteRoomNumber(value, fallbackValue);
  const snappedValue = snapInvisiblePlatformValue(rawValue, gridSize);
  return Math.min(resolvedMax, Math.max(gridSize, snappedValue > 0 ? snappedValue : fallbackValue));
};

const normalizeInvisiblePlatformFrame = (component, {
  viewport = { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
  maxWidth = null,
  maxHeight = INVISIBLE_PLATFORM_MAX_HEIGHT,
  allowOutOfBoundsY = false,
  gridSize = INVISIBLE_PLATFORM_GRID_SIZE,
} = {}) => {
  const width = normalizeInvisiblePlatformDimension(
    component?.width,
    INVISIBLE_PLATFORM_DEFAULT_WIDTH,
    maxWidth ?? viewport.width,
    gridSize,
  );
  const height = normalizeInvisiblePlatformDimension(
    component?.height,
    INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
    maxHeight ?? viewport.height,
    gridSize,
  );
  const rawLeft = toFiniteRoomNumber(component?.x, width / 2) - (width / 2);
  const rawTop = toFiniteRoomNumber(component?.y, height / 2) - (height / 2);
  const left = Math.min(
    floorInvisiblePlatformValue(Number(viewport.width) - width, gridSize),
    Math.max(0, snapInvisiblePlatformValue(rawLeft, gridSize)),
  );
  const snappedTop = snapInvisiblePlatformValue(rawTop, gridSize);
  const top = allowOutOfBoundsY
    ? Math.min(INVISIBLE_PLATFORM_Y_MAX, Math.max(INVISIBLE_PLATFORM_Y_MIN, snappedTop))
    : Math.min(
        floorInvisiblePlatformValue(Number(viewport.height) - height, gridSize),
        Math.max(0, snappedTop),
      );

  return {
    x: left + (width / 2),
    y: top + (height / 2),
    width,
    height,
  };
};

const normalizeTriggerPlatformAction = (value, fallback = 'NONE') => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';

  if (TRIGGER_PLATFORM_ACTIONS.has(normalized)) {
    return normalized;
  }

  return fallback;
};

const normalizeTriggerPlatformGoThrough = (value) => ({
  player: Boolean(value?.player),
  entities: Boolean(value?.entities),
});

const normalizeTriggerPlatformCellCoordinate = (value, maxValue) => clampInteger(value, 0, maxValue, 0);

const createTriggerPlatformCellKey = (cell) => `${cell.col}:${cell.row}`;

const normalizeTriggerPlatformCells = (
  cells,
  {
    gridSize = DEFAULT_SHARED_GRID_SNAP,
    viewport = { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
  } = {},
) => {
  const resolvedGridSize = Math.max(1, Math.round(toFiniteRoomNumber(gridSize, DEFAULT_SHARED_GRID_SNAP)));
  const maxCol = Math.max(0, Math.floor((viewport.width - 1) / resolvedGridSize));
  const maxRow = Math.max(0, Math.floor((viewport.height - 1) / resolvedGridSize));
  const normalizedCells = new Map();

  (Array.isArray(cells) ? cells : []).forEach((cell) => {
    if (!isPlainObject(cell)) {
      return;
    }

    const normalizedCell = {
      col: normalizeTriggerPlatformCellCoordinate(cell.col, maxCol),
      row: normalizeTriggerPlatformCellCoordinate(cell.row, maxRow),
    };
    normalizedCells.set(createTriggerPlatformCellKey(normalizedCell), normalizedCell);
  });

  return Array.from(normalizedCells.values()).sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }

    return left.col - right.col;
  });
};

const worldPointToTriggerPlatformCell = (
  point,
  {
    gridSize = DEFAULT_SHARED_GRID_SNAP,
    viewport = { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
  } = {},
) => {
  const resolvedGridSize = Math.max(1, Math.round(toFiniteRoomNumber(gridSize, DEFAULT_SHARED_GRID_SNAP)));
  const maxCol = Math.max(0, Math.floor((viewport.width - 1) / resolvedGridSize));
  const maxRow = Math.max(0, Math.floor((viewport.height - 1) / resolvedGridSize));

  return {
    col: clampInteger(Math.floor(toFiniteRoomNumber(point?.x, 0) / resolvedGridSize), 0, maxCol, 0),
    row: clampInteger(Math.floor(toFiniteRoomNumber(point?.y, 0) / resolvedGridSize), 0, maxRow, 0),
  };
};

const triggerPlatformCellToWorldPoint = (cell, gridSize = DEFAULT_SHARED_GRID_SNAP) => {
  const resolvedGridSize = Math.max(1, Math.round(toFiniteRoomNumber(gridSize, DEFAULT_SHARED_GRID_SNAP)));
  return {
    x: (clampInteger(cell?.col, 0, 9999, 0) * resolvedGridSize) + (resolvedGridSize * 0.5),
    y: (clampInteger(cell?.row, 0, 9999, 0) * resolvedGridSize) + (resolvedGridSize * 0.5),
  };
};

const getTriggerPlatformBounds = (cells, gridSize = DEFAULT_SHARED_GRID_SNAP) => {
  const resolvedGridSize = Math.max(1, Math.round(toFiniteRoomNumber(gridSize, DEFAULT_SHARED_GRID_SNAP)));
  const normalizedCells = normalizeTriggerPlatformCells(cells, { gridSize: resolvedGridSize });
  if (!normalizedCells.length) {
    const fallbackPoint = triggerPlatformCellToWorldPoint({ col: 0, row: 0 }, resolvedGridSize);
    return {
      x: fallbackPoint.x,
      y: fallbackPoint.y,
      width: resolvedGridSize,
      height: resolvedGridSize,
    };
  }

  const minCol = Math.min(...normalizedCells.map((cell) => cell.col));
  const maxCol = Math.max(...normalizedCells.map((cell) => cell.col));
  const minRow = Math.min(...normalizedCells.map((cell) => cell.row));
  const maxRow = Math.max(...normalizedCells.map((cell) => cell.row));

  return {
    x: (minCol * resolvedGridSize) + (((maxCol - minCol + 1) * resolvedGridSize) / 2),
    y: (minRow * resolvedGridSize) + (((maxRow - minRow + 1) * resolvedGridSize) / 2),
    width: (maxCol - minCol + 1) * resolvedGridSize,
    height: (maxRow - minRow + 1) * resolvedGridSize,
  };
};

const normalizeTriggerPlatformDestination = (
  value,
  {
    gridSize = DEFAULT_SHARED_GRID_SNAP,
    viewport = { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
    fallback = null,
  } = {},
) => {
  if (!isPlainObject(value)) {
    return fallback;
  }

  const [normalized] = normalizeTriggerPlatformCells([value], { gridSize, viewport });
  return normalized || fallback;
};

const normalizeTriggerPlatformComponent = (
  component = {},
  {
    gridSize = DEFAULT_SHARED_GRID_SNAP,
    viewport = { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
  } = {},
) => {
  const fallbackCell = worldPointToTriggerPlatformCell({
    x: toFiniteRoomNumber(component.x, viewport.width * 0.5),
    y: toFiniteRoomNumber(component.y, viewport.height * 0.5),
  }, { gridSize, viewport });
  const cells = normalizeTriggerPlatformCells(
    Array.isArray(component.cells) && component.cells.length ? component.cells : [fallbackCell],
    { gridSize, viewport },
  );
  const bounds = getTriggerPlatformBounds(cells, gridSize);

  return {
    ...component,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    cells,
    triggerId: typeof component.triggerId === 'string'
      ? component.triggerId.trim().slice(0, 80)
      : (typeof component.questionId === 'string' ? component.questionId.trim().slice(0, 80) : ''),
    invisible: component.invisible !== false,
    passThroughSides: normalizePassThroughSides(component.passThroughSides),
    untriggeredTileKey: sanitizeTextureKey(component.untriggeredTileKey, ''),
    triggeredTileKey: sanitizeTextureKey(component.triggeredTileKey, ''),
    correctAction: normalizeTriggerPlatformAction(component.correctAction, 'NONE'),
    wrongAction: normalizeTriggerPlatformAction(component.wrongAction, 'NONE'),
    correctMoveTo: normalizeTriggerPlatformDestination(component.correctMoveTo, { gridSize, viewport, fallback: null }),
    wrongMoveTo: normalizeTriggerPlatformDestination(component.wrongMoveTo, { gridSize, viewport, fallback: null }),
    correctGoThrough: normalizeTriggerPlatformGoThrough(component.correctGoThrough),
    wrongGoThrough: normalizeTriggerPlatformGoThrough(component.wrongGoThrough),
  };
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

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const coerceJsonObject = (value) => {
  if (!value) {
    return null;
  }

  if (isPlainObject(value)) {
    return value;
  }

  const raw = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  if (typeof raw !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
};

const coerceInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
};

const toRoomId = (row, col) => `room-${row}-${col}`;

const normalizeRoomLinks = (links, roomIds) => {
  if (!Array.isArray(links)) {
    return [];
  }

  const seenTargets = new Set();

  return links.reduce((accumulator, link) => {
    if (!isPlainObject(link)) {
      return accumulator;
    }

    const targetRoomId = typeof link.targetRoomId === 'string' ? link.targetRoomId.trim() : '';
    if (!targetRoomId || !roomIds.has(targetRoomId) || seenTargets.has(targetRoomId)) {
      return accumulator;
    }

    seenTargets.add(targetRoomId);
    const doorway = typeof link.doorway === 'string' ? link.doorway.trim().toUpperCase() : 'AUTO';

    accumulator.push({
      targetRoomId,
      doorway: ['N', 'E', 'S', 'W', 'AUTO'].includes(doorway) ? doorway : 'AUTO',
    });

    return accumulator;
  }, []);
};

const normalizeRoomPortal = (portal, roomIds) => {
  if (!isPlainObject(portal)) {
    return null;
  }

  const rawTargetRoomId = typeof portal.targetRoomId === 'string' ? portal.targetRoomId.trim() : '';
  const hasValidTarget = Boolean(rawTargetRoomId) && roomIds.has(rawTargetRoomId);

  if (!hasValidTarget && portal.endsLevel !== true) {
    return null;
  }

  return {
    targetRoomId: hasValidTarget ? rawTargetRoomId : null,
    endsLevel: hasValidTarget ? false : true,
  };
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
        rotationDeg: clampInteger(
          ((Math.round(Number(tile.rotationDeg) || 0) % 360) + 360) % 360,
          MIN_ROOM_TILE_ROTATION,
          MAX_ROOM_TILE_ROTATION,
          0,
        ),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
      };
    })
    .filter(Boolean);
};

const normalizeBackgroundColor = (value, fallback = DEFAULT_ROOM_BACKGROUND_COLOR) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized.toLowerCase()
    : fallback;
};

const sanitizeTextureKey = (value, fallback = 'grass') => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim().slice(0, 40);
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

const normalizeLevelSettings = (settings, fallbackBackground = 'tutorialGrove') => {
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
    allowMidairDash: source.allowMidairDash === undefined
      ? DEFAULT_LEVEL_ALLOW_MIDAIR_DASH
      : source.allowMidairDash !== false,
    allowProjectile: source.allowProjectile === undefined
      ? DEFAULT_LEVEL_ALLOW_PROJECTILE
      : source.allowProjectile !== false,
    allowDoubleJump: source.allowDoubleJump === undefined
      ? DEFAULT_LEVEL_ALLOW_DOUBLE_JUMP
      : source.allowDoubleJump !== false,
    sharedGridSnap: normalizeSharedGridSnap(source.sharedGridSnap),
    coinGoal: clampInteger(source.coinGoal, 0, 999, DEFAULT_LEVEL_COIN_GOAL),
    requireBossDefeat: Boolean(source.requireBossDefeat),
  };
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

const normalizeGhostEnemyType = (value, fallback = 'ghost') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'slimegreen' || normalized === 'slime-green') {
    return 'slimegreen';
  }

  if (normalized === 'slimeorange' || normalized === 'slime-orange' || normalized === 'slimepurple' || normalized === 'slime-purple') {
    return 'slimeorange';
  }

  return 'ghost';
};

const normalizeRoomComponents = (components, sharedPortalLinkNameCounts = null, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => {
  if (!Array.isArray(components)) {
    return [];
  }

  const usedIds = new Set();
  const portalLinkNameCounts = sharedPortalLinkNameCounts || new Map();

  return components
    .slice(0, MAX_ROOM_COMPONENTS)
    .reduce((accumulator, component, index) => {
      if (!isPlainObject(component)) {
        return accumulator;
      }

      const rawType = typeof component.type === 'string' ? component.type.trim() : '';
      if (!rawType || !COMPONENT_TYPES.has(rawType)) {
        return accumulator;
      }

      const rawId = typeof component.id === 'string' && component.id.trim()
        ? component.id.trim().slice(0, 80)
        : `cmp-${rawType}-${index + 1}`;
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
        type: rawType,
        x: clampInteger(component.x, 0, ROOM_VIEWPORT_WIDTH, Math.round(ROOM_VIEWPORT_WIDTH * 0.5)),
        y: rawType === 'invisiblePlatform'
          ? clampInteger(component.y, INVISIBLE_PLATFORM_Y_MIN, INVISIBLE_PLATFORM_Y_MAX, 360)
          : clampInteger(component.y, 0, ROOM_VIEWPORT_HEIGHT, Math.round(ROOM_VIEWPORT_HEIGHT * 0.5)),
        snapToGrid: component.snapToGrid !== false,
      };

      if (rawType !== 'spawn') {
        normalized.renderLayer = normalizeCharacterRenderLayer(component.renderLayer);
      }

      if (['spawn', 'coin', 'ghost', 'slimeGreen', 'slimeOrange', 'projectileEnemy', 'villain1', 'boss', 'portal', 'portal3', 'statue'].includes(rawType)) {
        normalized.size = clampInteger(
          component.size,
          MIN_COMPONENT_SIZE,
          MAX_ROOM_TILE_SIZE,
          rawType === 'statue' ? DEFAULT_STATUE_SIZE : DEFAULT_COMPONENT_SIZE,
        );
      }

      if (rawType === 'spawn') {
        normalized.health = clampInteger(component.health, 1, 10, DEFAULT_LEVEL_PLAYER_HEALTH);
        normalized.allowMidairDash = component.allowMidairDash !== false;
        normalized.allowProjectile = component.allowProjectile !== false;
        normalized.allowDoubleJump = component.allowDoubleJump !== false;
        Object.assign(normalized, normalizePlayerAbilityFields(component));
      }

      if (['ghost', 'slimeGreen', 'slimeOrange'].includes(rawType)) {
        const ghostEnemyType = rawType === 'slimeGreen'
          ? 'slimegreen'
          : (rawType === 'slimeOrange' ? 'slimeorange' : normalizeGhostEnemyType(component.enemyType, 'ghost'));
        normalized.patrolDistance = clampInteger(component.patrolDistance, 20, 1200, 220);
        normalized.speed = clampInteger(component.speed, 10, 600, ghostEnemyType === 'slimegreen' ? 72 : 80);
        normalized.enemyType = ghostEnemyType;
        const movementDirection = typeof component.movementDirection === 'string'
          ? component.movementDirection.trim().toUpperCase()
          : 'LEFT';
        normalized.movementDirection = GHOST_MOVEMENT_DIRECTIONS.includes(movementDirection)
          ? movementDirection
          : 'LEFT';
      }

      if (rawType === 'invisiblePlatform') {
        const frame = normalizeInvisiblePlatformFrame(component, {
          viewport: { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
          allowOutOfBoundsY: true,
          gridSize,
        });
        normalized.x = frame.x;
        normalized.y = frame.y;
        normalized.width = frame.width;
        normalized.height = frame.height;
        normalized.passThroughSides = normalizePassThroughSides(component.passThroughSides);
      }

      if (rawType === 'triggerPlatform') {
        Object.assign(normalized, normalizeTriggerPlatformComponent(component, {
          gridSize,
          viewport: { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
        }));
      }

      if (['projectileEnemy', 'villain1', 'boss'].includes(rawType)) {
        const baseEnemyType = rawType === 'villain1'
          ? 'villain1'
          : (rawType === 'boss' ? 'spiritboss' : 'elemental');
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
        normalized.hitPoints = clampInteger(
          component.hitPoints,
          1,
          200,
          enemyDefaults.hitPoints,
        );
      }

      if (rawType === 'portal' || rawType === 'portal3') {
        const rawVariant = typeof component.variant === 'string'
          ? component.variant.trim().toLowerCase()
          : '';
        const rawLinkName = typeof component.linkName === 'string' ? component.linkName.trim().slice(0, 40) : '';
        const rawTargetRoomId = typeof component.targetRoomId === 'string'
          ? component.targetRoomId.trim().slice(0, 80)
          : '';
        const currentCount = rawLinkName ? (portalLinkNameCounts.get(rawLinkName) || 0) : 0;
        if (rawLinkName && currentCount < 2) {
          normalized.linkName = rawLinkName;
          portalLinkNameCounts.set(rawLinkName, currentCount + 1);
        } else {
          normalized.linkName = '';
        }

        normalized.locked = Boolean(component.locked);
        normalized.targetRoomId = rawTargetRoomId;
        normalized.endsLevel = rawTargetRoomId ? false : Boolean(component.endsLevel);
        normalized.variant = rawVariant === 'portal3'
          ? 'portal3'
          : 'portal3';
      }

      if (rawType === 'statue') {
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

      accumulator.push(normalized);
      return accumulator;
    }, []);
};

const normalizeInvisiblePlatformLocalY = (component, value, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => (
  normalizeInvisiblePlatformFrame({
    ...component,
    y: value,
  }, {
    viewport: { width: ROOM_VIEWPORT_WIDTH, height: ROOM_VIEWPORT_HEIGHT },
    gridSize,
  }).y
);

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

const localizeLegacyInvisiblePlatforms = (rooms, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => {
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
          y: normalizeInvisiblePlatformLocalY(component, component.y),
        });
        return;
      }

      const localizedComponent = {
        ...component,
        y: normalizeInvisiblePlatformLocalY(component, Number(component.y || 0) - (targetRow * ROOM_VIEWPORT_HEIGHT), gridSize),
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

const normalizeRoomChunkData = (roomChunkData, fallbackRows, fallbackCols) => {
  const safeValue = isPlainObject(roomChunkData) ? roomChunkData : {};
  const settings = normalizeLevelSettings(safeValue.settings, 'tutorialGrove');
  const gridRows = clampDimension(safeValue.grid?.rows, fallbackRows);
  const gridCols = clampDimension(safeValue.grid?.cols, fallbackCols);
  const rawRooms = Array.isArray(safeValue.rooms) ? safeValue.rooms.slice(0, 500) : [];

  const roomIds = new Set();
  const roomsWithSourceLinks = [];

  rawRooms.forEach((roomCandidate, index) => {
    if (!isPlainObject(roomCandidate)) {
      return;
    }

    const parsedRow = clampRoomCoordinate(roomCandidate.row, 0);
    const parsedCol = clampRoomCoordinate(roomCandidate.col, 0);

    const candidateId = typeof roomCandidate.id === 'string' ? roomCandidate.id.trim().slice(0, 80) : '';
    const roomId = candidateId || `room-${index + 1}`;
    if (roomIds.has(roomId)) {
      return;
    }

    roomIds.add(roomId);
    roomsWithSourceLinks.push({
      id: roomId,
      name: typeof roomCandidate.name === 'string' && roomCandidate.name.trim()
        ? roomCandidate.name.trim().slice(0, 80)
        : `Room ${roomsWithSourceLinks.length + 1}`,
      row: parsedRow,
      col: parsedCol,
      backgroundKey: typeof roomCandidate.backgroundKey === 'string' && roomCandidate.backgroundKey.trim()
        ? roomCandidate.backgroundKey.trim().slice(0, 40)
        : settings.backgroundKey,
      backgroundColor: normalizeBackgroundColor(roomCandidate.backgroundColor, DEFAULT_ROOM_BACKGROUND_COLOR),
      sourceLinks: roomCandidate.links,
      sourcePortal: roomCandidate.portal,
      sourceComponents: roomCandidate.components,
      sourceBackgroundTiles: roomCandidate.backgroundTiles,
    });
  });

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
  const activeGridSize = settings.sharedGridSnap > 0 ? settings.sharedGridSnap : DEFAULT_SHARED_GRID_SNAP;

  const rooms = roomsWithSourceLinks.map((room) => {
    const sourceComponents = Array.isArray(room.sourceComponents) ? room.sourceComponents : [];
    const componentsInput = sourceComponents;
    const normalizedPortal = normalizeRoomPortal(room.sourcePortal, roomIds);
    const normalizedComponents = normalizeRoomComponents(componentsInput, portalLinkNameCounts, activeGridSize);
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
      links: normalizeRoomLinks(room.sourceLinks, roomIds),
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
    rooms: localizeLegacyInvisiblePlatforms(rooms, activeGridSize),
  };
};

const isLegacyCellBackgroundMap = (value) => {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.keys(value).every((key) => /^\d+:\d+$/.test(key));
};

const legacyCellBackgroundsToRoomChunkData = (cellBackgrounds, gridRows, gridCols) => {
  const entries = isPlainObject(cellBackgrounds) ? Object.entries(cellBackgrounds) : [];

  const rooms = entries
    .filter(([key, backgroundValue]) => /^\d+:\d+$/.test(key) && typeof backgroundValue === 'string' && backgroundValue.trim())
    .slice(0, 500)
    .map(([key, backgroundValue], index) => {
      const [rowPart, colPart] = key.split(':');
      return {
        id: toRoomId(rowPart, colPart),
        name: `Room ${index + 1}`,
        row: Number(rowPart),
        col: Number(colPart),
        backgroundKey: backgroundValue.trim().slice(0, 40),
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
  }, gridRows, gridCols);
};

const roomChunkToLegacyCellBackgrounds = (roomChunkData) => {
  const normalized = normalizeRoomChunkData(roomChunkData, DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS);

  return normalized.rooms.reduce((accumulator, room) => {
    accumulator[`${room.row}:${room.col}`] = room.backgroundKey;
    return accumulator;
  }, {});
};

const resolveRoomChunkData = (record, fallbackLevelNumber) => {
  const gridRows = clampDimension(record?.gridRows, DEFAULT_GRID_ROWS);
  const gridCols = clampDimension(record?.gridCols, DEFAULT_GRID_COLS);
  const storedPayload = record?.cellBackgrounds;

  if (isPlainObject(storedPayload) && Number(storedPayload.version) >= ROOM_CHUNK_SCHEMA_VERSION && Array.isArray(storedPayload.rooms)) {
    return normalizeRoomChunkData(storedPayload, gridRows, gridCols);
  }

  if (isLegacyCellBackgroundMap(storedPayload)) {
    return legacyCellBackgroundsToRoomChunkData(storedPayload, gridRows, gridCols);
  }

  return normalizeRoomChunkData({
    version: ROOM_CHUNK_SCHEMA_VERSION,
    grid: {
      rows: gridRows,
      cols: gridCols,
    },
    rooms: [
      {
        id: `room-${fallbackLevelNumber}`,
        name: `Room ${fallbackLevelNumber}`,
        row: 0,
        col: 0,
        backgroundKey: 'tutorialGrove',
        backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
        links: [],
        portal: null,
        components: [],
        backgroundTiles: [],
      },
    ],
  }, gridRows, gridCols);
};

const resolveRoomChunkDataFromVersionPayload = (payload, fallbackLevelNumber) => {
  const parsedPayload = coerceJsonObject(payload);

  const candidateRoomChunk = isPlainObject(parsedPayload?.roomChunkData)
    ? parsedPayload.roomChunkData
    : parsedPayload;

  const payloadRows = clampDimension(
    candidateRoomChunk?.grid?.rows ?? parsedPayload?.grid?.rows,
    DEFAULT_GRID_ROWS,
  );
  const payloadCols = clampDimension(
    candidateRoomChunk?.grid?.cols ?? parsedPayload?.grid?.cols,
    DEFAULT_GRID_COLS,
  );

  if (isPlainObject(candidateRoomChunk) && Array.isArray(candidateRoomChunk.rooms)) {
    return normalizeRoomChunkData(candidateRoomChunk, payloadRows, payloadCols);
  }

  return resolveRoomChunkData(null, fallbackLevelNumber);
};

const normalizeCellBackgrounds = (cellBackgrounds, gridRows, gridCols) => {
  if (!cellBackgrounds || typeof cellBackgrounds !== 'object' || Array.isArray(cellBackgrounds)) {
    return {};
  }

  return Object.entries(cellBackgrounds).reduce((accumulator, [key, value]) => {
    if (typeof value !== 'string') {
      return accumulator;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return accumulator;
    }

    const [rowPart, colPart] = key.split(':');
    const row = Number(rowPart);
    const col = Number(colPart);

    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return accumulator;
    }

    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) {
      return accumulator;
    }

    accumulator[`${row}:${col}`] = trimmedValue.slice(0, 40);
    return accumulator;
  }, {});
};

const toStoredVersionPayload = (roomChunkData) => ({
  schemaVersion: VERSION_PAYLOAD_SCHEMA_VERSION,
  grid: {
    rows: roomChunkData.grid.rows,
    cols: roomChunkData.grid.cols,
  },
  roomChunkData,
});

const buildCanvasPayload = ({
  levelNumber,
  legacyRecord = null,
  workspace = null,
  draftVersion = null,
  publishedVersion = null,
}) => {
  const activeVersion = draftVersion || publishedVersion;

  const roomChunkData = activeVersion
    ? resolveRoomChunkDataFromVersionPayload(activeVersion.payload, levelNumber)
    : resolveRoomChunkData(legacyRecord, levelNumber);

  const draftVersionNumber = coerceInteger(draftVersion?.versionNumber, 0) || null;
  const publishedVersionNumber = coerceInteger(publishedVersion?.versionNumber, 0) || null;
  const updatedAt = draftVersion?.createdAt
    || publishedVersion?.createdAt
    || legacyRecord?.updatedAt
    || workspace?.updatedAt
    || null;

  return {
    id: workspace?.id || legacyRecord?.id || null,
    levelNumber,
    gridRows: roomChunkData.grid.rows,
    gridCols: roomChunkData.grid.cols,
    roomChunkData,
    cellBackgrounds: roomChunkToLegacyCellBackgrounds(roomChunkData),
    updatedAt,
    versionMeta: {
      workspaceId: workspace?.id || null,
      draftVersionId: draftVersion?.id || null,
      draftVersionNumber,
      publishedVersionId: publishedVersion?.id || null,
      publishedVersionNumber,
    },
  };
};

const getLegacyTeacherLevelRecord = (teacherId, levelNumber) => prisma.teacherLevelRecord.findUnique({
  where: {
    teacherId_levelNumber: {
      teacherId,
      levelNumber,
    },
  },
});

const getTeacherWorkspace = async (teacherId, levelNumber) => {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT \`id\`, \`teacherId\`, \`gameType\`, \`levelNumber\`, \`title\`, \`createdAt\`, \`updatedAt\`
      FROM \`teacher_level_workspaces\`
      WHERE \`teacherId\` = ? AND \`gameType\` = ? AND \`levelNumber\` = ?
      LIMIT 1;
    `,
    teacherId,
    EDITOR_GAME_TYPE,
    levelNumber,
  );

  return rows[0] || null;
};

const getLatestWorkspaceVersion = async (workspaceId, state) => {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT \`id\`, \`workspaceId\`, \`state\`, \`versionNumber\`, \`payload\`, \`createdByUserId\`, \`createdAt\`
      FROM \`teacher_level_versions\`
      WHERE \`workspaceId\` = ? AND \`state\` = ?
      ORDER BY \`versionNumber\` DESC, \`createdAt\` DESC
      LIMIT 1;
    `,
    workspaceId,
    state,
  );

  return rows[0] || null;
};

const createTeacherWorkspace = async (teacherId, levelNumber) => {
  const workspaceId = randomUUID();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO \`teacher_level_workspaces\` (
        \`id\`,
        \`teacherId\`,
        \`gameType\`,
        \`levelNumber\`,
        \`title\`,
        \`createdAt\`,
        \`updatedAt\`
      ) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3));
    `,
    workspaceId,
    teacherId,
    EDITOR_GAME_TYPE,
    levelNumber,
    `Level ${levelNumber}`,
  );

  return getTeacherWorkspace(teacherId, levelNumber);
};

const getOrCreateTeacherWorkspace = async (teacherId, levelNumber) => {
  const existingWorkspace = await getTeacherWorkspace(teacherId, levelNumber);
  if (existingWorkspace) {
    return existingWorkspace;
  }

  try {
    const createdWorkspace = await createTeacherWorkspace(teacherId, levelNumber);
    if (createdWorkspace) {
      return createdWorkspace;
    }
  } catch (error) {
    // Handle race conditions from concurrent create requests by falling back to a read.
  }

  return getTeacherWorkspace(teacherId, levelNumber);
};

const createDraftVersion = async ({ workspaceId, teacherId, roomChunkData }) => {
  const nextVersionRows = await prisma.$queryRawUnsafe(
    `
      SELECT COALESCE(MAX(\`versionNumber\`), 0) AS \`maxVersion\`
      FROM \`teacher_level_versions\`
      WHERE \`workspaceId\` = ? AND \`state\` = ?;
    `,
    workspaceId,
    VERSION_STATE_DRAFT,
  );

  const nextVersionNumber = coerceInteger(nextVersionRows?.[0]?.maxVersion, 0) + 1;
  const draftVersionId = randomUUID();
  const payload = toStoredVersionPayload(roomChunkData);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO \`teacher_level_versions\` (
        \`id\`,
        \`workspaceId\`,
        \`state\`,
        \`versionNumber\`,
        \`payload\`,
        \`createdByUserId\`,
        \`createdAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(3));
    `,
    draftVersionId,
    workspaceId,
    VERSION_STATE_DRAFT,
    nextVersionNumber,
    JSON.stringify(payload),
    teacherId,
  );

  await prisma.$executeRawUnsafe(
    `UPDATE \`teacher_level_workspaces\` SET \`updatedAt\` = NOW(3) WHERE \`id\` = ?;`,
    workspaceId,
  );

  return {
    id: draftVersionId,
    workspaceId,
    state: VERSION_STATE_DRAFT,
    versionNumber: nextVersionNumber,
    payload,
    createdByUserId: teacherId,
    createdAt: new Date(),
  };
};

const upsertLegacyTeacherLevelRecord = async (teacherId, levelNumber, roomChunkData) => prisma.teacherLevelRecord.upsert({
  where: {
    teacherId_levelNumber: {
      teacherId,
      levelNumber,
    },
  },
  create: {
    teacherId,
    levelNumber,
    gridRows: roomChunkData.grid.rows,
    gridCols: roomChunkData.grid.cols,
    cellBackgrounds: roomChunkData,
  },
  update: {
    gridRows: roomChunkData.grid.rows,
    gridCols: roomChunkData.grid.cols,
    cellBackgrounds: roomChunkData,
  },
});

const getTeacherLevelCanvas = async (teacherId, levelNumber) => {
  const parsedLevelNumber = Number(levelNumber);

  await ensureTeacherEditorTables();

  const workspace = await getTeacherWorkspace(teacherId, parsedLevelNumber);
  const [draftVersion, publishedVersion, legacyRecord] = await Promise.all([
    workspace ? getLatestWorkspaceVersion(workspace.id, VERSION_STATE_DRAFT) : Promise.resolve(null),
    workspace ? getLatestWorkspaceVersion(workspace.id, VERSION_STATE_PUBLISHED) : Promise.resolve(null),
    getLegacyTeacherLevelRecord(teacherId, parsedLevelNumber),
  ]);

  return buildCanvasPayload({
    levelNumber: parsedLevelNumber,
    legacyRecord,
    workspace,
    draftVersion,
    publishedVersion,
  });
};

const saveTeacherLevelCanvas = async (teacherId, levelNumber, payload = {}) => {
  const parsedLevelNumber = Number(levelNumber);
  const requestedGridRows = clampDimension(payload.gridRows, DEFAULT_GRID_ROWS);
  const requestedGridCols = clampDimension(payload.gridCols, DEFAULT_GRID_COLS);

  const baseRoomChunkData = isPlainObject(payload.roomChunkData)
    ? normalizeRoomChunkData(payload.roomChunkData, requestedGridRows, requestedGridCols)
    : legacyCellBackgroundsToRoomChunkData(
        normalizeCellBackgrounds(payload.cellBackgrounds, requestedGridRows, requestedGridCols),
        requestedGridRows,
        requestedGridCols,
      );

  const normalizedRoomChunkData = normalizeRoomChunkData({
    ...baseRoomChunkData,
    grid: {
      rows: requestedGridRows,
      cols: requestedGridCols,
    },
  }, requestedGridRows, requestedGridCols);

  await ensureTeacherEditorTables();

  const workspace = await getOrCreateTeacherWorkspace(teacherId, parsedLevelNumber);
  if (!workspace) {
    throw new Error('Unable to create teacher level workspace');
  }

  const [draftVersion, publishedVersion] = await Promise.all([
    createDraftVersion({
      workspaceId: workspace.id,
      teacherId,
      roomChunkData: normalizedRoomChunkData,
    }),
    getLatestWorkspaceVersion(workspace.id, VERSION_STATE_PUBLISHED),
    upsertLegacyTeacherLevelRecord(teacherId, parsedLevelNumber, normalizedRoomChunkData),
  ]);

  return buildCanvasPayload({
    levelNumber: parsedLevelNumber,
    legacyRecord: null,
    workspace,
    draftVersion,
    publishedVersion,
  });
};

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isGenericStatuePrompt = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'what is the correct answer?'
    || normalized === 'solve the statue riddle.';
};

const buildPlayableLevelDataFromRoomChunk = ({ teacherId, levelNumber, roomChunkData }) => {
  const normalizedChunk = normalizeRoomChunkData(
    roomChunkData,
    clampDimension(roomChunkData?.grid?.rows, DEFAULT_GRID_ROWS),
    clampDimension(roomChunkData?.grid?.cols, DEFAULT_GRID_COLS),
  );

  const orderedRooms = [...normalizedChunk.rooms].sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }

    return left.col - right.col;
  });

  const viewport = {
    width: ROOM_VIEWPORT_WIDTH,
    height: ROOM_VIEWPORT_HEIGHT,
  };

  const worldObjects = {
    spawn: null,
    platforms: [],
    invisiblePlatforms: [],
    triggerPlatforms: [],
    unlockPlatforms: [],
    barriers: [],
    coins: [],
    ghosts: [],
    projectileEnemies: [],
    villain: [],
    portal: [],
    backgroundTiles: [],
  };

  const questions = [];
  const usedQuestionIds = new Set();
  const questionIdByTriggerId = new Map();

  const resolveUniqueQuestionId = (candidateId, fallbackBase) => {
    const baseCandidate = typeof candidateId === 'string' ? candidateId.trim().slice(0, 80) : '';
    const normalizedFallback = typeof fallbackBase === 'string' && fallbackBase.trim()
      ? fallbackBase.trim().slice(0, 80)
      : 'statue-question';
    const base = baseCandidate || normalizedFallback;

    let nextId = base;
    let suffixIndex = 2;
    while (usedQuestionIds.has(nextId)) {
      const suffix = `-${suffixIndex}`;
      nextId = `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
      suffixIndex += 1;
    }

    usedQuestionIds.add(nextId);
    return nextId;
  };

  orderedRooms.forEach((room) => {
    const offsetX = toFiniteNumber(room.col, 0) * viewport.width;
    const offsetY = toFiniteNumber(room.row, 0) * viewport.height;
    const roomComponents = Array.isArray(room.components) ? room.components : [];
    const roomBackgroundTiles = Array.isArray(room.backgroundTiles) ? room.backgroundTiles : [];

    roomBackgroundTiles.forEach((tile, tileIndex) => {
      const tileKey = typeof tile.tileKey === 'string' ? tile.tileKey.trim() : '';
      if (!tileKey) {
        return;
      }

      const tileId = typeof tile.id === 'string' && tile.id.trim()
        ? tile.id.trim().slice(0, 120)
        : `tile-${tileIndex + 1}`;

      worldObjects.backgroundTiles.push({
        id: `${room.id}-${tileId}`.slice(0, 120),
        tileKey,
        x: toFiniteNumber(tile.x, 640) + offsetX,
        y: toFiniteNumber(tile.y, 360) + offsetY,
        renderLayer: normalizeCharacterRenderLayer(tile.renderLayer),
        size: clampInteger(tile.size, 16, MAX_ROOM_TILE_SIZE, DEFAULT_ROOM_TILE_SIZE),
        zIndex: clampInteger(tile.zIndex, 0, MAX_ROOM_TILE_Z_INDEX, tileIndex),
        rotationDeg: clampInteger(
          ((Math.round(Number(tile.rotationDeg) || 0) % 360) + 360) % 360,
          MIN_ROOM_TILE_ROTATION,
          MAX_ROOM_TILE_ROTATION,
          0,
        ),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
      });
    });

    roomComponents.forEach((component, index) => {
      if (component.type !== 'statue') {
        return;
      }

      const componentId = `${room.id}-${component.id || `statue-${index + 1}`}`;
      const fallbackQuestionId = `statue-${componentId}`;
      const questionId = resolveUniqueQuestionId(component.triggerId || component.questionId, fallbackQuestionId);
      const questionTopic = typeof component.questionTopic === 'string'
        ? component.questionTopic.trim().slice(0, 140)
        : '';
      const aiDifficultyRaw = typeof component.aiDifficulty === 'string'
        ? component.aiDifficulty.trim().toLowerCase()
        : '';
      const aiDifficulty = STATUE_AI_DIFFICULTY_OPTIONS.includes(aiDifficultyRaw)
        ? aiDifficultyRaw
        : 'medium';
      const aiLanguage = typeof component.aiLanguage === 'string' && component.aiLanguage.trim()
        ? component.aiLanguage.trim().slice(0, 40)
        : DEFAULT_STATUE_AI_LANGUAGE;
      const aiGradeLevel = typeof component.aiGradeLevel === 'string'
        ? component.aiGradeLevel.trim().slice(0, 40)
        : '';
      const aiInstructions = typeof component.aiInstructions === 'string'
        ? component.aiInstructions.trim().slice(0, 500)
        : '';
      const aiChoicesCount = clampInteger(component.aiChoicesCount, 2, 6, 4);
      const damageOnWrongAnswer = clampInteger(
        component.damageOnWrongAnswer,
        0,
        10,
        DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER,
      );
      const teacherChoices = Array.isArray(component.choices)
        ? component.choices
          .map((choice) => (typeof choice === 'string' ? choice.trim().slice(0, 120) : ''))
          .filter(Boolean)
        : [];
      const fallbackChoices = teacherChoices.length >= 2
        ? teacherChoices
        : Array.from({ length: aiChoicesCount }, (_, choiceIndex) => `Option ${choiceIndex + 1}`);
      const rawFallbackPrompt = typeof component.prompt === 'string' && component.prompt.trim()
        ? component.prompt.trim().slice(0, 240)
        : 'Solve the statue riddle.';
      const fallbackPrompt = questionTopic && isGenericStatuePrompt(rawFallbackPrompt)
        ? `Question about ${questionTopic}`.slice(0, 240)
        : rawFallbackPrompt;
      const fallbackAnswerIndex = clampInteger(
        component.correctAnswerIndex,
        0,
        Math.max(0, fallbackChoices.length - 1),
        0,
      );

      questions.push({
        id: questionId,
        topic: questionTopic || null,
        prompt: fallbackPrompt,
        choices: fallbackChoices,
        answerIndex: fallbackAnswerIndex,
        hints: [
          questionTopic
            ? `Focus on the main idea of ${questionTopic}.`
            : 'Read the question carefully and remove choices that do not fit.',
          'Compare every option with the exact wording of the question before answering.',
        ],
        aiChoicesCount,
        aiDifficulty,
        aiLanguage,
        aiGradeLevel,
        aiInstructions,
        damageOnWrongAnswer,
      });

      worldObjects.villain.push({
        id: componentId,
        x: toFiniteNumber(component.x, 640) + offsetX,
        y: toFiniteNumber(component.y, 520) + offsetY,
        renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
        size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_STATUE_SIZE),
        questionId,
        questionTopic,
        aiChoicesCount,
        aiDifficulty,
        aiLanguage,
        aiGradeLevel,
        aiInstructions,
        damageOnWrongAnswer,
        textureKey: typeof component.textureKey === 'string' && component.textureKey.trim()
          ? component.textureKey.trim()
          : DEFAULT_STATUE_TEXTURE_KEY,
        appearance: 'STATUE',
        interactionLabel: 'statue',
      });

      if (typeof component.triggerId === 'string' && component.triggerId.trim()) {
        questionIdByTriggerId.set(component.triggerId.trim(), questionId);
      }
    });
  });

  orderedRooms.forEach((room) => {
    const offsetX = toFiniteNumber(room.col, 0) * viewport.width;
    const offsetY = toFiniteNumber(room.row, 0) * viewport.height;
    const roomComponents = Array.isArray(room.components) ? room.components : [];

    roomComponents.forEach((component, index) => {
      if (component.type === 'statue') {
        return;
      }

      const componentId = `${room.id}-${component.id || `component-${index + 1}`}`;

      if (component.type === 'spawn') {
        if (!worldObjects.spawn) {
          worldObjects.spawn = {
            x: toFiniteNumber(component.x, 160) + offsetX,
            y: toFiniteNumber(component.y, 560) + offsetY,
            size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_COMPONENT_SIZE),
            health: clampInteger(component.health, 1, 10, normalizedChunk.settings?.playerHealth ?? DEFAULT_LEVEL_PLAYER_HEALTH),
            allowMidairDash: component.allowMidairDash !== false,
            allowProjectile: component.allowProjectile !== false,
            allowDoubleJump: component.allowDoubleJump !== false,
            ...normalizePlayerAbilityFields(component),
          };
        }
        return;
      }

      if (component.type === 'invisiblePlatform') {
        const frame = normalizeInvisiblePlatformFrame(component, {
          viewport,
          gridSize: normalizedChunk.settings?.sharedGridSnap > 0
            ? normalizedChunk.settings.sharedGridSnap
            : DEFAULT_SHARED_GRID_SNAP,
        });

        worldObjects.invisiblePlatforms.push({
          id: componentId,
          x: frame.x + offsetX,
          y: frame.y + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          width: frame.width,
          height: frame.height,
          bodyHeight: frame.height,
          textureKey: component.textureKey || 'grass',
          invisible: true,
          passThroughSides: Array.isArray(component.passThroughSides) ? component.passThroughSides : [],
        });
        return;
      }

      if (component.type === 'triggerPlatform') {
        const gridSize = normalizedChunk.settings?.sharedGridSnap > 0
          ? normalizedChunk.settings.sharedGridSnap
          : DEFAULT_SHARED_GRID_SNAP;
        const normalizedTriggerPlatform = normalizeTriggerPlatformComponent(component, {
          gridSize,
          viewport,
        });
        const linkedQuestionId = questionIdByTriggerId.get(normalizedTriggerPlatform.triggerId)
          || normalizedTriggerPlatform.triggerId;

        worldObjects.triggerPlatforms.push({
          id: componentId,
          x: toFiniteNumber(normalizedTriggerPlatform.x, 640) + offsetX,
          y: toFiniteNumber(normalizedTriggerPlatform.y, 520) + offsetY,
          width: toFiniteNumber(normalizedTriggerPlatform.width, gridSize),
          height: toFiniteNumber(normalizedTriggerPlatform.height, gridSize),
          cellSize: gridSize,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          invisible: normalizedTriggerPlatform.invisible !== false,
          passThroughSides: Array.isArray(normalizedTriggerPlatform.passThroughSides)
            ? normalizedTriggerPlatform.passThroughSides
            : [],
          questionId: linkedQuestionId,
          triggerId: normalizedTriggerPlatform.triggerId,
          untriggeredTileKey: normalizedTriggerPlatform.untriggeredTileKey || '',
          triggeredTileKey: normalizedTriggerPlatform.triggeredTileKey || '',
          correctAction: normalizedTriggerPlatform.correctAction || 'NONE',
          wrongAction: normalizedTriggerPlatform.wrongAction || 'NONE',
          correctGoThrough: normalizedTriggerPlatform.correctGoThrough || { player: false, entities: false },
          wrongGoThrough: normalizedTriggerPlatform.wrongGoThrough || { player: false, entities: false },
          correctMoveTo: normalizedTriggerPlatform.correctMoveTo
            ? (() => {
                const point = triggerPlatformCellToWorldPoint(normalizedTriggerPlatform.correctMoveTo, gridSize);
                return { x: point.x + offsetX, y: point.y + offsetY };
              })()
            : null,
          wrongMoveTo: normalizedTriggerPlatform.wrongMoveTo
            ? (() => {
                const point = triggerPlatformCellToWorldPoint(normalizedTriggerPlatform.wrongMoveTo, gridSize);
                return { x: point.x + offsetX, y: point.y + offsetY };
              })()
            : null,
          cells: (normalizedTriggerPlatform.cells || []).map((cell) => {
            const point = triggerPlatformCellToWorldPoint(cell, gridSize);
            return {
              ...cell,
              x: point.x + offsetX,
              y: point.y + offsetY,
            };
          }),
        });
        return;
      }

      if (component.type === 'coin') {
        worldObjects.coins.push({
          id: componentId,
          x: toFiniteNumber(component.x, 640) + offsetX,
          y: toFiniteNumber(component.y, 420) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_COMPONENT_SIZE),
        });
        return;
      }

      if (['ghost', 'slimeGreen', 'slimeOrange'].includes(component.type)) {
        const enemyType = component.type === 'slimeGreen'
          ? 'slimegreen'
          : (component.type === 'slimeOrange' ? 'slimeorange' : normalizeGhostEnemyType(component.enemyType, 'ghost'));
        const defaultSpeed = enemyType === 'slimegreen' ? 72 : 80;
        const movementDirection = typeof component.movementDirection === 'string'
          ? component.movementDirection.trim().toUpperCase()
          : 'LEFT';

        worldObjects.ghosts.push({
          id: componentId,
          x: toFiniteNumber(component.x, 640) + offsetX,
          y: toFiniteNumber(component.y, 592) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_COMPONENT_SIZE),
          patrolDistance: toFiniteNumber(component.patrolDistance, 220),
          speed: toFiniteNumber(component.speed, defaultSpeed),
          enemyType,
          movementDirection: GHOST_MOVEMENT_DIRECTIONS.includes(movementDirection)
            ? movementDirection
            : 'LEFT',
        });
        return;
      }

      if (['projectileEnemy', 'villain1', 'boss'].includes(component.type)) {
        const enemyType = component.type === 'villain1'
          ? 'villain1'
          : (component.type === 'boss' ? 'spiritboss' : (component.enemyType || 'elemental'));
        const fallbackHitPoints = enemyType === 'spiritboss'
          ? 12
          : (enemyType === 'boss' ? 8 : (enemyType === 'villain1' ? 2 : 1));

        worldObjects.projectileEnemies.push({
          id: componentId,
          enemyType,
          x: toFiniteNumber(component.x, 920) + offsetX,
          y: toFiniteNumber(component.y, 556) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_COMPONENT_SIZE),
          fireDirection: component.fireDirection === 'RIGHT' ? 'RIGHT' : 'LEFT',
          fireIntervalMs: toFiniteNumber(component.fireIntervalMs, 1800),
          projectileSpeed: toFiniteNumber(component.projectileSpeed, 285),
          projectileLifetimeMs: toFiniteNumber(component.projectileLifetimeMs, 2550),
          initialDelayMs: toFiniteNumber(component.initialDelayMs, 900),
          hitPoints: toFiniteNumber(component.hitPoints, fallbackHitPoints),
        });
        return;
      }

      if (component.type === 'portal' || component.type === 'portal3') {
        worldObjects.portal.push({
          id: componentId,
          x: toFiniteNumber(component.x, 1135) + offsetX,
          y: toFiniteNumber(component.y, 556) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampInteger(component.size, MIN_COMPONENT_SIZE, MAX_ROOM_TILE_SIZE, DEFAULT_COMPONENT_SIZE),
          locked: Boolean(component.locked),
          targetRoomId: typeof component.targetRoomId === 'string' && component.targetRoomId.trim()
            ? component.targetRoomId.trim().slice(0, 80)
            : '',
          endsLevel: Boolean(component.endsLevel),
          linkName: typeof component.linkName === 'string' ? component.linkName.trim().slice(0, 40) : '',
          variant: 'portal3',
        });
      }
    });

  });

  if (!worldObjects.spawn) {
    const firstRoom = orderedRooms[0] || null;
    const firstOffsetX = toFiniteNumber(firstRoom?.col, 0) * viewport.width;
    const firstOffsetY = toFiniteNumber(firstRoom?.row, 0) * viewport.height;

    worldObjects.spawn = {
      x: firstOffsetX + 160,
      y: firstOffsetY + 560,
      size: DEFAULT_COMPONENT_SIZE,
      health: clampInteger(normalizedChunk.settings?.playerHealth, 1, 10, DEFAULT_LEVEL_PLAYER_HEALTH),
      allowMidairDash: normalizedChunk.settings?.allowMidairDash !== false,
      allowProjectile: normalizedChunk.settings?.allowProjectile !== false,
      allowDoubleJump: normalizedChunk.settings?.allowDoubleJump !== false,
      ...normalizePlayerAbilityFields({}),
    };
  }

  const resolvedPlayerHealth = clampInteger(
    worldObjects.spawn?.health,
    1,
    10,
    clampInteger(normalizedChunk.settings?.playerHealth, 1, 10, DEFAULT_LEVEL_PLAYER_HEALTH),
  );
  const resolvedAllowMidairDash = worldObjects.spawn?.allowMidairDash !== false;
  const resolvedAllowProjectile = worldObjects.spawn?.allowProjectile !== false;
  const resolvedAllowDoubleJump = worldObjects.spawn?.allowDoubleJump !== false;

  worldObjects.spawn.health = resolvedPlayerHealth;
  worldObjects.spawn.allowMidairDash = resolvedAllowMidairDash;
  worldObjects.spawn.allowProjectile = resolvedAllowProjectile;
  worldObjects.spawn.allowDoubleJump = resolvedAllowDoubleJump;
  Object.assign(worldObjects.spawn, normalizePlayerAbilityFields(worldObjects.spawn));

  const cells = orderedRooms.length
    ? orderedRooms.map((room) => ({
        id: room.id,
        col: toFiniteNumber(room.col, 0),
        row: toFiniteNumber(room.row, 0),
        backgroundKey: typeof room.backgroundKey === 'string' && room.backgroundKey.trim()
          ? room.backgroundKey.trim().slice(0, 40)
          : 'tutorialGrove',
        backgroundColor: normalizeBackgroundColor(room.backgroundColor, DEFAULT_ROOM_BACKGROUND_COLOR),
        objective: `Level ${levelNumber} - Explore ${room.name || room.id}`,
        postUnlockObjective: '',
      }))
    : [
        {
          id: 'room-1',
          col: 0,
          row: 0,
          backgroundKey: 'tutorialGrove',
          backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
          objective: `Level ${levelNumber} - Explore this room.`,
          postUnlockObjective: '',
        },
      ];

  return {
    version: 2,
    id: `teacher-${teacherId}-level-${String(levelNumber).padStart(2, '0')}`,
    gameType: EDITOR_GAME_TYPE,
    levelNumber,
    title: `Level ${levelNumber}`,
    subtitle: 'Teacher Workspace',
    viewport,
    settings: {
      playerHealth: resolvedPlayerHealth,
      timerEnabled: Boolean(normalizedChunk.settings?.timerEnabled),
      timerSeconds: clampInteger(normalizedChunk.settings?.timerSeconds, 10, 3600, DEFAULT_LEVEL_TIMER_SECONDS),
      allowMidairDash: resolvedAllowMidairDash,
      allowProjectile: resolvedAllowProjectile,
      allowDoubleJump: resolvedAllowDoubleJump,
      coinGoal: clampInteger(normalizedChunk.settings?.coinGoal, 0, 999, DEFAULT_LEVEL_COIN_GOAL),
      requireBossDefeat: Boolean(normalizedChunk.settings?.requireBossDefeat),
    },
    questions,
    grid: {
      cells,
    },
    worldObjects,
  };
};

const getLatestSavedRoomChunkData = async (teacherId, levelNumber) => {
  const parsedLevelNumber = coerceInteger(levelNumber, 0);
  if (!teacherId || parsedLevelNumber <= 0) {
    return null;
  }

  await ensureTeacherEditorTables();

  const workspace = await getTeacherWorkspace(teacherId, parsedLevelNumber);
  if (workspace?.id) {
    const [draftVersion, publishedVersion] = await Promise.all([
      getLatestWorkspaceVersion(workspace.id, VERSION_STATE_DRAFT),
      getLatestWorkspaceVersion(workspace.id, VERSION_STATE_PUBLISHED),
    ]);

    const preferredVersion = draftVersion || publishedVersion;
    if (preferredVersion) {
      return resolveRoomChunkDataFromVersionPayload(preferredVersion.payload, parsedLevelNumber);
    }
  }

  const legacyRecord = await getLegacyTeacherLevelRecord(teacherId, parsedLevelNumber);
  if (legacyRecord) {
    return resolveRoomChunkData(legacyRecord, parsedLevelNumber);
  }

  return null;
};

const getTeacherSavedLevelNumbers = async (teacherId) => {
  if (!teacherId) {
    return [];
  }

  await ensureTeacherEditorTables();

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT
        saved.levelNumber AS levelNumber
      FROM (
        SELECT ws.levelNumber AS levelNumber
        FROM teacher_level_workspaces AS ws
        WHERE ws.teacherId = ?
          AND ws.gameType = ?
          AND EXISTS (
            SELECT 1
            FROM teacher_level_versions AS tv
            WHERE tv.workspaceId = ws.id
              AND tv.state IN (?, ?)
          )

        UNION

        SELECT tr.levelNumber AS levelNumber
        FROM teacher_level_records AS tr
        WHERE tr.teacherId = ?
      ) AS saved
      ORDER BY saved.levelNumber ASC;
    `,
    teacherId,
    EDITOR_GAME_TYPE,
    VERSION_STATE_DRAFT,
    VERSION_STATE_PUBLISHED,
    teacherId,
  );

  return rows
    .map((row) => coerceInteger(row.levelNumber, 0))
    .filter((value) => value > 0);
};

const getTeacherPlayableLevelData = async (teacherId, levelNumber) => {
  const parsedLevelNumber = coerceInteger(levelNumber, 0);
  if (!teacherId || parsedLevelNumber <= 0) {
    return null;
  }

  const roomChunkData = await getLatestSavedRoomChunkData(teacherId, parsedLevelNumber);
  if (!roomChunkData) {
    return null;
  }

  return buildPlayableLevelDataFromRoomChunk({
    teacherId,
    levelNumber: parsedLevelNumber,
    roomChunkData,
  });
};

module.exports = {
  getTeacherLevelCanvas,
  saveTeacherLevelCanvas,
  getTeacherSavedLevelNumbers,
  getTeacherPlayableLevelData,
  __test__: {
    buildPlayableLevelDataFromRoomChunk,
    normalizeRoomChunkData,
  },
};
