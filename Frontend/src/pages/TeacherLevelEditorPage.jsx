import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BringToFront,
  Brush,
  ChevronLeft,
  ChevronRight,
  Eraser,
  FlipHorizontal2,
  Layers3,
  Loader2,
  Maximize2,
  MousePointer2,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  SendToBack,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Info,
  View,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleAPIError, teacherLevelEditorAPI } from '../utils/api';
import { gameOneRuntimeAssets } from '../games/game-one/assets/manifest/runtimeAssets';
import GameOnePlayMode from '../games/game-one/ui/GameOnePlayMode';
import GameOneEditorCanvas from '../features/level-editor/components/GameOneEditorCanvas';
import { PLATFORM_TILE_BY_KEY, PLATFORM_TILE_CATALOG } from '../features/level-editor/platformTileCatalog';
import questionStatueTile from '../../assets/Game/game_one/Platforms/elem12.png';
import {
  createDefaultRoomChunkData,
  getNextRoomPosition,
  legacyCellBackgroundsToRoomChunk,
  normalizeRoomChunkData,
  roomChunkToLegacyCellBackgrounds,
} from '../features/level-editor/utils/roomChunkSchema';
import {
  buildGameOneLevelDataFromRoomChunk,
  buildGameOneSelectedRoomEditorLevelData,
} from '../features/level-editor/utils/gameOneRoomChunkRuntime';
import {
  INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
  INVISIBLE_PLATFORM_DEFAULT_WIDTH,
  INVISIBLE_PLATFORM_GRID_SIZE,
  INVISIBLE_PLATFORM_MAX_HEIGHT,
  normalizeInvisiblePlatformComponent,
  normalizeInvisiblePlatformDimension,
} from '../games/game-one/systems/invisiblePlatformGrid';
import {
  DASH_MODE_OPTIONS,
  DEFAULT_PLAYER_ABILITY_CONFIG,
  getJumpSpeedFromHeight,
  normalizePlayerAbilityConfig,
} from '../games/game-one/systems/playerAbilityConfig';
import {
  TRIGGER_PLATFORM_ACTIONS,
  getTriggerPlatformBounds,
  normalizeTriggerPlatformAction,
  normalizeTriggerPlatformComponent,
  paintTriggerPlatformCell,
  translateTriggerPlatformCells,
  worldPointToTriggerPlatformCell,
} from '../games/game-one/systems/triggerPlatformUtils';

const LEVEL_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1);
const DOORWAY_OPTIONS = ['AUTO', 'N', 'E', 'S', 'W'];
const EDITOR_VIEWPORT = Object.freeze({ width: 1296, height: 720 });
const CANVAS_PADDING = 12;
const MAX_ROOM_COMPONENTS = 200;
const INSPECTOR_OPTIONS = Object.freeze([
  { value: 'levelSettings', label: 'Level Settings' },
  { value: 'config', label: 'Config' },
]);
const PALETTE_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'All' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'object', label: 'Object' },
  { value: 'entity', label: 'Entity' },
  { value: 'monster', label: 'Monster' },
]);
const GHOST_DIRECTION_OPTIONS = Object.freeze(['LEFT', 'RIGHT', 'UP', 'DOWN']);
const AI_DIFFICULTY_OPTIONS = Object.freeze(['easy', 'medium', 'hard']);
const PASS_THROUGH_SIDE_OPTIONS = Object.freeze(['TOP', 'BOTTOM', 'LEFT', 'RIGHT']);
const TRIGGER_PLATFORM_ACTION_OPTIONS = Object.freeze(
  TRIGGER_PLATFORM_ACTIONS.map((value) => ({
    value,
    label: value === 'GO_THROUGH'
      ? 'Go Through'
      : (value.charAt(0) + value.slice(1).toLowerCase()),
  })),
);
const DEFAULT_LEVEL_SETTINGS = Object.freeze({
  backgroundKey: 'tutorialGrove',
  playerHealth: 3,
  timerEnabled: false,
  timerSeconds: 120,
  allowMidairDash: true,
  allowProjectile: true,
  allowDoubleJump: true,
  sharedGridSnap: 48,
});
const TEACHER_COMPONENT_TO_EDITOR_OBJECT_TYPE = Object.freeze({
  spawn: 'spawn',
  invisiblePlatform: 'invisiblePlatforms',
  triggerPlatform: 'triggerPlatforms',
  coin: 'coins',
  ghost: 'ghosts',
  slimeGreen: 'ghosts',
  slimeOrange: 'ghosts',
  projectileEnemy: 'projectileEnemies',
  villain1: 'projectileEnemies',
  boss: 'projectileEnemies',
  portal: 'portal',
  portal3: 'portal',
  statue: 'villain',
});
const EDITOR_OBJECT_TO_TEACHER_COMPONENT_TYPE = Object.freeze({
  spawn: 'spawn',
  invisiblePlatforms: 'invisiblePlatform',
  triggerPlatforms: 'triggerPlatform',
  coins: 'coin',
  ghosts: 'ghost',
  projectileEnemies: 'projectileEnemy',
  portal: 'portal',
  villain: 'statue',
});
const ROOM_EDITOR_SETTINGS = Object.freeze({
  gridSize: INVISIBLE_PLATFORM_GRID_SIZE,
  snapEnabled: false,
  showGrid: true,
  showHitboxes: true,
  showGuides: true,
  showLinks: false,
  allowCameraNavigation: false,
});
const TUTORIAL_GUIDE_VIDEO_PATH = '/videos/teacher-level-editor-tutorial.mp4';
const MAP_TILE_DEFAULT_SNAP = 48;
const COMPONENT_INSERT_CLICK_SIZE = 60;
const COMPONENT_INSERT_DRAG_SIZE = 40;
const MAP_TILE_CLICK_INSERT_SIZE = 60;
const MAP_TILE_DRAG_INSERT_SIZE = 40;
const MAP_TILE_DEFAULT_SIZE = MAP_TILE_CLICK_INSERT_SIZE;
const MAP_TILE_MIN_SIZE = 16;
const MAP_TILE_MAX_SIZE = 1024;
const MAX_MAP_TILE_Z_INDEX = 9999;
const MAP_TILE_ROTATION_MIN = 0;
const MAP_TILE_ROTATION_MAX = 359;
// Keep these as divisors of the 1296x720 editor viewport so grid edges stay full cells.
const MAP_TILE_SNAP_OPTIONS = Object.freeze([0, 16, 24, 48]);
const normalizeSharedGridSnapValue = (value, fallback = MAP_TILE_DEFAULT_SNAP) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && MAP_TILE_SNAP_OPTIONS.includes(parsed)) {
    return parsed;
  }

  const fallbackParsed = Number(fallback);
  if (Number.isInteger(fallbackParsed) && MAP_TILE_SNAP_OPTIONS.includes(fallbackParsed)) {
    return fallbackParsed;
  }

  return MAP_TILE_DEFAULT_SNAP;
};
const DEFAULT_CHARACTER_RENDER_LAYER = 'back';
const CHARACTER_RENDER_LAYER_OPTIONS = Object.freeze([
  { value: 'back', label: 'Behind Character (Default)' },
  { value: 'front', label: 'In Front Of Character' },
]);
const PLAYMODE_BOOT_SEQUENCE = Object.freeze([
  'Syncing latest room edits',
  'Preparing enemies and checkpoints',
  'Launching play preview',
]);
const PLAYMODE_BOOT_STEP_MS = 420;
const PLAYMODE_BOOT_FADE_MS = 250;
const TOOLTIP_HOVER_DELAY_MS = 1000;
const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const MAX_ROOM_NAME_LENGTH = 60;
const MAP_BACKGROUND_NONE_KEY = 'none';
const MAP_TILE_CATEGORY_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'All' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'platforms', label: 'Platforms' },
  { value: 'background', label: 'Background' },
  { value: 'ground', label: 'Ground' },
  { value: 'decor', label: 'Decor' },
  { value: 'portal', label: 'Portal' },
  { value: 'mossy', label: 'Mossy' },
]);
const MAP_TILE_TOOL_MODES = Object.freeze({
  SELECT: 'select',
  PAINT: 'paint',
  ERASE: 'erase',
});
const AUTOSAVE_STORAGE_PREFIX = 'itechs-teacher-level-editor-autosave-v1';
const LEGACY_ADMIN_EDITOR_STORAGE_PREFIX = 'admin-level-editor:';
const AUTOSAVE_INTERVAL_MS = 15000;
const AUTOSAVE_SCHEMA_VERSION = 1;
const UNSAVED_CHANGES_WARNING = 'You have unsaved level changes. Press Cancel to stay and save first, or OK to leave without saving.';
const QUESTION_STATUE_TEXTURE_KEY = 'teacher-statue-elem12';
const QUESTION_STATUE_DEFAULT_SIZE = 212;
const COIN_DEFAULT_SIZE = 36;
const DEFAULT_EDITOR_GRID_SIZE = MAP_TILE_DEFAULT_SNAP;
const SPRITESHEET_PREVIEW_FRAMES = Object.freeze({
  spawn: 20,
  coin: 7,
  ghost: 8,
  slimeGreen: 30,
  slimeOrange: 30,
  projectileEnemy: 8,
  portal: 4,
  portal3: 4,
  villain1: 1,
  boss: 16,
});
const SPRITESHEET_PREVIEW_FPS = Object.freeze({
  spawn: 8,
  coin: 12,
  ghost: 10,
  slimeGreen: 10,
  slimeOrange: 10,
  projectileEnemy: 10,
  portal: 8,
  portal3: 8,
  villain1: 8,
  boss: 10,
});
const COMPONENT_LIBRARY = Object.freeze([
  {
    type: 'spawn',
    label: 'Spawn Point',
    singleton: true,
    filters: ['object', 'entity'],
    create: ({
      x,
      y,
      defaultPlayerHealth,
      defaultAllowMidairDash,
      defaultAllowProjectile,
      defaultAllowDoubleJump,
    }) => ({
      type: 'spawn',
      x,
      y,
      snapToGrid: true,
      health: Math.min(10, Math.max(1, Math.round(Number(defaultPlayerHealth) || DEFAULT_LEVEL_SETTINGS.playerHealth))),
      allowMidairDash: defaultAllowMidairDash !== false,
      allowProjectile: defaultAllowProjectile !== false,
      allowDoubleJump: defaultAllowDoubleJump !== false,
      ...DEFAULT_PLAYER_ABILITY_CONFIG,
    }),
  },
  {
    type: 'invisiblePlatform',
    label: 'Invisible Platform',
    singleton: false,
    filters: ['object'],
    create: ({ x, y }) => ({
      type: 'invisiblePlatform',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      width: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
      height: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
      passThroughSides: [],
    }),
  },
  {
    type: 'triggerPlatform',
    label: 'Trigger Platform',
    singleton: false,
    hidden: true,
    filters: ['object'],
    create: ({ x, y, defaultTextureKey }) => normalizeTriggerPlatformForEditor({
      type: 'triggerPlatform',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      invisible: false,
      passThroughSides: [],
      triggerId: '',
      untriggeredTileKey: defaultTextureKey || '',
      triggeredTileKey: defaultTextureKey || '',
      correctAction: 'NONE',
      wrongAction: 'NONE',
      correctMoveTo: null,
      wrongMoveTo: null,
      correctGoThrough: {
        player: false,
        entities: false,
      },
      wrongGoThrough: {
        player: false,
        entities: false,
      },
      cells: [worldPointToTriggerPlatformCell({ x, y }, {
        gridSize: DEFAULT_EDITOR_GRID_SIZE,
        viewport: EDITOR_VIEWPORT,
      })],
    }, DEFAULT_EDITOR_GRID_SIZE),
  },
  {
    type: 'coin',
    label: 'Coin',
    singleton: false,
    filters: ['collectibles', 'entity'],
    create: ({ x, y }) => ({
      type: 'coin',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      size: COIN_DEFAULT_SIZE,
    }),
  },
  {
    type: 'ghost',
    label: 'Ghost',
    singleton: false,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'ghost',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      patrolDistance: 220,
      speed: 80,
    }),
  },
  {
    type: 'slimeGreen',
    label: 'Slime Green',
    singleton: false,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'slimeGreen',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      patrolDistance: 220,
      speed: 72,
      enemyType: 'slimegreen',
    }),
  },
  {
    type: 'slimeOrange',
    label: 'Slime Orange',
    singleton: false,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'slimeOrange',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      patrolDistance: 220,
      speed: 80,
      enemyType: 'slimeorange',
    }),
  },
  {
    type: 'projectileEnemy',
    label: 'Projectile Enemy',
    singleton: false,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'projectileEnemy',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      enemyType: 'elemental',
      fireDirection: 'LEFT',
      fireIntervalMs: 1800,
      projectileSpeed: 285,
      projectileLifetimeMs: 2550,
      initialDelayMs: 900,
    }),
  },
  {
    type: 'portal',
    label: 'Portal',
    singleton: false,
    filters: ['object', 'entity'],
    create: ({ x, y }) => ({
      type: 'portal',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      locked: false,
      endsLevel: false,
      linkName: '',
      variant: 'portal3',
    }),
  },
  {
    type: 'villain1',
    label: 'Villain 1',
    singleton: false,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'villain1',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      enemyType: 'villain1',
      fireDirection: 'LEFT',
      fireIntervalMs: 1650,
      projectileSpeed: 300,
      projectileLifetimeMs: 2400,
      initialDelayMs: 700,
      hitPoints: 2,
    }),
  },
  {
    type: 'boss',
    label: 'Boss',
    singleton: false,
    hidden: true,
    filters: ['entity', 'monster'],
    create: ({ x, y }) => ({
      type: 'boss',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      enemyType: 'spiritboss',
      fireDirection: 'LEFT',
      fireIntervalMs: 1250,
      projectileSpeed: 360,
      projectileLifetimeMs: 3200,
      initialDelayMs: 900,
      hitPoints: 12,
    }),
  },
  {
    type: 'statue',
    label: 'Question Statue',
    singleton: false,
    filters: ['entity', 'object'],
    create: ({ x, y }) => ({
      type: 'statue',
      x,
      y,
      snapToGrid: true,
      renderLayer: DEFAULT_CHARACTER_RENDER_LAYER,
      size: QUESTION_STATUE_DEFAULT_SIZE,
      textureKey: QUESTION_STATUE_TEXTURE_KEY,
      triggerId: '',
      questionTopic: '',
      aiChoicesCount: 4,
      aiDifficulty: 'medium',
      aiLanguage: 'English',
      aiGradeLevel: '',
      aiInstructions: '',
      damageOnWrongAnswer: 1,
      prompt: 'What is the correct answer?',
      choices: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 0,
    }),
  },
]);

const GHOST_COMPONENT_TYPES = Object.freeze(['ghost', 'slimeGreen', 'slimeOrange']);
const PROJECTILE_COMPONENT_TYPES = Object.freeze(['projectileEnemy', 'villain1', 'boss']);

const toDisplayLabel = (value) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const formatTimestamp = (value) => {
  if (!value) {
    return 'Not saved yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const clampWholeNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampNumber(Math.trunc(parsed), min, max);
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DelayedTooltip = ({ message }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setVisible(true);
      timerRef.current = null;
    }, TOOLTIP_HOVER_DELAY_MS);
  };

  const handleLeave = () => {
    clearTimer();
    setVisible(false);
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/80 bg-slate-800/90 text-slate-200">
        <Info className="h-3 w-3" />
      </span>
      {visible && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-56 -translate-x-1/2 rounded-md border border-slate-500/80 bg-slate-950/95 px-2 py-1.5 text-[11px] font-medium leading-snug text-slate-100 shadow-xl"
        >
          {message}
        </span>
      )}
    </span>
  );
};

const ToggleRow = ({ label, checked, onChange, tooltip, disabled = false }) => (
  <label className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-2 text-xs ${disabled ? 'border-slate-700/70 bg-slate-900/40 text-slate-500' : 'border-slate-700 bg-slate-900/70 text-slate-200'}`}>
    <span className="inline-flex items-center gap-1.5 font-semibold">
      {label}
      {tooltip ? <DelayedTooltip message={tooltip} /> : null}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-slate-500 bg-slate-800 disabled:cursor-not-allowed"
    />
  </label>
);

const getAutosaveStorageKey = (levelNumber) => `${AUTOSAVE_STORAGE_PREFIX}:level-${Number(levelNumber) || 1}`;

const clearLegacyAdminEditorDrafts = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (typeof key === 'string' && key.startsWith(LEGACY_ADMIN_EDITOR_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Unable to clear legacy admin level editor drafts', error);
  }
};

const normalizeInsertSize = (value, fallback = COMPONENT_INSERT_CLICK_SIZE) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampNumber(Math.round(Number(fallback) || COMPONENT_INSERT_CLICK_SIZE), MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
  }

  return clampNumber(Math.round(parsed), MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
};

const normalizeInvisiblePlatformForEditor = (component, gridSize = DEFAULT_EDITOR_GRID_SIZE) => (
  normalizeInvisiblePlatformComponent(component, {
    gridSize,
    viewport: EDITOR_VIEWPORT,
    maxHeight: INVISIBLE_PLATFORM_MAX_HEIGHT,
  })
);

const normalizeTriggerPlatformForEditor = (component, gridSize = DEFAULT_EDITOR_GRID_SIZE) => (
  normalizeTriggerPlatformComponent(component, {
    gridSize,
    viewport: EDITOR_VIEWPORT,
  })
);

const normalizeRoomChunkInvisiblePlatformsForEditor = (roomChunkData, gridSize = DEFAULT_EDITOR_GRID_SIZE) => {
  const normalized = normalizeRoomChunkData(roomChunkData);

  return {
    ...normalized,
    rooms: (normalized.rooms || []).map((room) => ({
      ...room,
      components: (Array.isArray(room.components) ? room.components : []).map((component) => (
        component?.type === 'invisiblePlatform'
          ? normalizeInvisiblePlatformForEditor(component, gridSize)
          : (component?.type === 'triggerPlatform'
            ? normalizeTriggerPlatformForEditor(component, gridSize)
            : component)
      )),
    })),
  };
};

const withInsertedComponentSize = (component, requestedSize, gridSize = DEFAULT_EDITOR_GRID_SIZE) => {
  if (!component || typeof component !== 'object') {
    return component;
  }

  const baseSize = component.type === 'statue'
    ? QUESTION_STATUE_DEFAULT_SIZE
    : COMPONENT_INSERT_CLICK_SIZE;
  const resolvedSize = normalizeInsertSize(requestedSize, baseSize);
  const next = { ...component };

  if (component.type === 'invisiblePlatform') {
    return normalizeInvisiblePlatformForEditor({
      ...next,
      width: normalizeInvisiblePlatformDimension(component.width, {
        gridSize,
        fallback: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
        max: EDITOR_VIEWPORT.width,
      }),
      height: normalizeInvisiblePlatformDimension(component.height, {
        gridSize,
        fallback: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
        max: INVISIBLE_PLATFORM_MAX_HEIGHT,
      }),
    }, gridSize);
  }

  if (component.type === 'triggerPlatform') {
    return normalizeTriggerPlatformForEditor(next, gridSize);
  }

  const explicitSize = Number(component.size);
  if (Number.isFinite(explicitSize) && explicitSize > 0) {
    next.size = normalizeInsertSize(explicitSize, resolvedSize);
    return next;
  }

  next.size = resolvedSize;
  return next;
};

const getComponentQuickResizeMeta = (component, gridSize = DEFAULT_EDITOR_GRID_SIZE) => {
  if (!component || typeof component !== 'object') {
    return null;
  }

  if (component.type === 'invisiblePlatform') {
    return {
      min: gridSize,
      max: normalizeInvisiblePlatformDimension(EDITOR_VIEWPORT.width, {
        gridSize,
        fallback: EDITOR_VIEWPORT.width,
        max: EDITOR_VIEWPORT.width,
      }),
      value: normalizeInvisiblePlatformDimension(component.width, {
        gridSize,
        fallback: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
        max: EDITOR_VIEWPORT.width,
      }),
    };
  }

  if (component.type === 'statue') {
    return {
      min: MAP_TILE_MIN_SIZE,
      max: MAP_TILE_MAX_SIZE,
      value: clampNumber(Number(component.size) || QUESTION_STATUE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE),
    };
  }

  if (component.type === 'triggerPlatform') {
    return null;
  }

  if (
    Number.isFinite(Number(component.size))
    || ['spawn', 'coin', 'portal', 'portal3'].includes(component.type)
    || GHOST_COMPONENT_TYPES.includes(component.type)
    || PROJECTILE_COMPONENT_TYPES.includes(component.type)
  ) {
    return {
      min: MAP_TILE_MIN_SIZE,
      max: MAP_TILE_MAX_SIZE,
      value: clampNumber(Number(component.size) || COMPONENT_INSERT_CLICK_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE),
    };
  }

  return null;
};

const applyComponentQuickResize = (component, rawValue, gridSize = DEFAULT_EDITOR_GRID_SIZE) => {
  const resizeMeta = getComponentQuickResizeMeta(component, gridSize);
  if (!resizeMeta) {
    return component;
  }

  const requestedSize = clampNumber(
    Math.round(Number(rawValue) || resizeMeta.value),
    resizeMeta.min,
    resizeMeta.max,
  );

  if (component.type === 'invisiblePlatform') {
    return normalizeInvisiblePlatformForEditor({
      ...component,
      width: normalizeInvisiblePlatformDimension(requestedSize, {
        gridSize,
        fallback: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
        max: EDITOR_VIEWPORT.width,
      }),
      height: normalizeInvisiblePlatformDimension(component.height, {
        gridSize,
        fallback: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
        max: INVISIBLE_PLATFORM_MAX_HEIGHT,
      }),
    }, gridSize);
  }

  if (component.type === 'triggerPlatform') {
    return normalizeTriggerPlatformForEditor(component, gridSize);
  }

  return {
    ...component,
    size: requestedSize,
  };
};

const QUICK_TOOLS_TOOLBAR_HEIGHT = 46;
const QUICK_TOOLS_RESIZE_PANEL_HEIGHT = 86;
const QUICK_TOOLS_COMPONENT_GAP = 14;
const QUICK_TOOLS_STACK_GAP = 10;
const QUICK_TOOLS_EDGE_PADDING = 12;

const getQuickHalfHeightForComponent = (component) => {
  if (!component || typeof component !== 'object') {
    return 42;
  }

  if (component.type === 'invisiblePlatform') {
    const height = normalizeInvisiblePlatformDimension(component.height, {
      fallback: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
      max: INVISIBLE_PLATFORM_MAX_HEIGHT,
    });
    return Math.max(16, Math.round(height / 2));
  }

  if (component.type === 'triggerPlatform') {
    const height = Math.max(DEFAULT_EDITOR_GRID_SIZE, Math.round(Number(component.height) || DEFAULT_EDITOR_GRID_SIZE));
    return Math.max(16, Math.round(height / 2));
  }

  const fallbackSize = component.type === 'statue'
    ? QUESTION_STATUE_DEFAULT_SIZE
    : COMPONENT_INSERT_CLICK_SIZE;
  const size = clampNumber(Number(component.size) || fallbackSize, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);

  return Math.max(16, Math.round(size / 2));
};

const getQuickHalfHeightForMapTile = (tile) => {
  if (!tile || typeof tile !== 'object') {
    return 30;
  }

  const size = clampNumber(Number(tile.size) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
  return Math.max(16, Math.round(size / 2));
};

const normalizeMapTileZIndex = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampNumber(fallback, 0, MAX_MAP_TILE_Z_INDEX);
  }

  return clampNumber(Math.round(parsed), 0, MAX_MAP_TILE_Z_INDEX);
};

const normalizeMapTileRotation = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampNumber(fallback, MAP_TILE_ROTATION_MIN, MAP_TILE_ROTATION_MAX);
  }

  const rounded = Math.round(parsed);
  const normalized = ((rounded % 360) + 360) % 360;
  return clampNumber(normalized, MAP_TILE_ROTATION_MIN, MAP_TILE_ROTATION_MAX);
};

const normalizeCharacterRenderLayer = (value, fallback = DEFAULT_CHARACTER_RENDER_LAYER) => {
  const parsed = typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';

  if (parsed === 'front') {
    return 'front';
  }

  if (parsed === 'back') {
    return 'back';
  }

  return fallback === 'front' ? 'front' : DEFAULT_CHARACTER_RENDER_LAYER;
};

const toTileBlendMode = (value) => (String(value || '').trim().toLowerCase() === 'screen' ? 'screen' : 'normal');

const toMapTileCategory = (tile) => {
  const catalogCategory = typeof tile?.category === 'string' ? tile.category.trim().toLowerCase() : '';
  if (catalogCategory) {
    return catalogCategory;
  }

  const source = String(tile?.source || '').trim().toLowerCase();
  const group = String(tile?.group || '').trim().toLowerCase();
  const label = String(tile?.label || '').trim().toLowerCase();
  const path = String(tile?.path || '').trim().toLowerCase();
  const joined = `${group} ${label} ${path}`;

  if (tile?.isPortalTile || joined.includes('portal')) {
    return 'portal';
  }

  if (source === 'mossy') {
    if (joined.includes('background')) {
      return 'background';
    }

    if (
      joined.includes('decor')
      || joined.includes('decoration')
      || joined.includes('hazard')
      || joined.includes('hanging')
      || joined.includes('plant')
    ) {
      return 'decor';
    }

    if (joined.includes('ground') || joined.includes('tile set') || joined.includes('tileset')) {
      return 'ground';
    }

    return 'mossy';
  }

  if (joined.includes('background')) {
    return 'background';
  }

  if (joined.includes('ground') || joined.includes('floor') || joined.includes('land')) {
    return 'ground';
  }

  if (joined.includes('decor') || joined.includes('decoration') || joined.includes('detail') || joined.includes('plant')) {
    return 'decor';
  }

  return 'platforms';
};

const sortMapTilesByLayer = (tiles = []) => (Array.isArray(tiles)
  ? [...tiles]
    .map((tile, index) => ({
      tile,
      index,
      zIndex: normalizeMapTileZIndex(tile?.zIndex, index),
    }))
    .sort((left, right) => {
      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex;
      }

      return left.index - right.index;
    })
    .map(({ tile }) => tile)
  : []);

const resolveMapTileKeyAtPoint = (tiles = [], point = null) => {
  if (!point || !Array.isArray(tiles) || !tiles.length) {
    return '';
  }

  const pointX = Number(point.x);
  const pointY = Number(point.y);
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
    return '';
  }

  const orderedTiles = sortMapTilesByLayer(tiles);
  for (let index = orderedTiles.length - 1; index >= 0; index -= 1) {
    const tile = orderedTiles[index];
    const tileKey = typeof tile?.tileKey === 'string' ? tile.tileKey.trim() : '';
    if (!tileKey) {
      continue;
    }

    const tileX = Number(tile?.x);
    const tileY = Number(tile?.y);
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
      continue;
    }

    const tileSize = clampNumber(Number(tile?.size) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
    const halfSize = tileSize * 0.5;
    if (Math.abs(pointX - tileX) <= halfSize && Math.abs(pointY - tileY) <= halfSize) {
      return tileKey;
    }
  }

  return '';
};

const remapMapTileLayerIndexes = (tiles = []) => sortMapTilesByLayer(tiles)
  .map((tile, index) => ({
    ...tile,
    zIndex: index,
  }));

const EntityThumbnail = ({
  componentType,
  textureKey = '',
  resolveComponentVisual,
  animated = false,
  className = '',
}) => {
  if (componentType === 'invisiblePlatform') {
    return (
      <div className={`flex h-11 w-11 items-center justify-center rounded-md border border-slate-600 bg-slate-800 ${className}`}>
        <div className="h-6 w-8 rounded-sm border-2 border-cyan-300/90 bg-transparent" />
      </div>
    );
  }

  if (componentType === 'triggerPlatform') {
    return (
      <div className={`flex h-11 w-11 items-center justify-center rounded-md border border-slate-600 bg-slate-800 ${className}`}>
        <div className="h-6 w-8 rounded-sm border-2 border-orange-300/95 bg-orange-400/10" />
      </div>
    );
  }

  const visual = resolveComponentVisual(componentType, textureKey);
  const frameCount = visual?.isSheet ? (SPRITESHEET_PREVIEW_FRAMES[componentType] || 1) : 1;
  const frameRate = SPRITESHEET_PREVIEW_FPS[componentType] || 8;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!animated || !visual?.isSheet || frameCount <= 1 || typeof window === 'undefined') {
      setFrameIndex(0);
      return undefined;
    }

    const intervalMs = Math.max(60, Math.floor(1000 / frameRate));
    const timer = window.setInterval(() => {
      setFrameIndex((previous) => (previous + 1) % frameCount);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [animated, frameCount, frameRate, visual?.isSheet, visual?.url]);

  if (!visual?.url) {
    return (
      <div className={`flex h-11 w-11 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-[10px] font-bold text-slate-400 ${className}`}>
        N/A
      </div>
    );
  }

  if (!visual.isSheet) {
    return (
      <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-slate-600 bg-slate-800 ${className}`}>
        <img
          src={visual.url}
          alt={`${componentType} preview`}
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const frameWidth = Number(visual.frameConfig?.frameWidth) || 40;
  const frameHeight = Number(visual.frameConfig?.frameHeight) || 40;
  const previewHeight = 38;
  const previewWidth = Math.max(14, Math.round((frameWidth / frameHeight) * previewHeight));

  return (
    <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-slate-600 bg-slate-800 ${className}`}>
      <div className="overflow-hidden" style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}>
        <img
          src={visual.url}
          alt={`${componentType} preview`}
          draggable={false}
          className="max-w-none"
          style={{
            width: `${previewWidth * frameCount}px`,
            height: `${previewHeight}px`,
            transform: `translateX(-${frameIndex * previewWidth}px)`,
          }}
        />
      </div>
    </div>
  );
};

const TeacherLevelEditorPage = () => {
  const navigate = useNavigate();
  const canvasHostRef = useRef(null);

  const [selectedLevel, setSelectedLevel] = useState(1);
  const [roomChunkData, setRoomChunkData] = useState(createDefaultRoomChunkData());
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeBackground, setActiveBackground] = useState('tutorialGrove');
  const [linkDraftTargetId, setLinkDraftTargetId] = useState('');
  const [previewRunNonce, setPreviewRunNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLiveEngineEnabled, setIsLiveEngineEnabled] = useState(false);
  const [workspaceEditMode, setWorkspaceEditMode] = useState('components');
  const [isRoomsPanelOpen, setIsRoomsPanelOpen] = useState(false);
  const [isInspectorPanelOpen, setIsInspectorPanelOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicModalComponentId, setTopicModalComponentId] = useState('');
  const [abilityModalType, setAbilityModalType] = useState(null);
  const [isTutorialGuideOpen, setIsTutorialGuideOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState('levelSettings');
  const [paletteFilter, setPaletteFilter] = useState('all');
  const [selectedMapTileKey, setSelectedMapTileKey] = useState('');
  const [mapTileSize, setMapTileSize] = useState(MAP_TILE_DEFAULT_SIZE);
  const [mapTileRotationDeg, setMapTileRotationDeg] = useState(0);
  const [mapTileFlipX, setMapTileFlipX] = useState(false);
  const [mapTileFlipY, setMapTileFlipY] = useState(false);
  const [mapTileSnap, setMapTileSnap] = useState(MAP_TILE_DEFAULT_SNAP);
  const [mapTileCategoryFilter, setMapTileCategoryFilter] = useState('all');
  const [mapTileToolMode, setMapTileToolMode] = useState(MAP_TILE_TOOL_MODES.SELECT);
  const [selectedMapPlacedTileIds, setSelectedMapPlacedTileIds] = useState([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState([]);
  const [triggerPlatformToolMode, setTriggerPlatformToolMode] = useState('');
  const [isQuickResizePanelOpen, setIsQuickResizePanelOpen] = useState(false);
  const [quickResizeDragValue, setQuickResizeDragValue] = useState(null);
  const [componentResizeHandlesEnabled, setComponentResizeHandlesEnabled] = useState(true);
  const [mapTileResizeHandlesEnabled, setMapTileResizeHandlesEnabled] = useState(false);
  const [addRoomDraft, setAddRoomDraft] = useState({
    name: 'Room 1',
    backgroundKey: DEFAULT_LEVEL_SETTINGS.backgroundKey,
    backgroundColor: DEFAULT_ROOM_BACKGROUND_COLOR,
    includeSpawn: false,
  });
  const [canvasBounds, setCanvasBounds] = useState({ ...EDITOR_VIEWPORT });
  const [canvasMeta, setCanvasMeta] = useState({
    id: null,
    updatedAt: null,
  });
  const [playmodeBootStep, setPlaymodeBootStep] = useState(-1);
  const [playmodeBootDirection, setPlaymodeBootDirection] = useState('enter');
  const [playmodeBootRunNonce, setPlaymodeBootRunNonce] = useState(0);
  const [isPlayPreviewRuntimeReady, setIsPlayPreviewRuntimeReady] = useState(false);
  const [topicModalDraft, setTopicModalDraft] = useState({
    questionTopic: '',
    aiChoicesCount: 4,
    aiDifficulty: 'medium',
    aiLanguage: 'English',
    aiGradeLevel: '',
    aiInstructions: '',
  });

  useEffect(() => {
    clearLegacyAdminEditorDrafts();
  }, []);

  const normalizeSelectionIds = useCallback((nextSelection) => {
    const nextIds = Array.isArray(nextSelection)
      ? nextSelection.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
      : (typeof nextSelection === 'string' && nextSelection.trim() ? [nextSelection.trim()] : []);
    return Array.from(new Set(nextIds));
  }, []);

  const setSelectedComponentSelection = useCallback((nextSelection) => {
    setSelectedComponentIds((previous) => {
      const resolvedSelection = typeof nextSelection === 'function'
        ? nextSelection(previous)
        : nextSelection;
      return normalizeSelectionIds(resolvedSelection);
    });
  }, [normalizeSelectionIds]);

  const setSelectedMapTileSelection = useCallback((nextSelection) => {
    setSelectedMapPlacedTileIds((previous) => {
      const resolvedSelection = typeof nextSelection === 'function'
        ? nextSelection(previous)
        : nextSelection;
      return normalizeSelectionIds(resolvedSelection);
    });
  }, [normalizeSelectionIds]);

  const selectedComponentId = selectedComponentIds[0] || '';
  const selectedMapPlacedTileId = selectedMapPlacedTileIds[0] || '';

  const rooms = roomChunkData.rooms || [];

  const roomLookup = useMemo(
    () => Object.fromEntries(rooms.map((room) => [room.id, room])),
    [rooms],
  );

  const selectedRoom = selectedRoomId ? roomLookup[selectedRoomId] : null;
  const selectedRoomIndex = useMemo(
    () => rooms.findIndex((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId],
  );

  const availableLinkTargets = useMemo(
    () => rooms.filter((room) => room.id !== selectedRoomId),
    [rooms, selectedRoomId],
  );

  const selectedRoomComponents = Array.isArray(selectedRoom?.components) ? selectedRoom.components : [];
  const selectedRoomBackgroundTiles = Array.isArray(selectedRoom?.backgroundTiles)
    ? selectedRoom.backgroundTiles
    : [];
  const selectedRoomBackgroundColor = typeof selectedRoom?.backgroundColor === 'string' && selectedRoom.backgroundColor
    ? selectedRoom.backgroundColor
    : DEFAULT_ROOM_BACKGROUND_COLOR;
  const selectedMapPlacedTile = useMemo(
    () => selectedRoomBackgroundTiles.find((tile) => tile.id === selectedMapPlacedTileId) || null,
    [selectedMapPlacedTileId, selectedRoomBackgroundTiles],
  );
  const mapTileSizeSliderValue = useMemo(() => {
    if (selectedMapPlacedTile) {
      return clampNumber(Number(selectedMapPlacedTile.size) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
    }

    return clampNumber(Number(mapTileSize) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
  }, [mapTileSize, selectedMapPlacedTile]);
  const mapTileRotationSliderValue = useMemo(() => {
    if (selectedMapPlacedTile) {
      return normalizeMapTileRotation(selectedMapPlacedTile.rotationDeg, 0);
    }

    return normalizeMapTileRotation(mapTileRotationDeg, 0);
  }, [mapTileRotationDeg, selectedMapPlacedTile]);
  const mapTileFlipXValue = selectedMapPlacedTile
    ? Boolean(selectedMapPlacedTile.flipX)
    : Boolean(mapTileFlipX);
  const mapTileFlipYValue = selectedMapPlacedTile
    ? Boolean(selectedMapPlacedTile.flipY)
    : Boolean(mapTileFlipY);
  const selectedMapTileRenderLayer = selectedMapPlacedTile
    ? normalizeCharacterRenderLayer(selectedMapPlacedTile.renderLayer)
    : DEFAULT_CHARACTER_RENDER_LAYER;
  const selectedComponent = useMemo(
    () => selectedRoomComponents.find((component) => component.id === selectedComponentId) || null,
    [selectedComponentId, selectedRoomComponents],
  );
  const topicModalComponent = useMemo(
    () => selectedRoomComponents.find((component) => (
      component.id === topicModalComponentId && component.type === 'statue'
    )) || null,
    [selectedRoomComponents, topicModalComponentId],
  );
  const selectedComponentRenderLayer = selectedComponent
    ? normalizeCharacterRenderLayer(selectedComponent.renderLayer)
    : DEFAULT_CHARACTER_RENDER_LAYER;
  const editorGridSize = mapTileSnap > 0 ? mapTileSnap : DEFAULT_EDITOR_GRID_SIZE;
  const selectedComponentResizeMeta = useMemo(
    () => getComponentQuickResizeMeta(selectedComponent, editorGridSize),
    [editorGridSize, selectedComponent],
  );
  const levelSettings = useMemo(() => {
    const settings = roomChunkData?.settings || {};
    return {
      backgroundKey: typeof settings.backgroundKey === 'string' && settings.backgroundKey.trim()
        ? settings.backgroundKey.trim()
        : DEFAULT_LEVEL_SETTINGS.backgroundKey,
      playerHealth: clampNumber(Number(settings.playerHealth) || DEFAULT_LEVEL_SETTINGS.playerHealth, 1, 10),
      timerEnabled: Boolean(settings.timerEnabled),
      timerSeconds: clampNumber(Number(settings.timerSeconds) || DEFAULT_LEVEL_SETTINGS.timerSeconds, 10, 3600),
      allowMidairDash: settings.allowMidairDash !== false,
      allowProjectile: settings.allowProjectile !== false,
      allowDoubleJump: settings.allowDoubleJump !== false,
      sharedGridSnap: normalizeSharedGridSnapValue(settings.sharedGridSnap, DEFAULT_LEVEL_SETTINGS.sharedGridSnap),
    };
  }, [roomChunkData?.settings]);
  const selectedAbilityConfig = useMemo(
    () => normalizePlayerAbilityConfig(selectedComponent?.type === 'spawn' ? selectedComponent : {}),
    [selectedComponent],
  );
  const selectedPortalNameCount = useMemo(() => {
    if (!['portal', 'portal3'].includes(selectedComponent?.type)) {
      return 0;
    }

    const normalizedName = typeof selectedComponent.linkName === 'string'
      ? selectedComponent.linkName.trim()
      : '';

    if (!normalizedName) {
      return 0;
    }

    return rooms.reduce((count, room) => {
      const roomComponents = Array.isArray(room.components) ? room.components : [];
      return count + roomComponents.filter((component) => (
        ['portal', 'portal3'].includes(component.type)
        && typeof component.linkName === 'string'
        && component.linkName.trim() === normalizedName
      )).length;
    }, 0);
  }, [rooms, selectedComponent]);
  const componentConfigByType = useMemo(
    () => Object.fromEntries(COMPONENT_LIBRARY.map((component) => [component.type, component])),
    [],
  );
  const filteredComponentLibrary = useMemo(() => {
    const visible = COMPONENT_LIBRARY.filter((component) => !component.hidden);
    if (paletteFilter === 'all') {
      return visible;
    }

    return visible.filter((component) => Array.isArray(component.filters) && component.filters.includes(paletteFilter));
  }, [paletteFilter]);
  const selectedMapTile = useMemo(() => {
    if (!selectedMapTileKey) {
      return null;
    }

    return PLATFORM_TILE_BY_KEY[selectedMapTileKey] || null;
  }, [selectedMapTileKey]);
  const isPlayMode = isLiveEngineEnabled;
  const isPlaymodeBootVisible = playmodeBootStep >= 0 || (isPlayMode && !isPlayPreviewRuntimeReady);
  const canQuickRotateComponent = GHOST_COMPONENT_TYPES.includes(selectedComponent?.type)
    || PROJECTILE_COMPONENT_TYPES.includes(selectedComponent?.type);
  const canQuickFlipComponent = GHOST_COMPONENT_TYPES.includes(selectedComponent?.type)
    || PROJECTILE_COMPONENT_TYPES.includes(selectedComponent?.type);
  const hasCanvasQuickSelection = !isPlayMode && (
    (workspaceEditMode === 'mapTiles' && selectedMapPlacedTileIds.length > 0)
    || (workspaceEditMode === 'components' && selectedComponentIds.length > 0)
  );
  const canQuickLayerSelection = workspaceEditMode === 'mapTiles'
    ? selectedMapPlacedTileIds.length > 0
    : selectedComponentIds.length > 0 && selectedComponent?.type !== 'spawn';
  const activeQuickRenderLayer = workspaceEditMode === 'mapTiles'
    ? selectedMapTileRenderLayer
    : selectedComponentRenderLayer;
  const canQuickResizeSelection = workspaceEditMode === 'mapTiles'
    ? selectedMapPlacedTileIds.length > 0
    : Boolean(selectedComponentResizeMeta);
  const quickResizeSliderBaseValue = workspaceEditMode === 'mapTiles'
    ? mapTileSizeSliderValue
    : (selectedComponentResizeMeta?.value ?? MAP_TILE_DEFAULT_SIZE);
  const quickResizeSliderMin = workspaceEditMode === 'mapTiles'
    ? MAP_TILE_MIN_SIZE
    : (selectedComponentResizeMeta?.min ?? MAP_TILE_MIN_SIZE);
  const quickResizeSliderMax = workspaceEditMode === 'mapTiles'
    ? MAP_TILE_MAX_SIZE
    : (selectedComponentResizeMeta?.max ?? MAP_TILE_MAX_SIZE);
  const quickResizeSliderValue = quickResizeDragValue !== null
    ? clampNumber(Number(quickResizeDragValue), quickResizeSliderMin, quickResizeSliderMax)
    : quickResizeSliderBaseValue;
  const fittedCanvasSize = useMemo(() => {
    const ratio = EDITOR_VIEWPORT.width / EDITOR_VIEWPORT.height;
    const maxWidth = Math.max(1, canvasBounds.width - CANVAS_PADDING);
    const maxHeight = Math.max(1, canvasBounds.height - CANVAS_PADDING);

    let width = maxWidth;
    let height = Math.floor(width / ratio);

    if (height > maxHeight) {
      height = maxHeight;
      width = Math.floor(height * ratio);
    }

    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }, [canvasBounds.height, canvasBounds.width]);
  const quickToolsAnchor = useMemo(() => {
    if (!hasCanvasQuickSelection) {
      return null;
    }

    const selectedPoint = workspaceEditMode === 'mapTiles'
      ? (selectedMapPlacedTile
        ? {
            x: Number(selectedMapPlacedTile.x) || (EDITOR_VIEWPORT.width * 0.5),
            y: Number(selectedMapPlacedTile.y) || (EDITOR_VIEWPORT.height * 0.5),
            halfHeightWorld: getQuickHalfHeightForMapTile(selectedMapPlacedTile),
          }
        : null)
      : (selectedComponent
        ? {
            x: Number(selectedComponent.x) || (EDITOR_VIEWPORT.width * 0.5),
            y: Number(selectedComponent.y) || (EDITOR_VIEWPORT.height * 0.5),
            halfHeightWorld: getQuickHalfHeightForComponent(selectedComponent),
          }
        : null);

    if (!selectedPoint) {
      return null;
    }

    const scaleX = fittedCanvasSize.width / EDITOR_VIEWPORT.width;
    const scaleY = fittedCanvasSize.height / EDITOR_VIEWPORT.height;
    const canvasOffsetX = Math.max(0, (canvasBounds.width - fittedCanvasSize.width) / 2);
    const canvasOffsetY = Math.max(0, (canvasBounds.height - fittedCanvasSize.height) / 2);
    const rawX = canvasOffsetX + (selectedPoint.x * scaleX);
    const rawTopEdgeY = canvasOffsetY + ((selectedPoint.y - selectedPoint.halfHeightWorld) * scaleY);
    const rawBottomEdgeY = canvasOffsetY + ((selectedPoint.y + selectedPoint.halfHeightWorld) * scaleY);

    return {
      x: clampNumber(rawX, 44, Math.max(44, canvasBounds.width - 44)),
      topEdgeY: clampNumber(rawTopEdgeY, QUICK_TOOLS_EDGE_PADDING, Math.max(QUICK_TOOLS_EDGE_PADDING, canvasBounds.height - QUICK_TOOLS_EDGE_PADDING)),
      bottomEdgeY: clampNumber(rawBottomEdgeY, QUICK_TOOLS_EDGE_PADDING, Math.max(QUICK_TOOLS_EDGE_PADDING, canvasBounds.height - QUICK_TOOLS_EDGE_PADDING)),
    };
  }, [
    canvasBounds.height,
    canvasBounds.width,
    fittedCanvasSize.height,
    fittedCanvasSize.width,
    hasCanvasQuickSelection,
    selectedComponent,
    selectedMapPlacedTile,
    workspaceEditMode,
  ]);
  const quickToolsLayout = useMemo(() => {
    if (!quickToolsAnchor) {
      return null;
    }

    const hasResizePanel = Boolean(isQuickResizePanelOpen && canQuickResizeSelection);
    const aboveSpace = Math.max(0, quickToolsAnchor.topEdgeY - QUICK_TOOLS_EDGE_PADDING);
    const belowSpace = Math.max(0, canvasBounds.height - quickToolsAnchor.bottomEdgeY - QUICK_TOOLS_EDGE_PADDING);
    const requiredSpace = QUICK_TOOLS_COMPONENT_GAP
      + QUICK_TOOLS_TOOLBAR_HEIGHT
      + (hasResizePanel ? QUICK_TOOLS_STACK_GAP + QUICK_TOOLS_RESIZE_PANEL_HEIGHT : 0);
    const dockBelow = aboveSpace < requiredSpace && belowSpace > aboveSpace;
    const clampOverlayTop = (value, overlayHeight) => clampNumber(
      value,
      QUICK_TOOLS_EDGE_PADDING,
      Math.max(QUICK_TOOLS_EDGE_PADDING, canvasBounds.height - overlayHeight - QUICK_TOOLS_EDGE_PADDING),
    );

    const toolbarTop = dockBelow
      ? clampOverlayTop(quickToolsAnchor.bottomEdgeY + QUICK_TOOLS_COMPONENT_GAP, QUICK_TOOLS_TOOLBAR_HEIGHT)
      : clampOverlayTop(quickToolsAnchor.topEdgeY - QUICK_TOOLS_TOOLBAR_HEIGHT - QUICK_TOOLS_COMPONENT_GAP, QUICK_TOOLS_TOOLBAR_HEIGHT);
    const resizePanelTop = hasResizePanel
      ? (dockBelow
        ? clampOverlayTop(toolbarTop + QUICK_TOOLS_TOOLBAR_HEIGHT + QUICK_TOOLS_STACK_GAP, QUICK_TOOLS_RESIZE_PANEL_HEIGHT)
        : clampOverlayTop(toolbarTop - QUICK_TOOLS_RESIZE_PANEL_HEIGHT - QUICK_TOOLS_STACK_GAP, QUICK_TOOLS_RESIZE_PANEL_HEIGHT))
      : null;

    return {
      dockBelow,
      toolbarTop,
      resizePanelTop,
    };
  }, [canQuickResizeSelection, canvasBounds.height, isQuickResizePanelOpen, quickToolsAnchor]);
  const isMapTilePaintMode = mapTileToolMode === MAP_TILE_TOOL_MODES.PAINT;
  const isMapTileEraseMode = mapTileToolMode === MAP_TILE_TOOL_MODES.ERASE;
  const isTriggerPlatformSelection = workspaceEditMode === 'components' && selectedComponent?.type === 'triggerPlatform';
  const isTriggerPlatformPaintMode = isTriggerPlatformSelection && triggerPlatformToolMode === 'paint';
  const isTriggerPlatformEraseMode = isTriggerPlatformSelection && triggerPlatformToolMode === 'erase';
  const playmodeBootLabel = playmodeBootDirection === 'exit'
    ? 'Switching To Edit Mode'
    : (PLAYMODE_BOOT_SEQUENCE[
      clampNumber(playmodeBootStep, 0, PLAYMODE_BOOT_SEQUENCE.length - 1)
    ] || (isPlayPreviewRuntimeReady ? 'Ready to play' : 'Loading game runtime'));
  const playmodeBootProgress = isPlaymodeBootVisible
    ? clampNumber((playmodeBootStep + 1) / PLAYMODE_BOOT_SEQUENCE.length, 0, 1)
    : 0;
  const roomEditorSettings = useMemo(() => ({
    ...ROOM_EDITOR_SETTINGS,
    gridSize: editorGridSize,
    snapEnabled: mapTileSnap > 0,
    showGrid: mapTileSnap > 0,
    interactionLock: workspaceEditMode === 'mapTiles' && isQuickResizePanelOpen,
    componentResizeHandlesEnabled,
    mapTileResizeHandlesEnabled,
    triggerPlatformToolMode,
    triggerPlatformComponentId: selectedComponent?.type === 'triggerPlatform' ? selectedComponent.id : '',
  }), [
    componentResizeHandlesEnabled,
    editorGridSize,
    isQuickResizePanelOpen,
    mapTileResizeHandlesEnabled,
    mapTileSnap,
    selectedComponent,
    triggerPlatformToolMode,
    workspaceEditMode,
  ]);

  useEffect(() => {
    if (!hasCanvasQuickSelection || !canQuickResizeSelection) {
      setIsQuickResizePanelOpen(false);
      setQuickResizeDragValue(null);
    }
  }, [canQuickResizeSelection, hasCanvasQuickSelection]);

  useEffect(() => {
    setQuickResizeDragValue(null);
  }, [selectedComponentId, selectedMapPlacedTileId, workspaceEditMode]);

  useEffect(() => {
    if (playmodeBootRunNonce <= 0) {
      return undefined;
    }

    setPlaymodeBootStep(0);

    if (typeof window === 'undefined') {
      return undefined;
    }

    const timers = PLAYMODE_BOOT_SEQUENCE.map((_, index) => window.setTimeout(() => {
      setPlaymodeBootStep(index);
    }, index * PLAYMODE_BOOT_STEP_MS));

    const closeTimer = window.setTimeout(() => {
      setPlaymodeBootStep(-1);
    }, (PLAYMODE_BOOT_SEQUENCE.length * PLAYMODE_BOOT_STEP_MS) + PLAYMODE_BOOT_FADE_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(closeTimer);
    };
  }, [playmodeBootRunNonce]);

  useEffect(() => {
    if (!isTopicModalOpen) {
      return;
    }

    if (topicModalComponent) {
      return;
    }

    setTopicModalComponentId('');
    setIsTopicModalOpen(false);
  }, [isTopicModalOpen, topicModalComponent]);

  useEffect(() => {
    if (selectedComponent?.type === 'spawn') {
      return;
    }

    setAbilityModalType(null);
  }, [selectedComponent]);

  useEffect(() => {
    if (selectedComponent?.type !== 'triggerPlatform') {
      setTriggerPlatformToolMode('');
    }
  }, [selectedComponent]);

  useEffect(() => {
    if (!isTutorialGuideOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsTutorialGuideOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isTutorialGuideOpen]);

  const groupedMapTiles = useMemo(() => PLATFORM_TILE_CATALOG
    .filter((tile) => (
      mapTileCategoryFilter === 'all'
      || (mapTileCategoryFilter === 'mossy' && tile.source === 'mossy')
      || toMapTileCategory(tile) === mapTileCategoryFilter
    ))
    .reduce((accumulator, tile) => {
    const currentGroup = tile.group || 'General';
    if (!accumulator[currentGroup]) {
      accumulator[currentGroup] = [];
    }
    accumulator[currentGroup].push(tile);
    return accumulator;
  }, {}), [mapTileCategoryFilter]);

  const editorRuntimeAssets = useMemo(() => ({
    ...gameOneRuntimeAssets,
    images: gameOneRuntimeAssets.images.some((entry) => entry.key === QUESTION_STATUE_TEXTURE_KEY)
      ? gameOneRuntimeAssets.images
      : [
          ...gameOneRuntimeAssets.images,
          {
            key: QUESTION_STATUE_TEXTURE_KEY,
            url: questionStatueTile,
          },
        ],
  }), []);

  const runtimeImageByKey = useMemo(
    () => Object.fromEntries(editorRuntimeAssets.images.map((entry) => [entry.key, entry.url])),
    [editorRuntimeAssets],
  );

  const runtimeSpritesheetByKey = useMemo(
    () => Object.fromEntries(editorRuntimeAssets.spritesheets.map((entry) => [entry.key, {
      url: entry.url,
      frameConfig: entry.frameConfig,
    }])),
    [editorRuntimeAssets],
  );

  const defaultPlatformTextureKey = useMemo(() => {
    const keys = Object.keys(editorRuntimeAssets.manifest?.platforms || {});
    return keys[0] || 'grass';
  }, [editorRuntimeAssets]);

  const triggerPlatformTileOptions = useMemo(() => {
    const blockTiles = PLATFORM_TILE_CATALOG.filter((tile) => tile.category === 'blocks');
    return blockTiles.length ? blockTiles : PLATFORM_TILE_CATALOG.filter((tile) => ['platforms', 'ground'].includes(tile.category));
  }, []);

  const defaultTriggerPlatformTextureKey = useMemo(() => (
    triggerPlatformTileOptions[0]?.key || defaultPlatformTextureKey
  ), [defaultPlatformTextureKey, triggerPlatformTileOptions]);

  const backgroundOptions = useMemo(() => {
    const manifestBackgrounds = editorRuntimeAssets.manifest?.backgrounds || {};
    const imageLookup = Object.fromEntries(
      editorRuntimeAssets.images.map((entry) => [entry.key, entry.url]),
    );

    const options = Object.entries(manifestBackgrounds).map(([backgroundKey, config]) => ({
      value: backgroundKey,
      label: toDisplayLabel(backgroundKey),
      imageUrl: imageLookup[config.key] || null,
    }));

    const withNoneOption = [
      {
        value: MAP_BACKGROUND_NONE_KEY,
        label: 'None (Color only)',
        imageUrl: null,
      },
      ...options,
    ];

    if (withNoneOption.length <= 1) {
      return [
        {
          value: MAP_BACKGROUND_NONE_KEY,
          label: 'None (Color only)',
          imageUrl: null,
        },
        { value: 'tutorialGrove', label: 'Tutorial Grove', imageUrl: null },
      ];
    }

    return withNoneOption;
  }, [editorRuntimeAssets]);

  const backgroundByValue = useMemo(
    () => Object.fromEntries(backgroundOptions.map((option) => [option.value, option])),
    [backgroundOptions],
  );
  const selectedRoomBackgroundImage = backgroundByValue[selectedRoom?.backgroundKey || activeBackground]?.imageUrl || null;
  const selectedRoomBackgroundTilesResolved = useMemo(() => sortMapTilesByLayer(selectedRoomBackgroundTiles)
    .map((tile, index) => {
      const visual = PLATFORM_TILE_BY_KEY[tile.tileKey];
      if (!visual?.url) {
        return null;
      }

      return {
        ...tile,
        renderLayer: normalizeCharacterRenderLayer(tile.renderLayer),
        zIndex: normalizeMapTileZIndex(tile.zIndex, index),
        rotationDeg: normalizeMapTileRotation(tile.rotationDeg, 0),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
        blendMode: toTileBlendMode(visual.blendMode),
        url: visual.url,
        label: visual.label,
      };
    })
    .filter(Boolean), [selectedRoomBackgroundTiles]);

  const resolveComponentVisual = useCallback((componentType, textureKey) => {
    const manifest = editorRuntimeAssets.manifest || {};

    const resolveSpriteSheet = (key) => {
      const sheet = runtimeSpritesheetByKey[key];
      if (!sheet?.url) {
        return null;
      }
      return {
        url: sheet.url,
        isSheet: true,
        frameConfig: sheet.frameConfig || null,
      };
    };

    const resolveImage = (key) => {
      const url = runtimeImageByKey[key];
      if (!url) {
        return null;
      }
      return {
        url,
        isSheet: false,
        frameConfig: null,
      };
    };

    if (componentType === 'spawn') {
      return resolveSpriteSheet(manifest.player?.key);
    }

    if (componentType === 'coin') {
      return resolveSpriteSheet(manifest.coin?.key);
    }

    if (componentType === 'ghost') {
      return resolveSpriteSheet(manifest.ghost?.key);
    }

    if (componentType === 'slimeGreen') {
      return resolveImage(`${manifest.slimeGreen?.key}-frame-00`) || resolveImage(manifest.slimeGreen?.key);
    }

    if (componentType === 'slimeOrange') {
      return resolveImage(`${manifest.slimeOrange?.key}-frame-00`)
        || resolveImage(`${manifest.slimePurple?.key}-frame-00`)
        || resolveImage(manifest.slimeOrange?.key)
        || resolveImage(manifest.slimePurple?.key);
    }

    if (componentType === 'projectileEnemy') {
      return resolveSpriteSheet(manifest.projectileCaster?.key);
    }

    if (componentType === 'villain1') {
      return resolveSpriteSheet(manifest.villain1Enemy?.key || manifest.projectileCaster?.key);
    }

    if (componentType === 'boss') {
      return resolveSpriteSheet(manifest.spiritBossEnemy?.key || manifest.bossEnemy?.key);
    }

    if (componentType === 'portal') {
      return resolveSpriteSheet(manifest.portal3?.key || manifest.portal?.key);
    }

    if (componentType === 'portal3') {
      return resolveSpriteSheet(manifest.portal3?.key || manifest.portal?.key);
    }

    if (componentType === 'statue') {
      return resolveImage(QUESTION_STATUE_TEXTURE_KEY) || resolveImage(manifest.villain?.key);
    }

    if (componentType === 'invisiblePlatform' || componentType === 'triggerPlatform' || componentType === 'platform' || componentType === 'barrier') {
      const requestedTexture = typeof textureKey === 'string' ? textureKey.trim() : '';
      const fallbackTexture = defaultPlatformTextureKey;
      const selectedTexture = requestedTexture && manifest.platforms?.[requestedTexture]
        ? requestedTexture
        : fallbackTexture;

      const imageKey = manifest.platforms?.[selectedTexture]?.key;
      return resolveImage(imageKey);
    }

    return null;
  }, [defaultPlatformTextureKey, editorRuntimeAssets.manifest, runtimeImageByKey, runtimeSpritesheetByKey]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) {
      return undefined;
    }

    const syncBounds = () => {
      setCanvasBounds({
        width: Math.max(1, Math.floor(host.clientWidth)),
        height: Math.max(1, Math.floor(host.clientHeight)),
      });
    };

    syncBounds();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(syncBounds);
      observer.observe(host);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', syncBounds);
    return () => window.removeEventListener('resize', syncBounds);
  }, []);

  const previewLevelData = useMemo(() => buildGameOneLevelDataFromRoomChunk({
    roomChunkData,
    selectedRoomId,
    levelNumber: selectedLevel,
    activeBackground,
    defaultPlatformTextureKey,
    platformTileByKey: PLATFORM_TILE_BY_KEY,
    viewport: EDITOR_VIEWPORT,
    includeDebugInvisibleCollision: false,
    snapGridSize: editorGridSize,
  }), [activeBackground, defaultPlatformTextureKey, editorGridSize, roomChunkData, selectedLevel, selectedRoomId]);

  const roomEditorLevelData = useMemo(() => buildGameOneSelectedRoomEditorLevelData({
    roomChunkData,
    selectedRoomId,
    levelNumber: selectedLevel,
    activeBackground,
    defaultPlatformTextureKey,
    platformTileByKey: PLATFORM_TILE_BY_KEY,
    viewport: EDITOR_VIEWPORT,
    snapGridSize: editorGridSize,
  }), [
    activeBackground,
    defaultPlatformTextureKey,
    editorGridSize,
    roomChunkData,
    selectedLevel,
    selectedRoomId,
  ]);

  const roomEditorSelectedObjectIds = useMemo(() => {
    if (!selectedComponentIds.length) {
      return [];
    }

    const selectedSet = new Set(selectedRoomComponents.map((component) => component.id));
    return selectedComponentIds.filter((componentId) => selectedSet.has(componentId));
  }, [selectedComponentIds, selectedRoomComponents]);

  const exitMapTileEditing = useCallback(() => {
    setWorkspaceEditMode('components');
    setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
    setSelectedMapTileKey('');
    setSelectedMapTileSelection([]);
    setInspectorMode('config');
  }, [setSelectedMapTileSelection]);

  useEffect(() => {
    if (isPlayMode && workspaceEditMode === 'mapTiles') {
      exitMapTileEditing();
    }
  }, [exitMapTileEditing, isPlayMode, workspaceEditMode]);

  const updateRooms = useCallback((updater) => {
    setRoomChunkData((previous) => {
      const nextRooms = updater([...(previous.rooms || [])]);
      const normalized = normalizeRoomChunkData({
        ...previous,
        rooms: nextRooms,
      });
      return normalized;
    });
    setIsDirty(true);
  }, []);

  const updateGridDimension = useCallback((dimension, rawValue) => {
    if (dimension !== 'rows' && dimension !== 'cols') {
      return;
    }

    const fallback = dimension === 'rows'
      ? Number(roomChunkData?.grid?.rows) || 18
      : Number(roomChunkData?.grid?.cols) || 32;
    const safeValue = clampNumber(Number(rawValue) || fallback, 8, 80);

    setRoomChunkData((previous) => normalizeRoomChunkData({
      ...previous,
      grid: {
        ...(previous?.grid || {}),
        [dimension]: safeValue,
      },
    }));
    setIsDirty(true);
  }, [roomChunkData?.grid?.cols, roomChunkData?.grid?.rows]);

  const updateSelectedRoomBackgroundTiles = useCallback((updater) => {
    if (!selectedRoomId) {
      return;
    }

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const currentTiles = Array.isArray(room.backgroundTiles) ? room.backgroundTiles : [];
      const nextTilesCandidate = typeof updater === 'function'
        ? updater(currentTiles)
        : updater;
      const nextTiles = Array.isArray(nextTilesCandidate)
        ? remapMapTileLayerIndexes(nextTilesCandidate).map((tile) => ({
            ...tile,
            renderLayer: normalizeCharacterRenderLayer(tile.renderLayer),
          }))
        : currentTiles;

      return {
        ...room,
        backgroundTiles: nextTiles,
      };
    }));
  }, [selectedRoomId, updateRooms]);

  const handleMapCanvasAction = useCallback(({
    point,
    erase = false,
    tileKeyOverride = '',
    sizeOverride,
    rotationOverride,
    flipXOverride,
    flipYOverride,
  }) => {
    if (!selectedRoomId || !point) {
      return;
    }

    const snappedX = clampNumber(Math.round(point.x), 0, EDITOR_VIEWPORT.width);
    const snappedY = clampNumber(Math.round(point.y), 0, EDITOR_VIEWPORT.height);
    const eraseRequested = erase || isMapTileEraseMode;

    if (eraseRequested) {
      let removedSelectedTileId = '';
      updateSelectedRoomBackgroundTiles((currentTiles) => {
        if (!currentTiles.length) {
          return currentTiles;
        }

        const threshold = mapTileSnap > 0
          ? Math.max(10, Number(mapTileSnap) * 0.5)
          : 14;
        const nearest = currentTiles
          .map((tile, index) => {
            const deltaX = Number(tile.x || 0) - snappedX;
            const deltaY = Number(tile.y || 0) - snappedY;
            return {
              index,
              distance: Math.hypot(deltaX, deltaY),
            };
          })
          .sort((left, right) => left.distance - right.distance)[0];

        if (!nearest || nearest.distance > threshold) {
          return currentTiles;
        }

        const removedTile = currentTiles[nearest.index];
        if (removedTile?.id) {
          removedSelectedTileId = removedTile.id;
        }

        return currentTiles.filter((_, index) => index !== nearest.index);
      });

      if (removedSelectedTileId) {
        setSelectedMapTileSelection((previous) => previous.filter((tileId) => tileId !== removedSelectedTileId));
      }
      return;
    }

    const resolvedTileKey = typeof tileKeyOverride === 'string' && tileKeyOverride.trim()
      ? tileKeyOverride.trim()
      : '';
    const resolvedTileConfig = resolvedTileKey
      ? PLATFORM_TILE_BY_KEY[resolvedTileKey]
      : selectedMapTile;
    const hasTileSelection = Boolean(resolvedTileConfig?.key);
    if (!hasTileSelection) {
      if (isMapTilePaintMode) {
        toast.error('Select a tile from the right sidebar first.');
      }
      return;
    }

    const safeSize = clampNumber(
      Number.isFinite(Number(sizeOverride)) ? Number(sizeOverride) : (Number(mapTileSize) || MAP_TILE_DEFAULT_SIZE),
      MAP_TILE_MIN_SIZE,
      MAP_TILE_MAX_SIZE,
    );
    const safeRotation = normalizeMapTileRotation(
      Number.isFinite(Number(rotationOverride)) ? Number(rotationOverride) : mapTileRotationDeg,
      0,
    );
    const safeFlipX = flipXOverride === undefined ? Boolean(mapTileFlipX) : Boolean(flipXOverride);
    const safeFlipY = flipYOverride === undefined ? Boolean(mapTileFlipY) : Boolean(flipYOverride);
    let changedTileId = '';

    updateSelectedRoomBackgroundTiles((currentTiles) => {
      const nextTiles = Array.isArray(currentTiles) ? [...currentTiles] : [];
      const matchIndex = nextTiles.findIndex((tile) => (
        Math.abs(Number(tile.x || 0) - snappedX) <= (mapTileSnap > 0 ? Math.max(4, Number(mapTileSnap) * 0.25) : 6)
        && Math.abs(Number(tile.y || 0) - snappedY) <= (mapTileSnap > 0 ? Math.max(4, Number(mapTileSnap) * 0.25) : 6)
      ));
      const currentMaxLayer = nextTiles.reduce((highest, tile, index) => (
        Math.max(highest, normalizeMapTileZIndex(tile?.zIndex, index))
      ), -1);
      const resolvedLayer = matchIndex >= 0
        ? normalizeMapTileZIndex(nextTiles[matchIndex]?.zIndex, matchIndex)
        : clampNumber(currentMaxLayer + 1, 0, MAX_MAP_TILE_Z_INDEX);

      const nextTile = {
        id: nextTiles[matchIndex]?.id || `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        tileKey: resolvedTileConfig.key,
        x: snappedX,
        y: snappedY,
        snapToGrid: matchIndex >= 0
          ? nextTiles[matchIndex]?.snapToGrid !== false
          : true,
        size: safeSize,
        zIndex: resolvedLayer,
        renderLayer: matchIndex >= 0
          ? normalizeCharacterRenderLayer(nextTiles[matchIndex]?.renderLayer)
          : DEFAULT_CHARACTER_RENDER_LAYER,
        rotationDeg: matchIndex >= 0
          ? normalizeMapTileRotation(nextTiles[matchIndex]?.rotationDeg, 0)
          : safeRotation,
        flipX: matchIndex >= 0
          ? Boolean(nextTiles[matchIndex]?.flipX)
          : safeFlipX,
        flipY: matchIndex >= 0
          ? Boolean(nextTiles[matchIndex]?.flipY)
          : safeFlipY,
      };
      changedTileId = nextTile.id;

      if (matchIndex >= 0) {
        nextTiles[matchIndex] = nextTile;
        return nextTiles;
      }

      return [...nextTiles, nextTile];
    });

    if (changedTileId) {
      setSelectedMapTileSelection([changedTileId]);
      if (resolvedTileConfig?.key) {
        setSelectedMapTileKey(resolvedTileConfig.key);
      }
    }

    if (!isMapTilePaintMode) {
      setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
      setSelectedMapTileKey('');
    }
  }, [
    isMapTileEraseMode,
    isMapTilePaintMode,
    mapTileSize,
    mapTileSnap,
    mapTileFlipX,
    mapTileFlipY,
    mapTileRotationDeg,
    selectedMapTile,
    selectedMapPlacedTileId,
    selectedRoomId,
    updateSelectedRoomBackgroundTiles,
  ]);

  const clearSelectedRoomBackgroundTiles = useCallback(() => {
    if (!selectedRoomId) {
      return;
    }

    updateSelectedRoomBackgroundTiles([]);
    setSelectedMapTileSelection([]);
  }, [selectedRoomId, setSelectedMapTileSelection, updateSelectedRoomBackgroundTiles]);

  const handleMapTileSelectionChange = useCallback((tileSelection) => {
    const nextTileIds = Array.isArray(tileSelection)
      ? tileSelection
      : [tileSelection];
    const filteredSelection = nextTileIds
      .filter((tileId) => typeof tileId === 'string' && tileId.trim())
      .map((tileId) => tileId.trim());

    setSelectedMapTileSelection(filteredSelection);

    if (!filteredSelection.length) {
      return;
    }

    const hitTile = selectedRoomBackgroundTiles.find((tile) => tile.id === filteredSelection[0]);
    if (!hitTile) {
      return;
    }

    setMapTileSize(
      clampNumber(Number(hitTile.size) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE),
    );
    setMapTileRotationDeg(normalizeMapTileRotation(hitTile.rotationDeg, 0));
    setMapTileFlipX(Boolean(hitTile.flipX));
    setMapTileFlipY(Boolean(hitTile.flipY));
  }, [selectedRoomBackgroundTiles, setSelectedMapTileSelection]);

  const handleMapTileMove = useCallback((movePayload) => {
    const moveChanges = Array.isArray(movePayload)
      ? movePayload
      : [movePayload];
    const normalizedChanges = moveChanges
      .filter((change) => change && typeof change.id === 'string' && change.point)
      .map((change) => ({
        id: change.id,
        point: change.point,
      }));

    if (!selectedRoomId || !normalizedChanges.length) {
      return;
    }

    const changeById = new Map(normalizedChanges.map((change) => [change.id, change.point]));

    updateSelectedRoomBackgroundTiles((currentTiles) => currentTiles.map((tile) => (
      changeById.has(tile.id)
        ? {
            ...tile,
            x: clampNumber(Math.round(changeById.get(tile.id).x), 0, EDITOR_VIEWPORT.width),
            y: clampNumber(Math.round(changeById.get(tile.id).y), 0, EDITOR_VIEWPORT.height),
          }
        : tile
    )));
  }, [selectedRoomId, updateSelectedRoomBackgroundTiles]);

  const handleMapTileDrop = useCallback((tileKey, point, insertSizeOverride) => {
    if (!tileKey || !point) {
      return;
    }

    if (!PLATFORM_TILE_BY_KEY[tileKey]) {
      return;
    }

    setWorkspaceEditMode('mapTiles');
    setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
    setSelectedMapTileKey(tileKey);
    const insertSize = normalizeInsertSize(insertSizeOverride, MAP_TILE_DRAG_INSERT_SIZE);
    setMapTileSize(insertSize);
    setMapTileRotationDeg(0);
    setMapTileFlipX(false);
    setMapTileFlipY(false);
    handleMapCanvasAction({
      point,
      erase: false,
      tileKeyOverride: tileKey,
      sizeOverride: insertSize,
      rotationOverride: 0,
      flipXOverride: false,
      flipYOverride: false,
    });
  }, [handleMapCanvasAction]);

  const handleMapTileResize = useCallback(({ id, size }) => {
    if (!selectedRoomId || !id) {
      return;
    }

    const safeSize = clampNumber(Number(size) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
    updateSelectedRoomBackgroundTiles((currentTiles) => currentTiles.map((tile) => (
      tile.id === id
        ? {
            ...tile,
            size: safeSize,
          }
        : tile
    )));

    if (id === selectedMapPlacedTileId) {
      setMapTileSize(safeSize);
    }
  }, [selectedMapPlacedTileId, selectedRoomId, updateSelectedRoomBackgroundTiles]);

  const updateSelectedMapPlacedTile = useCallback((updater) => {
    if (!selectedMapPlacedTileId) {
      return;
    }

    updateSelectedRoomBackgroundTiles((currentTiles) => currentTiles.map((tile) => {
      if (tile.id !== selectedMapPlacedTileId) {
        return tile;
      }

      if (typeof updater === 'function') {
        return updater(tile);
      }

      return {
        ...tile,
        ...(updater || {}),
      };
    }));
  }, [selectedMapPlacedTileId, updateSelectedRoomBackgroundTiles]);

  const handleMapTileSizeSliderChange = useCallback((rawValue) => {
    const safeSize = clampNumber(Number(rawValue) || MAP_TILE_DEFAULT_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
    setMapTileSize(safeSize);

    if (selectedMapPlacedTileId) {
      updateSelectedMapPlacedTile({
        size: safeSize,
      });
    }
  }, [selectedMapPlacedTileId, updateSelectedMapPlacedTile]);

  const handleMapTileRotationChange = useCallback((rawValue) => {
    const safeRotation = normalizeMapTileRotation(rawValue, 0);
    setMapTileRotationDeg(safeRotation);

    if (selectedMapPlacedTileId) {
      updateSelectedMapPlacedTile({
        rotationDeg: safeRotation,
      });
    }
  }, [selectedMapPlacedTileId, updateSelectedMapPlacedTile]);

  const handleMapTileFlipToggle = useCallback((axis) => {
    if (axis !== 'x' && axis !== 'y') {
      return;
    }

    if (axis === 'x') {
      const nextValue = !mapTileFlipXValue;
      setMapTileFlipX(nextValue);
      if (selectedMapPlacedTileId) {
        updateSelectedMapPlacedTile({ flipX: nextValue });
      }
      return;
    }

    const nextValue = !mapTileFlipYValue;
    setMapTileFlipY(nextValue);
    if (selectedMapPlacedTileId) {
      updateSelectedMapPlacedTile({ flipY: nextValue });
    }
  }, [mapTileFlipXValue, mapTileFlipYValue, selectedMapPlacedTileId, updateSelectedMapPlacedTile]);

  const shiftSelectedMapPlacedTileLayer = useCallback((delta) => {
    if (!selectedMapPlacedTileId || !Number.isFinite(delta) || delta === 0) {
      return;
    }

    updateSelectedRoomBackgroundTiles((currentTiles) => {
      const orderedTiles = remapMapTileLayerIndexes(currentTiles);
      const currentIndex = orderedTiles.findIndex((tile) => tile.id === selectedMapPlacedTileId);
      if (currentIndex < 0) {
        return orderedTiles;
      }

      const targetIndex = clampNumber(
        currentIndex + Math.trunc(delta),
        0,
        Math.max(0, orderedTiles.length - 1),
      );

      if (targetIndex === currentIndex) {
        return orderedTiles;
      }

      const reordered = [...orderedTiles];
      const [movedTile] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, movedTile);
      return remapMapTileLayerIndexes(reordered);
    });
  }, [selectedMapPlacedTileId, updateSelectedRoomBackgroundTiles]);

  const moveSelectedMapPlacedTileToEdge = useCallback((edge) => {
    if (!selectedMapPlacedTileId) {
      return;
    }

    updateSelectedRoomBackgroundTiles((currentTiles) => {
      const orderedTiles = remapMapTileLayerIndexes(currentTiles);
      const currentIndex = orderedTiles.findIndex((tile) => tile.id === selectedMapPlacedTileId);
      if (currentIndex < 0) {
        return orderedTiles;
      }

      const targetIndex = edge === 'front'
        ? Math.max(0, orderedTiles.length - 1)
        : 0;

      if (targetIndex === currentIndex) {
        return orderedTiles;
      }

      const reordered = [...orderedTiles];
      const [movedTile] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, movedTile);
      return remapMapTileLayerIndexes(reordered);
    });
  }, [selectedMapPlacedTileId, updateSelectedRoomBackgroundTiles]);

  const removeSelectedMapPlacedTile = useCallback(() => {
    if (!selectedMapPlacedTileIds.length) {
      return;
    }

    const selectedSet = new Set(selectedMapPlacedTileIds);
    updateSelectedRoomBackgroundTiles((currentTiles) => currentTiles.filter((tile) => !selectedSet.has(tile.id)));
    setSelectedMapTileSelection([]);
  }, [selectedMapPlacedTileIds, setSelectedMapTileSelection, updateSelectedRoomBackgroundTiles]);

  useEffect(() => {
    let cancelled = false;

    const loadCanvas = async () => {
      setIsLoading(true);

      try {
        const response = await teacherLevelEditorAPI.getLevelCanvas(selectedLevel);
        const canvas = response?.data?.canvas || {};

        const normalizedRoomChunkData = canvas.roomChunkData
          ? normalizeRoomChunkData(canvas.roomChunkData)
          : legacyCellBackgroundsToRoomChunk(
              canvas.cellBackgrounds || {},
              canvas.gridRows,
              canvas.gridCols,
            );

        if (cancelled) {
          return;
        }

        const autosaveKey = getAutosaveStorageKey(selectedLevel);
        let restoredDraft = null;

        if (typeof window !== 'undefined') {
          try {
            const rawDraft = window.localStorage.getItem(autosaveKey);
            if (rawDraft) {
              const parsedDraft = JSON.parse(rawDraft);
              if (parsedDraft?.schemaVersion === AUTOSAVE_SCHEMA_VERSION && parsedDraft?.roomChunkData) {
                const serverUpdatedAtMs = canvas.updatedAt ? Date.parse(canvas.updatedAt) : 0;
                const draftSavedAtMs = Number(parsedDraft.savedAt) || 0;

                if (!serverUpdatedAtMs || draftSavedAtMs > serverUpdatedAtMs) {
                  restoredDraft = parsedDraft;
                } else {
                  window.localStorage.removeItem(autosaveKey);
                }
              }
            }
          } catch (error) {
            console.warn('Unable to parse level editor autosave draft', error);
          }
        }

        const hydratedChunkData = restoredDraft?.roomChunkData
          ? normalizeRoomChunkData(restoredDraft.roomChunkData)
          : normalizedRoomChunkData;

        const firstRoomId = hydratedChunkData.rooms?.[0]?.id || null;
        const preferredRoomId = typeof restoredDraft?.selectedRoomId === 'string'
          ? restoredDraft.selectedRoomId
          : firstRoomId;
        const resolvedRoomId = hydratedChunkData.rooms.some((room) => room.id === preferredRoomId)
          ? preferredRoomId
          : firstRoomId;

        setRoomChunkData(hydratedChunkData);
        setSelectedRoomId(resolvedRoomId);
        setSelectedComponentSelection([]);
        setSelectedMapTileSelection([]);
        setWorkspaceEditMode(restoredDraft?.workspaceEditMode === 'mapTiles' ? 'mapTiles' : 'components');
        setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
        setActiveBackground(
          restoredDraft?.activeBackground
          || hydratedChunkData.rooms?.[0]?.backgroundKey
          || hydratedChunkData.settings?.backgroundKey
          || DEFAULT_LEVEL_SETTINGS.backgroundKey,
        );
        setCanvasMeta({
          id: canvas.id || null,
          updatedAt: canvas.updatedAt || null,
        });
        setIsDirty(Boolean(restoredDraft));
        if (restoredDraft) {
          toast.success('Recovered local autosave draft');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const handled = handleAPIError(error);
        toast.error(handled.message || 'Unable to load level canvas');

        const fallbackChunk = createDefaultRoomChunkData();
        setRoomChunkData(fallbackChunk);
        setSelectedRoomId(fallbackChunk.rooms?.[0]?.id || null);
        setSelectedComponentSelection([]);
        setSelectedMapTileSelection([]);
        setWorkspaceEditMode('components');
        setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
        setActiveBackground(DEFAULT_LEVEL_SETTINGS.backgroundKey);
        setCanvasMeta({ id: null, updatedAt: null });
        setIsDirty(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCanvas();

    return () => {
      cancelled = true;
    };
  }, [selectedLevel, setSelectedComponentSelection, setSelectedMapTileSelection]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || isSaving) {
      return undefined;
    }

    const autosaveKey = getAutosaveStorageKey(selectedLevel);
    const persistDraft = () => {
      if (!isDirty) {
        return;
      }

      const autosavePayload = {
        schemaVersion: AUTOSAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        selectedLevel,
        selectedRoomId,
        activeBackground,
        workspaceEditMode,
        roomChunkData,
      };

      try {
        window.localStorage.setItem(autosaveKey, JSON.stringify(autosavePayload));
      } catch (error) {
        console.warn('Unable to write level editor autosave draft', error);
      }
    };

    const intervalId = window.setInterval(persistDraft, AUTOSAVE_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeBackground, isDirty, isLoading, isSaving, roomChunkData, selectedLevel, selectedRoomId, workspaceEditMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_WARNING;
      return UNSAVED_CHANGES_WARNING;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!rooms.length) {
      setSelectedRoomId(null);
      return;
    }

    if (!selectedRoomId || !roomLookup[selectedRoomId]) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [roomLookup, rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    setActiveBackground(selectedRoom.backgroundKey || levelSettings.backgroundKey || DEFAULT_LEVEL_SETTINGS.backgroundKey);
  }, [levelSettings.backgroundKey, selectedRoom]);

  useEffect(() => {
    if (!availableLinkTargets.length) {
      setLinkDraftTargetId('');
      return;
    }

    if (!availableLinkTargets.some((room) => room.id === linkDraftTargetId)) {
      setLinkDraftTargetId(availableLinkTargets[0].id);
    }
  }, [availableLinkTargets, linkDraftTargetId]);

  useEffect(() => {
    if (mapTileSnap !== levelSettings.sharedGridSnap) {
      setMapTileSnap(levelSettings.sharedGridSnap);
    }
  }, [levelSettings.sharedGridSnap, mapTileSnap]);

  useEffect(() => {
    setPreviewRunNonce(0);
  }, [selectedLevel, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomComponents.length) {
      setSelectedComponentSelection([]);
      return;
    }

    if (!selectedComponentIds.length) {
      return;
    }

    const selectedSet = new Set(selectedRoomComponents.map((component) => component.id));
    const filteredSelection = selectedComponentIds.filter((componentId) => selectedSet.has(componentId));
    if (filteredSelection.length !== selectedComponentIds.length) {
      setSelectedComponentSelection(filteredSelection);
    }
  }, [selectedComponentIds, selectedRoomComponents, setSelectedComponentSelection]);

  useEffect(() => {
    setSelectedMapTileSelection([]);
  }, [selectedRoomId, setSelectedMapTileSelection]);

  useEffect(() => {
    if (!selectedMapPlacedTileIds.length) {
      return;
    }

    const selectedSet = new Set(selectedRoomBackgroundTiles.map((tile) => tile.id));
    const filteredSelection = selectedMapPlacedTileIds.filter((tileId) => selectedSet.has(tileId));
    if (filteredSelection.length !== selectedMapPlacedTileIds.length) {
      setSelectedMapTileSelection(filteredSelection);
    }
  }, [selectedMapPlacedTileIds, selectedRoomBackgroundTiles, setSelectedMapTileSelection]);

  const restartPreview = useCallback(() => {
    setPreviewRunNonce((previous) => previous + 1);
  }, []);

  const handleSaveCanvas = useCallback(async () => {
    try {
      setIsSaving(true);
      const roomChunkDataToSave = normalizeRoomChunkInvisiblePlatformsForEditor(roomChunkData, editorGridSize);

      const payload = {
        gridRows: roomChunkDataToSave.grid?.rows,
        gridCols: roomChunkDataToSave.grid?.cols,
        roomChunkData: roomChunkDataToSave,
        cellBackgrounds: roomChunkToLegacyCellBackgrounds(roomChunkDataToSave),
      };

      const response = await teacherLevelEditorAPI.saveLevelCanvas(selectedLevel, payload);
      const canvas = response?.data?.canvas || {};

      const normalizedRoomChunkData = canvas.roomChunkData
        ? normalizeRoomChunkData(canvas.roomChunkData)
        : legacyCellBackgroundsToRoomChunk(
            canvas.cellBackgrounds || {},
            canvas.gridRows,
            canvas.gridCols,
          );

      setRoomChunkData(normalizedRoomChunkData);
      setCanvasMeta({
        id: canvas.id || null,
        updatedAt: canvas.updatedAt || null,
      });
      setIsDirty(false);

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(getAutosaveStorageKey(selectedLevel));
        } catch (error) {
          console.warn('Unable to clear local autosave draft after save', error);
        }
      }

      if (!normalizedRoomChunkData.rooms.some((room) => room.id === selectedRoomId)) {
        setSelectedRoomId(normalizedRoomChunkData.rooms?.[0]?.id || null);
      }

      toast.success('Level canvas saved');
      return true;
    } catch (error) {
      const handled = handleAPIError(error);
      toast.error(handled.message || 'Unable to save level canvas');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editorGridSize, roomChunkData, selectedLevel, selectedRoomId]);

  const confirmDiscardUnsavedChanges = useCallback(() => {
    if (!isDirty || typeof window === 'undefined') {
      return true;
    }

    return window.confirm(UNSAVED_CHANGES_WARNING);
  }, [isDirty]);

  const handleSelectedLevelChange = useCallback((rawValue) => {
    const nextLevel = Number(rawValue);
    if (!Number.isFinite(nextLevel) || nextLevel === selectedLevel) {
      return;
    }

    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    setSelectedLevel(nextLevel);
  }, [confirmDiscardUnsavedChanges, selectedLevel]);

  const updateLevelSettings = useCallback((updater) => {
    setRoomChunkData((previous) => {
      const currentSettings = {
        ...DEFAULT_LEVEL_SETTINGS,
        ...(previous?.settings || {}),
      };

      const requestedSettings = typeof updater === 'function'
        ? updater(currentSettings)
        : {
            ...currentSettings,
            ...(updater || {}),
          };

      return normalizeRoomChunkData({
        ...previous,
        settings: requestedSettings,
      });
    });
    setIsDirty(true);
  }, []);

  const applyBackgroundToSelectedRoom = (backgroundKey) => {
    if (!selectedRoomId) {
      return;
    }

    const safeKey = typeof backgroundKey === 'string' && backgroundKey.trim()
      ? backgroundKey.trim()
      : DEFAULT_LEVEL_SETTINGS.backgroundKey;

    updateRooms((currentRooms) => currentRooms.map((room) => ({
      ...room,
      backgroundKey: room.id === selectedRoomId
        ? safeKey
        : room.backgroundKey,
    })));

    setActiveBackground(safeKey);
  };

  const applyBackgroundColorToSelectedRoom = (colorValue) => {
    if (!selectedRoomId) {
      return;
    }

    const safeColor = typeof colorValue === 'string' && /^#[0-9a-fA-F]{6}$/.test(colorValue)
      ? colorValue.toLowerCase()
      : DEFAULT_ROOM_BACKGROUND_COLOR;

    updateRooms((currentRooms) => currentRooms.map((room) => ({
      ...room,
      backgroundColor: room.id === selectedRoomId
        ? safeColor
        : (room.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR),
    })));
  };

  const buildAddRoomDraft = useCallback(() => ({
    name: `Room ${rooms.length + 1}`,
    backgroundKey: selectedRoom?.backgroundKey || activeBackground || levelSettings.backgroundKey || DEFAULT_LEVEL_SETTINGS.backgroundKey,
    backgroundColor: selectedRoom?.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR,
    includeSpawn: false,
  }), [activeBackground, levelSettings.backgroundKey, rooms.length, selectedRoom?.backgroundColor, selectedRoom?.backgroundKey]);

  const openAddRoomModal = useCallback(() => {
    setAddRoomDraft(buildAddRoomDraft());
    setIsAddRoomModalOpen(true);
  }, [buildAddRoomDraft]);

  const closeAddRoomModal = useCallback(() => {
    setIsAddRoomModalOpen(false);
  }, []);

  const createRoomFromModal = useCallback(() => {
    const safeName = typeof addRoomDraft.name === 'string' && addRoomDraft.name.trim()
      ? addRoomDraft.name.trim().slice(0, MAX_ROOM_NAME_LENGTH)
      : `Room ${rooms.length + 1}`;
    const safeBackgroundKey = typeof addRoomDraft.backgroundKey === 'string' && addRoomDraft.backgroundKey.trim()
      ? addRoomDraft.backgroundKey.trim()
      : (selectedRoom?.backgroundKey || activeBackground || levelSettings.backgroundKey || DEFAULT_LEVEL_SETTINGS.backgroundKey);
    const safeBackgroundColor = typeof addRoomDraft.backgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(addRoomDraft.backgroundColor)
      ? addRoomDraft.backgroundColor.toLowerCase()
      : (selectedRoom?.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR);

    const nextPosition = getNextRoomPosition(rooms);
    const nextRoomId = `room-${Date.now()}`;
    const nextComponents = addRoomDraft.includeSpawn
      ? [{
          id: `cmp-spawn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'spawn',
          x: 160,
          y: 560,
          health: clampNumber(levelSettings.playerHealth, 1, 10),
          allowMidairDash: levelSettings.allowMidairDash,
          allowProjectile: levelSettings.allowProjectile,
          allowDoubleJump: levelSettings.allowDoubleJump,
        }]
      : [];

    const nextRoom = {
      id: nextRoomId,
      name: safeName,
      row: nextPosition.row,
      col: nextPosition.col,
      backgroundKey: safeBackgroundKey,
      backgroundColor: safeBackgroundColor,
      links: [],
      components: nextComponents,
      portal: null,
    };

    updateRooms((currentRooms) => [...currentRooms, nextRoom]);
    setSelectedRoomId(nextRoomId);
    setIsAddRoomModalOpen(false);
    toast.success('Room created');
  }, [
    activeBackground,
    addRoomDraft.backgroundColor,
    addRoomDraft.backgroundKey,
    addRoomDraft.includeSpawn,
    addRoomDraft.name,
    levelSettings.allowDoubleJump,
    levelSettings.allowMidairDash,
    levelSettings.allowProjectile,
    levelSettings.backgroundKey,
    levelSettings.playerHealth,
    rooms,
    selectedRoom?.backgroundColor,
    selectedRoom?.backgroundKey,
    updateRooms,
  ]);

  const handleDeleteSelectedRoom = () => {
    if (!selectedRoomId) {
      return;
    }

    if (rooms.length <= 1) {
      toast.error('At least one room must remain');
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(`Delete ${selectedRoom?.name || 'this room'}?`);
      if (!confirmDelete) {
        return;
      }
    }

    const retainedRooms = rooms.filter((room) => room.id !== selectedRoomId);
    const nextSelectedRoomId = retainedRooms[Math.max(0, selectedRoomIndex - 1)]?.id || retainedRooms[0]?.id || null;

    updateRooms((currentRooms) => currentRooms
      .filter((room) => room.id !== selectedRoomId)
      .map((room) => ({
        ...room,
        links: Array.isArray(room.links)
          ? room.links.filter((link) => link.targetRoomId !== selectedRoomId)
          : [],
        portal: room.portal?.targetRoomId === selectedRoomId
          ? null
          : room.portal,
      })));

    setSelectedRoomId(nextSelectedRoomId);
  };

  const goToPreviousRoom = () => {
    if (selectedRoomIndex <= 0) {
      return;
    }
    setSelectedRoomId(rooms[selectedRoomIndex - 1]?.id || null);
  };

  const goToNextRoom = () => {
    if (selectedRoomIndex < 0 || selectedRoomIndex >= rooms.length - 1) {
      return;
    }
    setSelectedRoomId(rooms[selectedRoomIndex + 1]?.id || null);
  };

  const addRoomLink = () => {
    if (!selectedRoomId || !linkDraftTargetId) {
      return;
    }

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const links = Array.isArray(room.links) ? room.links : [];
      if (links.some((link) => link.targetRoomId === linkDraftTargetId)) {
        return room;
      }

      if (links.length >= 12) {
        toast.error('A room can only have up to 12 links');
        return room;
      }

      return {
        ...room,
        links: [...links, { targetRoomId: linkDraftTargetId, doorway: 'AUTO' }],
      };
    }));
  };

  const updateRoomLinkDoorway = (targetRoomId, doorway) => {
    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const links = Array.isArray(room.links) ? room.links : [];
      return {
        ...room,
        links: links.map((link) => (
          link.targetRoomId === targetRoomId
            ? { ...link, doorway }
            : link
        )),
      };
    }));
  };

  const removeRoomLink = (targetRoomId) => {
    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const links = Array.isArray(room.links) ? room.links : [];
      return {
        ...room,
        links: links.filter((link) => link.targetRoomId !== targetRoomId),
      };
    }));
  };

  const focusComponentInspector = useCallback((componentId) => {
    if (!componentId) {
      return;
    }

    setSelectedComponentSelection([componentId]);
    setInspectorMode('config');

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsInspectorPanelOpen(true);
    }
  }, [setSelectedComponentSelection]);

  const addComponentToSelectedRoom = (componentType, dropPoint = null, insertSize = COMPONENT_INSERT_CLICK_SIZE) => {
    if (!selectedRoomId) {
      toast.error('Select a room first');
      return;
    }

    const componentConfig = componentConfigByType[componentType];
    if (!componentConfig) {
      return;
    }

    const point = dropPoint || {
      x: Math.round(EDITOR_VIEWPORT.width * 0.5),
      y: Math.round(EDITOR_VIEWPORT.height * 0.5),
    };

    const normalizedPoint = {
      x: clampNumber(Math.round(point.x), 0, EDITOR_VIEWPORT.width),
      y: clampNumber(Math.round(point.y), 0, EDITOR_VIEWPORT.height),
    };

    let createdComponentId = '';

    updateRooms((currentRooms) => {
      return currentRooms.map((room) => {
        if (room.id !== selectedRoomId) {
          return room;
        }

        const existingComponents = Array.isArray(room.components) ? room.components : [];
        if (!componentConfig.singleton && existingComponents.length >= MAX_ROOM_COMPONENTS) {
          toast.error('This room reached the component limit');
          return room;
        }

        const triggerTextureFromMap = componentType === 'triggerPlatform'
          ? resolveMapTileKeyAtPoint(room.backgroundTiles, normalizedPoint)
          : '';

        const nextComponent = {
          id: `cmp-${componentType}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          ...withInsertedComponentSize(componentConfig.create({
            x: normalizedPoint.x,
            y: normalizedPoint.y,
            defaultTextureKey: componentType === 'triggerPlatform'
              ? (triggerTextureFromMap || defaultTriggerPlatformTextureKey)
              : defaultPlatformTextureKey,
            defaultPlayerHealth: levelSettings.playerHealth,
            defaultAllowMidairDash: levelSettings.allowMidairDash,
            defaultAllowProjectile: levelSettings.allowProjectile,
            defaultAllowDoubleJump: levelSettings.allowDoubleJump,
          }), insertSize, editorGridSize),
        };

        if (nextComponent.type !== 'spawn') {
          nextComponent.renderLayer = normalizeCharacterRenderLayer(nextComponent.renderLayer);
        }

        const nextComponents = componentConfig.singleton
          ? [...existingComponents.filter((component) => component.type !== componentType), nextComponent]
          : [...existingComponents, nextComponent];

        createdComponentId = nextComponent.id;

        return {
          ...room,
          components: nextComponents,
        };
      });
    });

    if (createdComponentId) {
      focusComponentInspector(createdComponentId);
      if (componentType === 'triggerPlatform') {
        setTriggerPlatformToolMode('paint');
      }
    }
  };

  const updateSelectedRoomComponent = useCallback((componentId, updater) => {
    if (!selectedRoomId || !componentId) {
      return;
    }

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const components = Array.isArray(room.components) ? room.components : [];
      return {
        ...room,
        components: components.map((component) => {
          if (component.id !== componentId && component._editorId !== componentId) {
            return component;
          }

          const resolvedComponent = (() => {
            if (typeof updater === 'function') {
              return updater(component);
            }

            return {
              ...component,
              ...updater,
            };
          })();

          if (!resolvedComponent || typeof resolvedComponent !== 'object') {
            return component;
          }

          if (resolvedComponent.type === 'spawn') {
            return {
              ...resolvedComponent,
            };
          }

          if (resolvedComponent.type === 'triggerPlatform') {
            return normalizeTriggerPlatformForEditor({
              ...resolvedComponent,
              renderLayer: normalizeCharacterRenderLayer(resolvedComponent.renderLayer),
            }, editorGridSize);
          }

          return {
            ...resolvedComponent,
            renderLayer: normalizeCharacterRenderLayer(resolvedComponent.renderLayer),
          };
        }),
      };
    }));
  }, [editorGridSize, selectedRoomId, updateRooms]);

  const updateSelectedPortalLinkName = useCallback((componentId, rawLinkName) => {
    if (!componentId) {
      return;
    }

    const nextLinkName = typeof rawLinkName === 'string' ? rawLinkName.trim().slice(0, 40) : '';

    if (nextLinkName) {
      const matchCount = rooms.reduce((count, room) => {
        const roomComponents = Array.isArray(room.components) ? room.components : [];
        return count + roomComponents.filter((entry) => (
          entry.id !== componentId
          && ['portal', 'portal3'].includes(entry.type)
          && typeof entry.linkName === 'string'
          && entry.linkName.trim() === nextLinkName
        )).length;
      }, 0);

      if (matchCount >= 2) {
        toast.error('A portal name can only be used by two portals in this level');
        return;
      }
    }

    updateSelectedRoomComponent(componentId, (component) => {
      if (!['portal', 'portal3'].includes(component.type)) {
        return component;
      }

      if (!nextLinkName) {
        return {
          ...component,
          linkName: '',
        };
      }

      return {
        ...component,
        linkName: nextLinkName,
      };
    });
  }, [rooms, updateSelectedRoomComponent]);

  const updateSelectedComponentPartial = useCallback((partial) => {
    if (!selectedComponent?.id || !partial || typeof partial !== 'object') {
      return;
    }

    updateSelectedRoomComponent(selectedComponent.id, partial);
  }, [selectedComponent?.id, updateSelectedRoomComponent]);

  const updateSelectedComponentWith = useCallback((updater) => {
    if (!selectedComponent?.id || typeof updater !== 'function') {
      return;
    }

    updateSelectedRoomComponent(selectedComponent.id, updater);
  }, [selectedComponent?.id, updateSelectedRoomComponent]);

  const handleTriggerPlatformCanvasAction = useCallback(({ point }) => {
    if (!selectedRoomId || selectedComponent?.type !== 'triggerPlatform' || !point || !triggerPlatformToolMode) {
      return;
    }

    const targetCell = worldPointToTriggerPlatformCell(point, {
      gridSize: editorGridSize,
      viewport: EDITOR_VIEWPORT,
    });

    if (triggerPlatformToolMode === 'set-correct-move') {
      updateSelectedRoomComponent(selectedComponent.id, {
        correctMoveTo: targetCell,
      });
      setTriggerPlatformToolMode('');
      return;
    }

    if (triggerPlatformToolMode === 'set-wrong-move') {
      updateSelectedRoomComponent(selectedComponent.id, {
        wrongMoveTo: targetCell,
      });
      setTriggerPlatformToolMode('');
      return;
    }

    const erase = triggerPlatformToolMode === 'erase';
    const selectedComponentId = selectedComponent.id;

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const components = Array.isArray(room.components) ? room.components : [];
      const nextComponents = components.flatMap((component) => {
        if (component.id !== selectedComponentId) {
          return [component];
        }

        const normalizedComponent = normalizeTriggerPlatformForEditor(component, editorGridSize);
        const currentCells = Array.isArray(normalizedComponent.cells) ? normalizedComponent.cells : [];
        const targetKey = `${targetCell.col}:${targetCell.row}`;
        const hasTargetCell = currentCells.some((cell) => `${cell.col}:${cell.row}` === targetKey);

        if (erase && currentCells.length <= 1 && hasTargetCell) {
          return [];
        }

        return [paintTriggerPlatformCell(normalizedComponent, targetCell, {
          erase,
          gridSize: editorGridSize,
          viewport: EDITOR_VIEWPORT,
        })];
      });

      return {
        ...room,
        components: nextComponents,
      };
    }));

    if (erase) {
      const currentCells = Array.isArray(selectedComponent.cells) ? selectedComponent.cells : [];
      const hasTargetCell = currentCells.some((cell) => cell.col === targetCell.col && cell.row === targetCell.row);
      if (currentCells.length <= 1 && hasTargetCell) {
        setSelectedComponentSelection([]);
        setTriggerPlatformToolMode('');
      }
    }
  }, [
    editorGridSize,
    selectedComponent,
    selectedRoomId,
    setSelectedComponentSelection,
    triggerPlatformToolMode,
    updateRooms,
    updateSelectedRoomComponent,
  ]);

  const consumeCanvasOverlayPointer = useCallback((event) => {
    event.stopPropagation();
    if (typeof event.nativeEvent?.stopImmediatePropagation === 'function') {
      event.nativeEvent.stopImmediatePropagation();
    }
  }, []);

  const consumeCanvasOverlayKey = useCallback((event) => {
    event.stopPropagation();
    if (typeof event.nativeEvent?.stopImmediatePropagation === 'function') {
      event.nativeEvent.stopImmediatePropagation();
    }
  }, []);

  const deleteSelectedComponent = useCallback(() => {
    if (!selectedRoomId || !selectedComponentIds.length) {
      return;
    }

    const selectedIdSet = new Set(selectedComponentIds);

    updateRooms((currentRooms) => currentRooms.map((room) => ({
      ...room,
      components: room.id === selectedRoomId
        ? (Array.isArray(room.components)
          ? room.components.filter((component) => !selectedIdSet.has(component.id))
          : [])
        : room.components,
    })));

    setSelectedComponentSelection([]);
    toast.success(selectedIdSet.size > 1 ? 'Components deleted' : 'Component deleted');
  }, [selectedComponentIds, selectedRoomId, setSelectedComponentSelection, updateRooms]);

  const rotateSelectedMapTileQuick = useCallback((direction = 1) => {
    if (!selectedMapPlacedTileId) {
      return;
    }

    const delta = direction < 0 ? -15 : 15;
    handleMapTileRotationChange(mapTileRotationSliderValue + delta);
  }, [handleMapTileRotationChange, mapTileRotationSliderValue, selectedMapPlacedTileId]);

  const rotateSelectedComponentQuick = useCallback((direction = 1) => {
    if (!selectedComponent?.id) {
      return;
    }

    const delta = direction < 0 ? -1 : 1;

    if (GHOST_COMPONENT_TYPES.includes(selectedComponent.type)) {
      const currentDirection = typeof selectedComponent.movementDirection === 'string'
        ? selectedComponent.movementDirection.toUpperCase()
        : 'LEFT';
      const currentIndex = GHOST_DIRECTION_OPTIONS.indexOf(currentDirection);
      const nextDirection = GHOST_DIRECTION_OPTIONS[(currentIndex + delta + GHOST_DIRECTION_OPTIONS.length) % GHOST_DIRECTION_OPTIONS.length] || 'LEFT';
      updateSelectedRoomComponent(selectedComponent.id, { movementDirection: nextDirection });
      return;
    }

    if (PROJECTILE_COMPONENT_TYPES.includes(selectedComponent.type)) {
      const nextDirection = delta < 0 ? 'LEFT' : 'RIGHT';
      updateSelectedRoomComponent(selectedComponent.id, { fireDirection: nextDirection });
      return;
    }

    toast.error('Quick rotate is available for Ghost/Slime and projectile enemies.');
  }, [selectedComponent, updateSelectedRoomComponent]);

  const flipSelectedComponentQuick = useCallback(() => {
    if (!selectedComponent?.id) {
      return;
    }

    if (GHOST_COMPONENT_TYPES.includes(selectedComponent.type)) {
      const currentDirection = typeof selectedComponent.movementDirection === 'string'
        ? selectedComponent.movementDirection.toUpperCase()
        : 'LEFT';
      const nextDirection = currentDirection === 'RIGHT' ? 'LEFT' : 'RIGHT';
      updateSelectedRoomComponent(selectedComponent.id, { movementDirection: nextDirection });
      return;
    }

    if (PROJECTILE_COMPONENT_TYPES.includes(selectedComponent.type)) {
      const nextDirection = selectedComponent.fireDirection === 'RIGHT' ? 'LEFT' : 'RIGHT';
      updateSelectedRoomComponent(selectedComponent.id, { fireDirection: nextDirection });
      return;
    }

    toast.error('Quick flip is available for Ghost/Slime and projectile enemies.');
  }, [selectedComponent, updateSelectedRoomComponent]);

  const setSelectedMapTilesRenderLayer = useCallback((layer) => {
    if (!selectedMapPlacedTileIds.length) {
      return;
    }

    const selectedIdSet = new Set(selectedMapPlacedTileIds);
    const nextLayer = normalizeCharacterRenderLayer(layer);

    updateSelectedRoomBackgroundTiles((currentTiles) => currentTiles.map((tile) => (
      selectedIdSet.has(tile.id)
        ? {
            ...tile,
            renderLayer: nextLayer,
          }
        : tile
    )));
  }, [selectedMapPlacedTileIds, updateSelectedRoomBackgroundTiles]);

  const setSelectedComponentsRenderLayer = useCallback((layer) => {
    if (!selectedRoomId || !selectedComponentIds.length) {
      return;
    }

    const selectedIdSet = new Set(selectedComponentIds);
    const nextLayer = normalizeCharacterRenderLayer(layer);

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const roomComponents = Array.isArray(room.components) ? room.components : [];

      return {
        ...room,
        components: roomComponents.map((component) => {
          if (!selectedIdSet.has(component.id) || component.type === 'spawn') {
            return component;
          }

          return {
            ...component,
            renderLayer: nextLayer,
          };
        }),
      };
    }));
  }, [selectedComponentIds, selectedRoomId, updateRooms]);

  const handleQuickResizeToggle = useCallback(() => {
    if (!canQuickResizeSelection) {
      return;
    }

    setIsQuickResizePanelOpen((previous) => !previous);
  }, [canQuickResizeSelection]);

  const handleQuickResizeSliderChange = useCallback((rawValue, commit = false) => {
    const requestedSize = Math.round(Number(rawValue) || quickResizeSliderValue);
    setQuickResizeDragValue(commit ? null : requestedSize);

    if (workspaceEditMode === 'mapTiles') {
      handleMapTileSizeSliderChange(requestedSize);
      return;
    }

    updateSelectedComponentWith((component) => applyComponentQuickResize(component, requestedSize, editorGridSize));
  }, [editorGridSize, handleMapTileSizeSliderChange, quickResizeSliderValue, updateSelectedComponentWith, workspaceEditMode]);

  const handleQuickRotateAction = useCallback((direction = 'right') => {
    const delta = direction === 'left' ? -1 : 1;

    if (workspaceEditMode === 'mapTiles') {
      rotateSelectedMapTileQuick(delta);
      return;
    }

    rotateSelectedComponentQuick(delta);
  }, [rotateSelectedComponentQuick, rotateSelectedMapTileQuick, workspaceEditMode]);

  const handleQuickFlipAction = useCallback(() => {
    if (workspaceEditMode === 'mapTiles') {
      handleMapTileFlipToggle('x');
      return;
    }

    flipSelectedComponentQuick();
  }, [flipSelectedComponentQuick, handleMapTileFlipToggle, workspaceEditMode]);

  const handleQuickLayerAction = useCallback((layer) => {
    if (workspaceEditMode === 'mapTiles') {
      setSelectedMapTilesRenderLayer(layer);
      return;
    }

    setSelectedComponentsRenderLayer(layer);
  }, [setSelectedComponentsRenderLayer, setSelectedMapTilesRenderLayer, workspaceEditMode]);

  const handleQuickDeleteAction = useCallback(() => {
    if (workspaceEditMode === 'mapTiles') {
      removeSelectedMapPlacedTile();
      return;
    }

    deleteSelectedComponent();
  }, [deleteSelectedComponent, removeSelectedMapPlacedTile, workspaceEditMode]);

  const handleLiveEngineToggle = useCallback((event) => {
    event?.preventDefault?.();
    event?.currentTarget?.blur?.();
    if (typeof document !== 'undefined') {
      document.activeElement?.blur?.();
    }

    setIsLiveEngineEnabled((previous) => {
      const next = !previous;
      setPlaymodeBootDirection(next ? 'enter' : 'exit');
      setPlaymodeBootRunNonce((current) => current + 1);
      if (next) {
        setIsPlayPreviewRuntimeReady(false);
        setPreviewRunNonce((current) => current + 1);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isPlayMode) {
      setIsPlayPreviewRuntimeReady(false);
    }
  }, [isPlayMode]);

  const openTopicModal = useCallback(() => {
    if (selectedComponent?.type !== 'statue') {
      return;
    }

    setTopicModalComponentId(selectedComponent.id);
    setTopicModalDraft({
      questionTopic: typeof selectedComponent.questionTopic === 'string'
        ? selectedComponent.questionTopic.slice(0, 140)
        : '',
      aiChoicesCount: clampNumber(Number(selectedComponent.aiChoicesCount) || 4, 2, 6),
      aiDifficulty: (() => {
        const parsed = typeof selectedComponent.aiDifficulty === 'string'
          ? selectedComponent.aiDifficulty.trim().toLowerCase()
          : '';
        return AI_DIFFICULTY_OPTIONS.includes(parsed) ? parsed : 'medium';
      })(),
      aiLanguage: typeof selectedComponent.aiLanguage === 'string' && selectedComponent.aiLanguage.trim()
        ? selectedComponent.aiLanguage.trim().slice(0, 40)
        : 'English',
      aiGradeLevel: typeof selectedComponent.aiGradeLevel === 'string'
        ? selectedComponent.aiGradeLevel.trim().slice(0, 40)
        : '',
      aiInstructions: typeof selectedComponent.aiInstructions === 'string'
        ? selectedComponent.aiInstructions.trim().slice(0, 500)
        : '',
    });

    setIsTopicModalOpen(true);
  }, [selectedComponent]);

  const closeTopicModal = useCallback(() => {
    setIsTopicModalOpen(false);
    setTopicModalComponentId('');
  }, []);

  const applyTopicModal = useCallback(() => {
    if (!topicModalComponent?.id) {
      setIsTopicModalOpen(false);
      setTopicModalComponentId('');
      return;
    }

    updateSelectedRoomComponent(topicModalComponent.id, {
      questionTopic: String(topicModalDraft.questionTopic || '').slice(0, 140),
      aiChoicesCount: clampNumber(Number(topicModalDraft.aiChoicesCount) || 4, 2, 6),
      aiDifficulty: AI_DIFFICULTY_OPTIONS.includes(String(topicModalDraft.aiDifficulty || '').toLowerCase())
        ? String(topicModalDraft.aiDifficulty || '').toLowerCase()
        : 'medium',
      aiLanguage: String(topicModalDraft.aiLanguage || 'English').trim().slice(0, 40) || 'English',
      aiGradeLevel: String(topicModalDraft.aiGradeLevel || '').trim().slice(0, 40),
      aiInstructions: String(topicModalDraft.aiInstructions || '').trim().slice(0, 500),
    });

    setSelectedComponentSelection([topicModalComponent.id]);
    setIsTopicModalOpen(false);
    setTopicModalComponentId('');
  }, [setSelectedComponentSelection, topicModalComponent, topicModalDraft, updateSelectedRoomComponent]);

  const handleRoomEditorSelectionChange = useCallback((nextSelection = []) => {
    if (!Array.isArray(nextSelection) || !nextSelection.length) {
      setSelectedComponentSelection([]);
      return;
    }

    const editorIdToComponentId = new Map();
    selectedRoomComponents.forEach((component) => {
      if (typeof component?.id === 'string' && component.id) {
        editorIdToComponentId.set(component.id, component.id);
      }
      if (typeof component?._editorId === 'string' && component._editorId) {
        editorIdToComponentId.set(component._editorId, component.id);
      }
    });

    const knownIds = nextSelection
      .map((editorId) => editorIdToComponentId.get(editorId))
      .filter((componentId) => typeof componentId === 'string' && componentId);

    if (!knownIds.length) {
      setSelectedComponentSelection([]);
      return;
    }

    setSelectedComponentSelection(knownIds);
    setInspectorMode('config');
  }, [selectedRoomComponents, setSelectedComponentSelection]);

  const handleRoomEditorMoveObjects = useCallback((changes = []) => {
    if (!selectedRoomId || !Array.isArray(changes) || !changes.length) {
      return;
    }

    const changesById = new Map(changes.map((change) => [change.editorId, change]));

    updateRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== selectedRoomId) {
        return room;
      }

      const components = Array.isArray(room.components) ? room.components : [];
      return {
        ...room,
        components: components.map((component) => {
          const change = changesById.get(component.id) || changesById.get(component._editorId);
          if (!change) {
            return component;
          }

          if (component.type === 'triggerPlatform') {
            const normalizedComponent = normalizeTriggerPlatformForEditor(component, editorGridSize);
            const bounds = getTriggerPlatformBounds(normalizedComponent.cells, { gridSize: editorGridSize });
            const nextLeft = Math.max(0, Math.round(change.x - (bounds.width / 2)));
            const nextTop = Math.max(0, Math.round(change.y - (bounds.height / 2)));
            const nextAnchor = {
              col: Math.round(nextLeft / editorGridSize),
              row: Math.round(nextTop / editorGridSize),
            };

            return normalizeTriggerPlatformForEditor({
              ...normalizedComponent,
              cells: translateTriggerPlatformCells(normalizedComponent.cells, nextAnchor, {
                gridSize: editorGridSize,
                viewport: EDITOR_VIEWPORT,
              }),
            }, editorGridSize);
          }

          if (component.type === 'invisiblePlatform') {
            return normalizeInvisiblePlatformForEditor({
              ...component,
              x: change.x,
              y: change.y,
              ...(change.width !== undefined ? { width: change.width } : {}),
              ...(change.height !== undefined ? { height: change.height } : {}),
            }, editorGridSize);
          }

          return {
            ...component,
            x: clampNumber(Math.round(change.x), 0, EDITOR_VIEWPORT.width),
            y: clampNumber(
              Math.round(change.y),
              0,
              EDITOR_VIEWPORT.height,
            ),
          };
        }),
      };
    }));

    const movedIdToComponentId = new Map();
    selectedRoomComponents.forEach((component) => {
      if (typeof component?.id === 'string' && component.id) {
        movedIdToComponentId.set(component.id, component.id);
      }
      if (typeof component?._editorId === 'string' && component._editorId) {
        movedIdToComponentId.set(component._editorId, component.id);
      }
    });
    const movedIds = changes
      .map((change) => movedIdToComponentId.get(change.editorId) || change.editorId)
      .filter((componentId) => typeof componentId === 'string' && componentId);
    if (movedIds.length) {
      setSelectedComponentSelection(movedIds);
      setInspectorMode('config');
    }
  }, [editorGridSize, selectedRoomComponents, selectedRoomId, setSelectedComponentSelection, updateRooms]);

  const handleRoomEditorResizeObject = useCallback((change) => {
    if (!change?.editorId) {
      return;
    }

    const targetComponent = selectedRoomComponents.find((component) => (
      component.id === change.editorId || component._editorId === change.editorId
    ));
    const fallbackComponentId = selectedComponentId || selectedComponentIds[0] || null;
    const targetComponentId = targetComponent?.id || fallbackComponentId;
    if (!targetComponentId) {
      return;
    }

    updateSelectedRoomComponent(targetComponentId, (component) => {
      const nextComponent = { ...component };

      if (change.x !== undefined) {
        nextComponent.x = clampNumber(Math.round(change.x), 0, EDITOR_VIEWPORT.width);
      }

      if (change.y !== undefined) {
        nextComponent.y = clampNumber(
          Math.round(change.y),
          0,
          EDITOR_VIEWPORT.height,
        );
      }

      if (nextComponent.type === 'invisiblePlatform') {
        if (change.width !== undefined) {
          nextComponent.width = change.width;
        }
        if (change.height !== undefined) {
          nextComponent.height = change.height;
        }
        return normalizeInvisiblePlatformForEditor(nextComponent, editorGridSize);
      }

      return nextComponent;
    });
  }, [editorGridSize, selectedComponentId, selectedComponentIds, selectedRoomComponents, updateSelectedRoomComponent]);

  const handleRoomEditorAddObject = useCallback((editorObjectType, point, insertSize) => {
    const mappedType = EDITOR_OBJECT_TO_TEACHER_COMPONENT_TYPE[editorObjectType];
    const componentType = mappedType || editorObjectType;

    if (!componentConfigByType[componentType]) {
      return;
    }

    addComponentToSelectedRoom(componentType, point, insertSize);
  }, [addComponentToSelectedRoom, componentConfigByType]);

  const componentsSidebarContent = (
    <div className="min-h-0 flex-1 overflow-hidden">
      {!selectedRoomId ? (
        <p className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-xs text-slate-400">
          Select a room first to add components.
        </p>
      ) : (
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-700 bg-slate-950/70 p-2">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Palette</p>
            <select
              value={paletteFilter}
              onChange={(event) => setPaletteFilter(event.target.value)}
              className="ml-auto rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-100"
            >
              {PALETTE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {filteredComponentLibrary.length === 0 ? (
              <p className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-400">
                No components match this filter.
              </p>
            ) : (
              filteredComponentLibrary.map((component) => (
                <button
                  key={component.type}
                  type="button"
                  draggable
                  onClick={() => addComponentToSelectedRoom(
                    component.type,
                    null,
                    component.type === 'statue' ? QUESTION_STATUE_DEFAULT_SIZE : COMPONENT_INSERT_CLICK_SIZE,
                  )}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy';
                    event.dataTransfer.setData('application/x-itechs-level-object', component.type);
                    event.dataTransfer.setData('application/x-itechs-insert-size', String(COMPONENT_INSERT_DRAG_SIZE));
                    event.dataTransfer.setData('text/plain', component.type);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-left transition hover:border-cyan-400 hover:bg-cyan-500/10"
                  title={`Add ${component.label}`}
                >
                  <div className="flex items-center gap-3">
                    <EntityThumbnail
                      componentType={component.type}
                      resolveComponentVisual={resolveComponentVisual}
                      animated
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-100">{component.label}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const mapTileLibrarySidebarContent = (
    <div className="min-h-0 flex-1 overflow-hidden">
      {!selectedRoomId ? (
        <p className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-xs text-slate-400">
          Select a room to pick tiles.
        </p>
      ) : (
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-700 bg-slate-950/70 p-2">
          <div className="mb-2 flex items-center gap-2">
            <Pencil className="h-3.5 w-3.5 text-emerald-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Tiles</p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="left-map-tile-category-filter">
              Category Filter
            </label>
            <select
              id="left-map-tile-category-filter"
              value={mapTileCategoryFilter}
              onChange={(event) => setMapTileCategoryFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
            >
              {MAP_TILE_CATEGORY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {selectedMapTile && (
              <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
                Active tile: <span className="font-bold">{selectedMapTile.label}</span>
              </p>
            )}
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {Object.keys(groupedMapTiles).length === 0 ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-[11px] text-slate-400">
                No tiles in this category filter.
              </p>
            ) : Object.entries(groupedMapTiles).map(([groupLabel, groupTiles]) => (
              <div key={groupLabel} className="rounded-xl border border-slate-700 bg-slate-900/50 p-2">
                <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">{groupLabel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {groupTiles.map((tile) => {
                    const isSelected = tile.key === selectedMapTile?.key;
                    return (
                      <button
                        key={tile.key}
                        type="button"
                        draggable
                        onClick={() => {
                          setSelectedMapTileKey(tile.key);
                          setSelectedMapTileSelection([]);
                          setMapTileSize(MAP_TILE_CLICK_INSERT_SIZE);
                          setMapTileRotationDeg(0);
                          setMapTileFlipX(false);
                          setMapTileFlipY(false);
                          if (mapTileToolMode === MAP_TILE_TOOL_MODES.ERASE) {
                            setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
                          }
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'copy';
                          event.dataTransfer.setData('application/x-itechs-map-tile', tile.key);
                          event.dataTransfer.setData('application/x-itechs-insert-size', String(MAP_TILE_DRAG_INSERT_SIZE));
                          event.dataTransfer.setData('text/plain', tile.key);
                        }}
                        className={`rounded-lg border p-1 transition ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500/15'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                        }`}
                        title={tile.label}
                      >
                        <img
                          src={tile.url}
                          alt={tile.label}
                          draggable={false}
                          className="h-14 w-full rounded-md object-contain"
                          style={{
                            imageRendering: 'pixelated',
                            mixBlendMode: tile.blendMode === 'screen' ? 'screen' : 'normal',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const leftSidebarPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers3 className={`h-4 w-4 ${workspaceEditMode === 'mapTiles' ? 'text-emerald-300' : 'text-cyan-300'}`} />
          <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Palette</p>
        </div>
        <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-100">
          {workspaceEditMode === 'mapTiles' ? 'Tiles' : 'Components'}
        </span>
      </div>

      {workspaceEditMode === 'mapTiles' ? mapTileLibrarySidebarContent : componentsSidebarContent}
    </div>
  );

  const inspectorPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-fuchsia-300" />
        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Inspector</p>
        <select
          value={inspectorMode}
          onChange={(event) => setInspectorMode(event.target.value)}
          className="ml-auto rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold text-slate-100"
        >
          {INSPECTOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
        {inspectorMode === 'levelSettings' ? (
          <>
            <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Room Background</p>
              <select
                value={selectedRoom?.backgroundKey || activeBackground || levelSettings.backgroundKey}
                onChange={(event) => {
                  setActiveBackground(event.target.value);
                  applyBackgroundToSelectedRoom(event.target.value);
                }}
                disabled={!selectedRoomId || isLoading}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {backgroundOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {backgroundByValue[selectedRoom?.backgroundKey || activeBackground]?.imageUrl && (
                <div className="h-20 w-full rounded-lg border border-slate-700 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundByValue[selectedRoom?.backgroundKey || activeBackground].imageUrl})` }} />
              )}
              <p className="text-[11px] text-slate-400">Applies to the currently selected room.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Gameplay Settings</p>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="level-player-health">
                  Character Health
                </label>
                <input
                  id="level-player-health"
                  type="number"
                  min={1}
                  max={10}
                  value={levelSettings.playerHealth}
                  onChange={(event) => {
                    const parsedValue = Number(event.target.value);
                    updateLevelSettings({
                      playerHealth: clampNumber(
                        Number.isFinite(parsedValue) ? parsedValue : levelSettings.playerHealth,
                        1,
                        10,
                      ),
                    });
                  }}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                />
              </div>

              <ToggleRow
                label="Enable Level Timer"
                checked={levelSettings.timerEnabled}
                onChange={(event) => updateLevelSettings({ timerEnabled: event.target.checked })}
                tooltip="Turns on a countdown timer for the level run."
              />

              <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">Character Ability Defaults</p>
                <ToggleRow
                  label="Enable Double Jump"
                  checked={levelSettings.allowDoubleJump}
                  onChange={(event) => updateLevelSettings({ allowDoubleJump: event.target.checked })}
                  tooltip="Allows one extra jump while airborne."
                />
                <ToggleRow
                  label="Enable Midair Dash"
                  checked={levelSettings.allowMidairDash}
                  onChange={(event) => updateLevelSettings({ allowMidairDash: event.target.checked })}
                  tooltip="Allows a burst dash while in the air."
                />
                <ToggleRow
                  label="Enable Projectile Attack"
                  checked={levelSettings.allowProjectile}
                  onChange={(event) => updateLevelSettings({ allowProjectile: event.target.checked })}
                  tooltip="Lets the player fire arc-bolt projectiles."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="level-timer-seconds">
                  Timer Seconds
                </label>
                <input
                  id="level-timer-seconds"
                  type="number"
                  min={10}
                  max={3600}
                  value={levelSettings.timerSeconds}
                  onChange={(event) => {
                    const parsedValue = Number(event.target.value);
                    updateLevelSettings({
                      timerSeconds: clampNumber(
                        Number.isFinite(parsedValue) ? parsedValue : levelSettings.timerSeconds,
                        10,
                        3600,
                      ),
                    });
                  }}
                  disabled={!levelSettings.timerEnabled}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-violet-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">Room Settings</p>
                  <p className="text-[11px] text-slate-400">Background color and grid sizing.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="component-room-background-color">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="component-room-background-color"
                      type="color"
                      value={selectedRoomBackgroundColor}
                      onChange={(event) => applyBackgroundColorToSelectedRoom(event.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={selectedRoomBackgroundColor}
                      onChange={(event) => applyBackgroundColorToSelectedRoom(event.target.value)}
                      maxLength={7}
                      className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="component-grid-snap-level-settings">
                    Shared Grid Snap
                  </label>
                  <select
                    id="component-grid-snap-level-settings"
                    value={mapTileSnap}
                    onChange={(event) => {
                      const nextSnap = normalizeSharedGridSnapValue(event.target.value);
                      setMapTileSnap(nextSnap);
                      updateLevelSettings({ sharedGridSnap: nextSnap });
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  >
                    {MAP_TILE_SNAP_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option > 0 ? `${option}px` : 'Off (No Snap)'}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Grid Rows
                    <input
                      type="number"
                      min={8}
                      max={80}
                      value={Number(roomChunkData?.grid?.rows) || 18}
                      onChange={(event) => updateGridDimension('rows', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Grid Cols
                    <input
                      type="number"
                      min={8}
                      max={80}
                      value={Number(roomChunkData?.grid?.cols) || 32}
                      onChange={(event) => updateGridDimension('cols', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedRoomBackgroundTiles}
                  disabled={!selectedRoomBackgroundTiles.length}
                  className="inline-flex items-center rounded-lg border border-rose-400/70 bg-rose-500/15 px-2 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Room Tiles
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Selected Component</p>
            {!selectedComponent ? (
              <p className="text-xs text-slate-400">Select a placed component in the canvas to edit it.</p>
            ) : (
              <>
                <div className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200">
                  <p className="font-semibold">{componentConfigByType[selectedComponent.type]?.label || (selectedComponent.type === 'portal3' ? 'Portal' : toDisplayLabel(selectedComponent.type))}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{selectedComponent.id}</p>
                </div>

                <ToggleRow
                  label="Enable Drag Resize Handles"
                  checked={componentResizeHandlesEnabled}
                  onChange={(event) => setComponentResizeHandlesEnabled(event.target.checked)}
                  tooltip="Lets you resize supported components directly from draggable canvas handles."
                />

                <ToggleRow
                  label="Snap To Grid While Moving"
                  checked={selectedComponent.snapToGrid !== false}
                  onChange={(event) => updateSelectedComponentPartial({ snapToGrid: event.target.checked })}
                  tooltip="Keeps movement aligned to the shared grid for this selected component."
                />

                {selectedComponent.type !== 'spawn' && (
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Character Layer
                    <select
                      value={selectedComponentRenderLayer}
                      onChange={(event) => updateSelectedComponentPartial({
                        renderLayer: normalizeCharacterRenderLayer(event.target.value),
                      })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    >
                      {CHARACTER_RENDER_LAYER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedComponent.type === 'spawn' && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="selected-spawn-size">
                      Character Size
                    </label>
                    <input
                      id="selected-spawn-size"
                      type="range"
                      min={MAP_TILE_MIN_SIZE}
                      max={MAP_TILE_MAX_SIZE}
                      step={4}
                      value={clampNumber(Number(selectedComponent.size) || COMPONENT_INSERT_CLICK_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE)}
                      onInput={(event) => updateSelectedComponentWith((component) => applyComponentQuickResize(component, event.currentTarget.value, editorGridSize))}
                      onChange={(event) => updateSelectedComponentWith((component) => applyComponentQuickResize(component, event.target.value, editorGridSize))}
                      className="w-full"
                    />
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Character Size (px)
                      <input
                        type="number"
                        min={MAP_TILE_MIN_SIZE}
                        max={MAP_TILE_MAX_SIZE}
                        step={4}
                        value={clampNumber(Number(selectedComponent.size) || COMPONENT_INSERT_CLICK_SIZE, MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE)}
                        onChange={(event) => updateSelectedComponentWith((component) => applyComponentQuickResize(component, event.target.value, editorGridSize))}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>

                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Character Health
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={clampNumber(Number(selectedComponent.health) || levelSettings.playerHealth, 1, 10)}
                        onChange={(event) => {
                          const parsedValue = Number(event.target.value);
                          updateSelectedComponentPartial({
                            health: clampNumber(
                              Number.isFinite(parsedValue)
                                ? parsedValue
                                : (Number(selectedComponent.health) || levelSettings.playerHealth),
                              1,
                              10,
                            ),
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>

                    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">Ability Toggles</p>
                      {[
                        {
                          type: 'jump',
                          label: 'Double Jump',
                          checked: selectedComponent.allowDoubleJump !== false,
                          partialKey: 'allowDoubleJump',
                          summary: `${selectedAbilityConfig.jumpHeight}px height, ${selectedAbilityConfig.jumpKeybind}`,
                        },
                        {
                          type: 'dash',
                          label: 'Dash',
                          checked: selectedComponent.allowMidairDash !== false,
                          partialKey: 'allowMidairDash',
                          summary: `${selectedAbilityConfig.dashDistance}px, ${selectedAbilityConfig.dashMode.replace('_', ' ')}, ${selectedAbilityConfig.dashKeybind}`,
                        },
                        {
                          type: 'projectile',
                          label: 'Projectile',
                          checked: selectedComponent.allowProjectile !== false,
                          partialKey: 'allowProjectile',
                          summary: `${selectedAbilityConfig.projectileDamage} dmg, ${selectedAbilityConfig.projectileBurstCount} shot, ${selectedAbilityConfig.projectileKeybind}`,
                        },
                      ].map((ability) => (
                        <div key={ability.type} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-200">
                              <input
                                type="checkbox"
                                checked={ability.checked}
                                onChange={(event) => updateSelectedComponentPartial({ [ability.partialKey]: event.target.checked })}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                              />
                              <span>{ability.label}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setAbilityModalType(ability.type)}
                              className="rounded-md border border-cyan-400/70 bg-cyan-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100 transition hover:bg-cyan-500/20"
                            >
                              Details
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{ability.summary}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedComponent.type === 'invisiblePlatform' && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Width
                      <input
                        type="number"
                        min={editorGridSize}
                        max={normalizeInvisiblePlatformDimension(EDITOR_VIEWPORT.width, {
                          gridSize: editorGridSize,
                          fallback: EDITOR_VIEWPORT.width,
                          max: EDITOR_VIEWPORT.width,
                        })}
                        step={editorGridSize}
                        value={normalizeInvisiblePlatformDimension(selectedComponent.width, {
                          gridSize: editorGridSize,
                          fallback: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
                          max: EDITOR_VIEWPORT.width,
                        })}
                        onChange={(event) => updateSelectedComponentWith((component) => (
                          normalizeInvisiblePlatformForEditor({
                            ...component,
                            width: event.target.value,
                          }, editorGridSize)
                        ))}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Height
                      <input
                        type="number"
                        min={editorGridSize}
                        max={INVISIBLE_PLATFORM_MAX_HEIGHT}
                        step={editorGridSize}
                        value={normalizeInvisiblePlatformDimension(selectedComponent.height, {
                          gridSize: editorGridSize,
                          fallback: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
                          max: INVISIBLE_PLATFORM_MAX_HEIGHT,
                        })}
                        onChange={(event) => updateSelectedComponentWith((component) => (
                          normalizeInvisiblePlatformForEditor({
                            ...component,
                            height: event.target.value,
                          }, editorGridSize)
                        ))}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <div className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Ignored Collision Sides</p>
                      <p className="mt-1 text-[11px] text-slate-400">Leave TOP off for normal standing platforms.</p>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {PASS_THROUGH_SIDE_OPTIONS.map((side) => {
                          const selectedSides = Array.isArray(selectedComponent.passThroughSides)
                            ? selectedComponent.passThroughSides
                            : [];
                          const checked = selectedSides.includes(side);

                          return (
                            <label key={side} className="flex items-center gap-2 text-xs text-slate-200">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => updateSelectedComponentWith((component) => {
                                  const currentSides = Array.isArray(component.passThroughSides)
                                    ? component.passThroughSides
                                    : [];
                                  const nextSides = event.target.checked
                                    ? [...new Set([...currentSides, side])]
                                    : currentSides.filter((entry) => entry !== side);
                                  return {
                                    ...component,
                                    passThroughSides: nextSides,
                                  };
                                })}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                              />
                              {side}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'triggerPlatform' && (
                  <>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-200">Trigger Platform</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Paint a grouped collision shape, then set how it reacts when the linked statue is answered.
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-200">Cells</p>
                          <p className="text-sm font-black text-emerald-100">{Array.isArray(selectedComponent.cells) ? selectedComponent.cells.length : 0}</p>
                        </div>
                      </div>
                    </div>

                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Trigger ID
                      <input
                        type="text"
                        value={typeof selectedComponent.triggerId === 'string' ? selectedComponent.triggerId : ''}
                        onChange={(event) => updateSelectedComponentPartial({ triggerId: event.target.value.slice(0, 80) })}
                        maxLength={80}
                        placeholder="Matches a statue Trigger ID"
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedComponent.invisible !== false}
                        onChange={(event) => updateSelectedComponentPartial({ invisible: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                      />
                      Invisible At Runtime
                    </label>

                    <div className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Ignored Collision Sides</p>
                      <p className="mt-1 text-[11px] text-slate-400">Use these like invisible platforms when only certain approach directions should pass through.</p>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {PASS_THROUGH_SIDE_OPTIONS.map((side) => {
                          const selectedSides = Array.isArray(selectedComponent.passThroughSides)
                            ? selectedComponent.passThroughSides
                            : [];
                          const checked = selectedSides.includes(side);

                          return (
                            <label key={side} className="flex items-center gap-2 text-xs text-slate-200">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => updateSelectedComponentWith((component) => {
                                  const currentSides = Array.isArray(component.passThroughSides)
                                    ? component.passThroughSides
                                    : [];
                                  const nextSides = event.target.checked
                                    ? [...new Set([...currentSides, side])]
                                    : currentSides.filter((entry) => entry !== side);
                                  return {
                                    ...component,
                                    passThroughSides: nextSides,
                                  };
                                })}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                              />
                              {side}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {[
                      {
                        key: 'correct',
                        title: 'On Correct',
                        accent: 'text-emerald-200',
                        actionKey: 'correctAction',
                        moveKey: 'correctMoveTo',
                        goThroughKey: 'correctGoThrough',
                      },
                      {
                        key: 'wrong',
                        title: 'On Wrong',
                        accent: 'text-amber-200',
                        actionKey: 'wrongAction',
                        moveKey: 'wrongMoveTo',
                        goThroughKey: 'wrongGoThrough',
                      },
                    ].map((section) => {
                      const actionValue = normalizeTriggerPlatformAction(selectedComponent[section.actionKey], 'NONE');
                      const moveTarget = selectedComponent[section.moveKey];
                      const goThroughValue = selectedComponent[section.goThroughKey] || { player: false, entities: false };

                      return (
                        <div key={section.key} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${section.accent}`}>{section.title}</p>
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                              {actionValue.replace('_', ' ')}
                            </span>
                          </div>

                          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                            Action
                            <select
                              value={actionValue}
                              onChange={(event) => updateSelectedComponentPartial({
                                [section.actionKey]: normalizeTriggerPlatformAction(event.target.value, 'NONE'),
                              })}
                              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                            >
                              {TRIGGER_PLATFORM_ACTION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>

                          {actionValue === 'MOVE' && (
                            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200">Destination Anchor</p>
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {moveTarget
                                      ? `Grid ${moveTarget.col}, ${moveTarget.row}`
                                      : 'No destination picked yet.'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTriggerPlatformToolMode(
                                    section.key === 'correct' ? 'set-correct-move' : 'set-wrong-move',
                                  )}
                                  className="rounded-lg border border-cyan-400/70 bg-cyan-500/15 px-2 py-1.5 text-[11px] font-bold text-cyan-100 transition hover:bg-cyan-500/25"
                                >
                                  Pick On Canvas
                                </button>
                              </div>
                            </div>
                          )}

                          {actionValue === 'GO_THROUGH' && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(goThroughValue.player)}
                                  onChange={(event) => updateSelectedComponentWith((component) => ({
                                    ...component,
                                    [section.goThroughKey]: {
                                      player: event.target.checked,
                                      entities: Boolean(component?.[section.goThroughKey]?.entities),
                                    },
                                  }))}
                                  className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                                />
                                Player Passes Through
                              </label>
                              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(goThroughValue.entities)}
                                  onChange={(event) => updateSelectedComponentWith((component) => ({
                                    ...component,
                                    [section.goThroughKey]: {
                                      player: Boolean(component?.[section.goThroughKey]?.player),
                                      entities: event.target.checked,
                                    },
                                  }))}
                                  className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                                />
                                Entities Pass Through
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {GHOST_COMPONENT_TYPES.includes(selectedComponent.type) && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Direction
                      <select
                        value={typeof selectedComponent.movementDirection === 'string' ? selectedComponent.movementDirection : 'LEFT'}
                        onChange={(event) => updateSelectedComponentPartial({ movementDirection: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      >
                        {GHOST_DIRECTION_OPTIONS.map((direction) => (
                          <option key={direction} value={direction}>{direction}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Patrol Distance
                      <input
                        type="number"
                        min={20}
                        max={1200}
                        value={Number(selectedComponent.patrolDistance) || 220}
                        onChange={(event) => updateSelectedComponentPartial({
                          patrolDistance: clampNumber(Number(event.target.value) || 220, 20, 1200),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Speed
                      <input
                        type="number"
                        min={10}
                        max={600}
                        value={Number(selectedComponent.speed) || 80}
                        onChange={(event) => updateSelectedComponentPartial({
                          speed: clampNumber(Number(event.target.value) || 80, 10, 600),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                  </>
                )}

                {PROJECTILE_COMPONENT_TYPES.includes(selectedComponent.type) && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Fire Direction
                      <select
                        value={selectedComponent.fireDirection === 'RIGHT' ? 'RIGHT' : 'LEFT'}
                        onChange={(event) => updateSelectedComponentPartial({ fireDirection: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      >
                        <option value="LEFT">LEFT</option>
                        <option value="RIGHT">RIGHT</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Fire Interval (ms)
                      <input
                        type="number"
                        min={300}
                        max={12000}
                        value={Number(selectedComponent.fireIntervalMs) || 1800}
                        onChange={(event) => updateSelectedComponentPartial({
                          fireIntervalMs: clampNumber(Number(event.target.value) || 1800, 300, 12000),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Projectile Speed
                      <input
                        type="number"
                        min={60}
                        max={900}
                        value={Number(selectedComponent.projectileSpeed) || 285}
                        onChange={(event) => updateSelectedComponentPartial({
                          projectileSpeed: clampNumber(Number(event.target.value) || 285, 60, 900),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Projectile Lifetime (ms)
                      <input
                        type="number"
                        min={200}
                        max={12000}
                        value={Number(selectedComponent.projectileLifetimeMs) || 2550}
                        onChange={(event) => updateSelectedComponentPartial({
                          projectileLifetimeMs: clampNumber(Number(event.target.value) || 2550, 200, 12000),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Initial Delay (ms)
                      <input
                        type="number"
                        min={0}
                        max={12000}
                        value={Number(selectedComponent.initialDelayMs) || 900}
                        onChange={(event) => updateSelectedComponentPartial({
                          initialDelayMs: clampNumber(Number(event.target.value) || 900, 0, 12000),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                  </>
                )}

                {['portal', 'portal3'].includes(selectedComponent.type) && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="selected-portal-link-name">
                      Portal Name
                    </label>
                    <input
                      id="selected-portal-link-name"
                      type="text"
                      value={typeof selectedComponent.linkName === 'string' ? selectedComponent.linkName : ''}
                      onChange={(event) => updateSelectedPortalLinkName(selectedComponent.id, event.target.value)}
                      placeholder="e.g. blue-a"
                      maxLength={40}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedComponent.locked)}
                        onChange={(event) => updateSelectedComponentPartial({ locked: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                      />
                      Locked
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedComponent.endsLevel)}
                        onChange={(event) => updateSelectedComponentPartial({ endsLevel: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                      />
                      Ends Level When Unpaired
                    </label>
                    <p className={`text-[11px] ${selectedPortalNameCount === 2 ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {selectedPortalNameCount === 0
                        ? 'Name this portal to create a teleport pair.'
                        : `${selectedPortalNameCount} portal${selectedPortalNameCount === 1 ? '' : 's'} in this level currently use this name (max 2).`}
                    </p>
                  </>
                )}

                {selectedComponent.type === 'statue' && (
                  <>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Trigger ID
                      <input
                        type="text"
                        value={typeof selectedComponent.triggerId === 'string' ? selectedComponent.triggerId : ''}
                        onChange={(event) => updateSelectedComponentPartial({ triggerId: event.target.value.slice(0, 80) })}
                        maxLength={80}
                        placeholder="e.g. cpu-statue"
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>

                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      AI Topic Setup
                      <div className="mt-1 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-[11px] normal-case tracking-normal text-slate-300">
                        <p>
                          <span className="font-semibold text-slate-100">Topic:</span>{' '}
                          {typeof selectedComponent.questionTopic === 'string' && selectedComponent.questionTopic.trim()
                            ? selectedComponent.questionTopic.trim()
                            : 'Not set'}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-slate-100">Difficulty:</span>{' '}
                          {typeof selectedComponent.aiDifficulty === 'string' && selectedComponent.aiDifficulty.trim()
                            ? selectedComponent.aiDifficulty.trim().toUpperCase()
                            : 'MEDIUM'}
                          {' · '}
                          <span className="font-semibold text-slate-100">Choices:</span>{' '}
                          {clampNumber(Number(selectedComponent.aiChoicesCount) || 4, 2, 6)}
                        </p>
                        <p className="mt-1 text-slate-400">
                          Open Set Topic to adjust AI topic, language, grade level, and custom instructions for this trigger.
                        </p>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={openTopicModal}
                      className="inline-flex items-center justify-center rounded-lg border border-cyan-400/70 bg-cyan-500/15 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-cyan-100 transition hover:bg-cyan-500/25"
                    >
                      {typeof selectedComponent.questionTopic === 'string' && selectedComponent.questionTopic.trim()
                        ? 'Edit Topic'
                        : 'Add Topic'}
                    </button>

                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Wrong Answer Damage
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={clampWholeNumber(selectedComponent.damageOnWrongAnswer, 0, 10, 1)}
                        onChange={(event) => updateSelectedComponentPartial({
                          damageOnWrongAnswer: clampWholeNumber(event.target.value, 0, 10, 0),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>

                  </>
                )}

                <button
                  type="button"
                  onClick={deleteSelectedComponent}
                  className="mt-3 w-full rounded-lg border border-rose-400/70 bg-rose-500/15 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-rose-200 transition hover:bg-rose-500/25"
                >
                  Delete Component
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const mapTilesInspectorPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-fuchsia-300" />
        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Inspector</p>
        <select
          value={inspectorMode}
          onChange={(event) => setInspectorMode(event.target.value)}
          className="ml-auto rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold text-slate-100"
        >
          {INSPECTOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {!selectedRoomId ? (
        <p className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-xs text-slate-400">
          Select a room to continue editing.
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {inspectorMode === 'levelSettings' ? (
            <>
              <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Room Background</p>
                <select
                  value={selectedRoom?.backgroundKey || activeBackground || levelSettings.backgroundKey}
                  onChange={(event) => {
                    setActiveBackground(event.target.value);
                    applyBackgroundToSelectedRoom(event.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                >
                  {backgroundOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Gameplay Settings</p>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-level-player-health">
                    Character Health
                  </label>
                  <input
                    id="map-level-player-health"
                    type="number"
                    min={1}
                    max={10}
                    value={levelSettings.playerHealth}
                    onChange={(event) => {
                      const parsedValue = Number(event.target.value);
                      updateLevelSettings({
                        playerHealth: clampNumber(
                          Number.isFinite(parsedValue) ? parsedValue : levelSettings.playerHealth,
                          1,
                          10,
                        ),
                      });
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  />
                </div>

                <ToggleRow
                  label="Enable Level Timer"
                  checked={levelSettings.timerEnabled}
                  onChange={(event) => updateLevelSettings({ timerEnabled: event.target.checked })}
                  tooltip="Turns on a countdown timer for the level run."
                />

                <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">Character Ability Defaults</p>
                  <ToggleRow
                    label="Enable Double Jump"
                    checked={levelSettings.allowDoubleJump}
                    onChange={(event) => updateLevelSettings({ allowDoubleJump: event.target.checked })}
                    tooltip="Allows one extra jump while airborne."
                  />
                  <ToggleRow
                    label="Enable Midair Dash"
                    checked={levelSettings.allowMidairDash}
                    onChange={(event) => updateLevelSettings({ allowMidairDash: event.target.checked })}
                    tooltip="Allows a burst dash while in the air."
                  />
                  <ToggleRow
                    label="Enable Projectile Attack"
                    checked={levelSettings.allowProjectile}
                    onChange={(event) => updateLevelSettings({ allowProjectile: event.target.checked })}
                    tooltip="Lets the player fire arc-bolt projectiles."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-level-timer-seconds">
                    Timer Seconds
                  </label>
                  <input
                    id="map-level-timer-seconds"
                    type="number"
                    min={10}
                    max={3600}
                    value={levelSettings.timerSeconds}
                    onChange={(event) => {
                      const parsedValue = Number(event.target.value);
                      updateLevelSettings({
                        timerSeconds: clampNumber(
                          Number.isFinite(parsedValue) ? parsedValue : levelSettings.timerSeconds,
                          10,
                          3600,
                        ),
                      });
                    }}
                    disabled={!levelSettings.timerEnabled}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-violet-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">Room Settings</p>
                    <p className="text-[11px] text-slate-400">Background color and grid sizing.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-room-background-color">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="map-room-background-color"
                        type="color"
                        value={selectedRoomBackgroundColor}
                        onChange={(event) => applyBackgroundColorToSelectedRoom(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={selectedRoomBackgroundColor}
                        onChange={(event) => applyBackgroundColorToSelectedRoom(event.target.value)}
                        maxLength={7}
                        className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-tile-snap-level-settings">
                      Shared Grid Snap
                    </label>
                    <select
                      id="map-tile-snap-level-settings"
                      value={mapTileSnap}
                      onChange={(event) => {
                        const nextSnap = normalizeSharedGridSnapValue(event.target.value);
                        setMapTileSnap(nextSnap);
                        updateLevelSettings({ sharedGridSnap: nextSnap });
                      }}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    >
                      {MAP_TILE_SNAP_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option > 0 ? `${option}px` : 'Off (No Snap)'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Grid Rows
                      <input
                        type="number"
                        min={8}
                        max={80}
                        value={Number(roomChunkData?.grid?.rows) || 18}
                        onChange={(event) => updateGridDimension('rows', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Grid Cols
                      <input
                        type="number"
                        min={8}
                        max={80}
                        value={Number(roomChunkData?.grid?.cols) || 32}
                        onChange={(event) => updateGridDimension('cols', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedRoomBackgroundTiles}
                    disabled={!selectedRoomBackgroundTiles.length}
                    className="inline-flex items-center rounded-lg border border-rose-400/70 bg-rose-500/15 px-2 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear Room Tiles
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="mb-2 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">Tile Config</p>
                  <p className="text-[11px] text-slate-400">Tools, transforms, layers, and selection.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
                      setSelectedMapTileKey('');
                    }}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                      mapTileToolMode === MAP_TILE_TOOL_MODES.SELECT
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTileToolMode(MAP_TILE_TOOL_MODES.PAINT)}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                      mapTileToolMode === MAP_TILE_TOOL_MODES.PAINT
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Brush className="h-3.5 w-3.5" />
                    Paint
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTileToolMode(MAP_TILE_TOOL_MODES.ERASE)}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                      mapTileToolMode === MAP_TILE_TOOL_MODES.ERASE
                        ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Erase
                  </button>
                </div>

                <ToggleRow
                  label="Enable Drag Resize Handle"
                  checked={mapTileResizeHandlesEnabled}
                  onChange={(event) => setMapTileResizeHandlesEnabled(event.target.checked)}
                  tooltip="Adds a draggable resize handle to the selected map tile."
                />

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-tile-size-unified">
                    Tile Size
                  </label>
                  <input
                    id="map-tile-size-unified"
                    type="range"
                    min={MAP_TILE_MIN_SIZE}
                    max={MAP_TILE_MAX_SIZE}
                    step={4}
                    value={mapTileSizeSliderValue}
                    onInput={(event) => handleMapTileSizeSliderChange(event.currentTarget.value)}
                    onChange={(event) => handleMapTileSizeSliderChange(event.target.value)}
                    className="w-full"
                  />
                  <p className="text-[11px] text-slate-400">
                    {mapTileSizeSliderValue}px
                    {selectedMapPlacedTile ? ' (selected tile)' : ' (brush)'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300" htmlFor="map-tile-rotation-unified">
                    Rotation
                  </label>
                  <input
                    id="map-tile-rotation-unified"
                    type="range"
                    min={MAP_TILE_ROTATION_MIN}
                    max={MAP_TILE_ROTATION_MAX}
                    step={1}
                    value={mapTileRotationSliderValue}
                    onChange={(event) => handleMapTileRotationChange(event.target.value)}
                    className="w-full"
                  />
                  <p className="text-[11px] text-slate-400">
                    {mapTileRotationSliderValue}deg
                    {selectedMapPlacedTile ? ' (selected tile)' : ' (brush)'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMapTileFlipToggle('x')}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                      mapTileFlipXValue
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    Flip X
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMapTileFlipToggle('y')}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                      mapTileFlipYValue
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    Flip Y
                  </button>
                </div>

                {!selectedMapPlacedTile ? (
                  <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-[11px] text-slate-400">
                    Select a tile on the canvas to edit layer order or delete it.
                  </p>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2">
                      <label className="flex items-center gap-2 text-xs text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedMapPlacedTile.snapToGrid !== false}
                          onChange={(event) => updateSelectedMapPlacedTile({ snapToGrid: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                        />
                        Snap To Grid While Moving
                      </label>
                      <p className="mt-1 text-[11px] text-slate-400">Grid stays visible either way. Turning this off allows free movement for this selected tile only.</p>
                    </div>

                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      Character Layer
                      <select
                        value={selectedMapTileRenderLayer}
                        onChange={(event) => updateSelectedMapPlacedTile({
                          renderLayer: normalizeCharacterRenderLayer(event.target.value),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      >
                        {CHARACTER_RENDER_LAYER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Layer Order</p>
                        <span className="text-[11px] font-bold text-emerald-200">
                          {normalizeMapTileZIndex(selectedMapPlacedTile.zIndex, 0)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => shiftSelectedMapPlacedTileLayer(-1)}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
                        >
                          Backward
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftSelectedMapPlacedTileLayer(1)}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
                        >
                          Forward
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedMapPlacedTileToEdge('back')}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
                        >
                          Send To Back
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedMapPlacedTileToEdge('front')}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
                        >
                          Bring To Front
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={removeSelectedMapPlacedTile}
                      className="inline-flex items-center rounded-lg border border-rose-400/70 bg-rose-500/15 px-2 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25"
                    >
                      Delete Tile
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-svh w-full overflow-hidden bg-[radial-gradient(circle_at_12%_0%,#1f2937_0%,#0b1120_35%,#020617_100%)] text-slate-100">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2 p-2 md:gap-3 md:p-3">
        <header className="rounded-2xl border border-slate-700/80 bg-slate-900/85 px-3 py-2 shadow-lg backdrop-blur md:px-4 md:py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirmDiscardUnsavedChanges()) {
                  navigate('/teacher');
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-slate-700 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5">
              <View className="h-3.5 w-3.5 text-cyan-300" />
              <select
                value={selectedLevel}
                onChange={(event) => handleSelectedLevelChange(event.target.value)}
                disabled={isSaving}
                className="rounded bg-transparent px-1 py-1 text-xs font-bold text-slate-100 outline-none sm:text-sm"
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level} style={{ color: '#000000' }}>Level {level}</option>
                ))}
              </select>
            </div>

            {!isPlayMode && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={exitMapTileEditing}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                      workspaceEditMode === 'components'
                        ? 'bg-cyan-500/25 text-cyan-100'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Components
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceEditMode('mapTiles');
                      setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
                      setSelectedMapTileKey('');
                      setSelectedMapTileSelection([]);
                      setInspectorMode('config');
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                      workspaceEditMode === 'mapTiles'
                        ? 'bg-emerald-500/25 text-emerald-100'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Map Tiles
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTutorialGuideOpen(true)}
                  className="inline-flex items-center rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  tutorial Guide
                </button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRoomsPanelOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-bold text-slate-100 lg:hidden"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Sidebar
              </button>
              <button
                type="button"
                onClick={() => setIsInspectorPanelOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-bold text-slate-100 lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Edit
              </button>

              <button
                type="button"
                onClick={handleLiveEngineToggle}
                onKeyDown={(event) => {
                  if (isPlayMode && (event.key === ' ' || event.code === 'Space' || event.key === 'Spacebar')) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                disabled={isLoading}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isPlayMode
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                    : 'border-cyan-400 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                }`}
              >
                <View className="h-3.5 w-3.5" />
                {isPlayMode ? 'Back To Edit' : 'Play Preview'}
              </button>

              <div className="hidden text-right text-xs text-slate-400 sm:block">
                <p>{isDirty ? 'Unsaved changes' : 'Synced'}</p>
                <p>{formatTimestamp(canvasMeta.updatedAt)}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleSaveCanvas();
                }}
                disabled={isLoading || isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </header>

        <section className="grid h-full min-h-0 grid-cols-1 gap-2 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:gap-3">
          <aside className="hidden min-h-0 lg:block">{leftSidebarPanel}</aside>

          <main className="flex min-h-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-2 md:p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <select
                id="editor-room-select"
                value={selectedRoomId || ''}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value || null);
                  setSelectedComponentSelection([]);
                  setSelectedMapTileSelection([]);
                }}
                disabled={isLoading || !rooms.length}
                aria-label="Select room"
                className="min-w-45 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {!rooms.length && <option value="">No rooms</option>}
                {rooms.map((room, index) => (
                  <option key={room.id} value={room.id}>{`Room ${index + 1}: ${room.name}`}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={openAddRoomModal}
                disabled={isLoading}
                title="Add room"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400 bg-emerald-500 text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedRoom}
                disabled={isLoading || !selectedRoomId}
                title="Delete selected room"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400 bg-rose-500 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-600/70 bg-slate-900/70 px-1 py-0.5">
                <button
                  type="button"
                  onClick={goToPreviousRoom}
                  disabled={isLoading || selectedRoomIndex <= 0}
                  className="rounded-lg border border-slate-600 bg-slate-800 p-1.5 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Previous Room"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="rounded-md bg-slate-800/80 px-2 py-1 text-[11px] font-bold text-slate-200">
                  {selectedRoomIndex >= 0 ? `${selectedRoomIndex + 1}/${Math.max(rooms.length, 1)}` : '--'}
                </span>
                <button
                  type="button"
                  onClick={goToNextRoom}
                  disabled={isLoading || selectedRoomIndex < 0 || selectedRoomIndex >= rooms.length - 1}
                  className="rounded-lg border border-slate-600 bg-slate-800 p-1.5 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Next Room"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {!isPlayMode && (
                <div className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-600/70 bg-slate-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isTriggerPlatformSelection) {
                        setTriggerPlatformToolMode('');
                        return;
                      }

                      if (workspaceEditMode === 'mapTiles') {
                        setMapTileToolMode(MAP_TILE_TOOL_MODES.SELECT);
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold transition ${
                      isTriggerPlatformSelection
                        ? (!triggerPlatformToolMode ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-300 hover:bg-slate-700')
                        : (workspaceEditMode !== 'mapTiles' || mapTileToolMode === MAP_TILE_TOOL_MODES.SELECT
                        ? 'bg-cyan-500/20 text-cyan-100'
                        : 'text-slate-300 hover:bg-slate-700')
                    }`}
                    title="Selection tool"
                  >
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isTriggerPlatformSelection) {
                        setTriggerPlatformToolMode('paint');
                        setInspectorMode('config');
                        return;
                      }

                      setWorkspaceEditMode('mapTiles');
                      setMapTileToolMode(MAP_TILE_TOOL_MODES.PAINT);
                      setInspectorMode('config');
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold transition ${
                      isTriggerPlatformPaintMode || (workspaceEditMode === 'mapTiles' && mapTileToolMode === MAP_TILE_TOOL_MODES.PAINT)
                        ? 'bg-emerald-500/20 text-emerald-100'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Paint tool"
                  >
                    <Brush className="h-3.5 w-3.5" />
                    Paint
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isTriggerPlatformSelection) {
                        setTriggerPlatformToolMode('erase');
                        setInspectorMode('config');
                        return;
                      }

                      setWorkspaceEditMode('mapTiles');
                      setMapTileToolMode(MAP_TILE_TOOL_MODES.ERASE);
                      setInspectorMode('config');
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold transition ${
                      isTriggerPlatformEraseMode || (workspaceEditMode === 'mapTiles' && mapTileToolMode === MAP_TILE_TOOL_MODES.ERASE)
                        ? 'bg-rose-500/20 text-rose-100'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Erase tool"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Erase
                  </button>
                </div>
              )}
            </div>

            <div ref={canvasHostRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/85">
              {isLoading ? (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#0b1222_0%,#050913_46%,#020617_100%)] p-4">
                  <div className="w-full max-w-sm rounded-2xl border border-cyan-400/30 bg-slate-950/80 px-4 py-5 shadow-[0_24px_80px_rgba(8,47,73,0.45)] backdrop-blur">
                    <div className="mb-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Preparing Workspace</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-100">Loading teacher level editor and room graph...</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-linear-to-r from-cyan-400/80 via-emerald-300/80 to-cyan-400/80" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div
                    style={{ width: `${fittedCanvasSize.width}px`, height: `${fittedCanvasSize.height}px` }}
                    className="relative max-h-full max-w-full"
                  >
                    {isPlayMode ? (
                      <GameOnePlayMode
                        key={`${selectedLevel}-${selectedRoomId || 'room'}-${previewRunNonce}`}
                        levelData={previewLevelData}
                        runtimeAssets={editorRuntimeAssets}
                        platformTileByKey={PLATFORM_TILE_BY_KEY}
                        initialShowTutorial={false}
                        showTutorialButton={false}
                        suppressPreloadUi
                        onRuntimeBootReady={() => {
                          setIsPlayPreviewRuntimeReady(true);
                        }}
                        frameClassName="h-full w-full rounded-[20px] border-slate-700/80 shadow-none"
                        canvasHostClassName="h-full w-full [&>canvas]:h-full! [&>canvas]:w-full!"
                        onLevelComplete={restartPreview}
                        onLevelFail={restartPreview}
                        onExitRequest={restartPreview}
                        resultData={null}
                        gameplayData={null}
                        isSubmitting={false}
                        canAdvanceLevel={false}
                        onRetry={restartPreview}
                        onBack={restartPreview}
                        onNextLevel={restartPreview}
                      />
                    ) : (
                      <GameOneEditorCanvas
                        className="h-full w-full rounded-[20px] border-slate-700/80 shadow-none"
                        levelData={roomEditorLevelData}
                        runtimeAssets={editorRuntimeAssets}
                        selectedCellId={roomEditorLevelData.grid.cells[0].id}
                        selectedObjectIds={roomEditorSelectedObjectIds}
                        settings={roomEditorSettings}
                        editorMode={workspaceEditMode}
                        mapTiles={selectedRoomBackgroundTilesResolved}
                        selectedMapTileIds={selectedMapPlacedTileIds}
                        selectedMapTileId={selectedMapPlacedTileId}
                        mapTileToolMode={mapTileToolMode}
                        mapTileSnap={mapTileSnap}
                        mapTileBrush={selectedMapTile ? {
                          ...selectedMapTile,
                          blendMode: toTileBlendMode(selectedMapTile.blendMode),
                        } : null}
                        mapTileBrushSize={mapTileSizeSliderValue}
                        mapTileBrushRotationDeg={mapTileRotationSliderValue}
                        mapTileBrushFlipX={mapTileFlipXValue}
                        mapTileBrushFlipY={mapTileFlipYValue}
                        showCameraHints={false}
                        showCameraControls={false}
                        allowCameraNavigation={false}
                        onSelectionChange={handleRoomEditorSelectionChange}
                        onCellSelect={() => {}}
                        onBackgroundClick={() => {}}
                        onAddCell={() => {}}
                        onAddObject={handleRoomEditorAddObject}
                        onMoveObjects={handleRoomEditorMoveObjects}
                        onResizeObject={handleRoomEditorResizeObject}
                        onMapTileAction={handleMapCanvasAction}
                        onMapTileSelect={handleMapTileSelectionChange}
                        onMapTileMove={handleMapTileMove}
                        onMapTileResize={handleMapTileResize}
                        onMapTileDrop={handleMapTileDrop}
                        onTriggerPlatformAction={handleTriggerPlatformCanvasAction}
                      />
                    )}

                    {isPlaymodeBootVisible && (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-[1.5px]">
                        <div className="w-[86%] max-w-md rounded-2xl border border-cyan-400/35 bg-slate-950/90 px-4 py-4 shadow-[0_24px_80px_rgba(2,132,199,0.35)]">
                          <div className="mb-2 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">Switching To Play Preview</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-100">{playmodeBootLabel}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-cyan-400 via-emerald-300 to-cyan-400 transition-all duration-300"
                              style={{ width: `${Math.round(playmodeBootProgress * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasCanvasQuickSelection && (
                <>
                  {isQuickResizePanelOpen && canQuickResizeSelection && quickToolsAnchor && quickToolsLayout && (
                    <div
                      className="absolute z-20 -translate-x-1/2"
                      style={{
                        left: `${quickToolsAnchor.x}px`,
                        top: `${quickToolsLayout.resizePanelTop}px`,
                      }}
                      onPointerDown={consumeCanvasOverlayPointer}
                      onPointerUp={consumeCanvasOverlayPointer}
                      onClick={consumeCanvasOverlayPointer}
                    >
                      <div className="w-70 rounded-xl border border-slate-600/70 bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">
                            {workspaceEditMode === 'mapTiles' ? 'Tile Size' : 'Component Size'}
                          </p>
                          <span className="text-xs font-bold text-emerald-200">{quickResizeSliderValue}px</span>
                        </div>
                        <input
                          type="range"
                          min={quickResizeSliderMin}
                          max={quickResizeSliderMax}
                          step={workspaceEditMode === 'components' && selectedComponent?.type === 'invisiblePlatform' ? editorGridSize : 4}
                          value={quickResizeSliderValue}
                          onInput={(event) => handleQuickResizeSliderChange(event.currentTarget.value, false)}
                          onChange={(event) => handleQuickResizeSliderChange(event.target.value, false)}
                          onPointerUp={(event) => {
                            consumeCanvasOverlayPointer(event);
                            handleQuickResizeSliderChange(event.currentTarget.value, true);
                          }}
                          onMouseUp={(event) => handleQuickResizeSliderChange(event.currentTarget.value, true)}
                          onTouchEnd={(event) => handleQuickResizeSliderChange(event.currentTarget.value, true)}
                          onBlur={(event) => handleQuickResizeSliderChange(event.currentTarget.value, true)}
                          onPointerDown={consumeCanvasOverlayPointer}
                          onClick={consumeCanvasOverlayPointer}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className="absolute z-20 -translate-x-1/2"
                    style={{
                      left: `${quickToolsAnchor?.x || Math.floor(canvasBounds.width / 2)}px`,
                      top: `${quickToolsLayout?.toolbarTop ?? Math.max(QUICK_TOOLS_EDGE_PADDING, Math.floor(canvasBounds.height / 2) - QUICK_TOOLS_TOOLBAR_HEIGHT)}px`,
                    }}
                    onPointerDown={consumeCanvasOverlayPointer}
                    onPointerUp={consumeCanvasOverlayPointer}
                    onClick={consumeCanvasOverlayPointer}
                  >
                    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-600/70 bg-slate-900/95 p-1 shadow-lg backdrop-blur">
                      <button
                        type="button"
                        onClick={handleQuickResizeToggle}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={!canQuickResizeSelection}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isQuickResizePanelOpen
                            ? 'border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                            : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                        }`}
                        title={canQuickResizeSelection ? 'Resize' : 'Resize unavailable for this selection'}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleQuickFlipAction}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={workspaceEditMode === 'components' && !canQuickFlipComponent}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Flip"
                      >
                        <FlipHorizontal2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLayerAction('back')}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={!canQuickLayerSelection}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          activeQuickRenderLayer === 'back'
                            ? 'border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                            : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                        }`}
                        title="Send Behind Character"
                      >
                        <SendToBack className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLayerAction('front')}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={!canQuickLayerSelection}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          activeQuickRenderLayer === 'front'
                            ? 'border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                            : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                        }`}
                        title="Bring In Front Of Character"
                      >
                        <BringToFront className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickRotateAction('left')}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={workspaceEditMode === 'components' && !canQuickRotateComponent}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Rotate Left"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickRotateAction('right')}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        disabled={workspaceEditMode === 'components' && !canQuickRotateComponent}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Rotate Right"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickDeleteAction}
                        onPointerDown={consumeCanvasOverlayPointer}
                        onPointerUp={consumeCanvasOverlayPointer}
                        onMouseDown={consumeCanvasOverlayPointer}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/70 bg-rose-500/20 text-rose-200 transition hover:bg-rose-500/30"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>

          <aside className="hidden min-h-0 lg:block">
            {workspaceEditMode === 'mapTiles' && !isPlayMode ? mapTilesInspectorPanel : inspectorPanel}
          </aside>
        </section>

        {isAddRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-100">Create Room</p>
                  <p className="text-xs text-slate-400">Set room label, background, and startup options.</p>
                </div>
                <button
                  type="button"
                  onClick={closeAddRoomModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  Room Label
                  <input
                    type="text"
                    maxLength={MAX_ROOM_NAME_LENGTH}
                    value={addRoomDraft.name}
                    onChange={(event) => setAddRoomDraft((previous) => ({
                      ...previous,
                      name: event.target.value.slice(0, MAX_ROOM_NAME_LENGTH),
                    }))}
                    placeholder={`Room ${rooms.length + 1}`}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  Background
                  <select
                    value={addRoomDraft.backgroundKey}
                    onChange={(event) => setAddRoomDraft((previous) => ({
                      ...previous,
                      backgroundKey: event.target.value,
                    }))}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  >
                    {backgroundOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Background Color</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={addRoomDraft.backgroundColor}
                      onChange={(event) => setAddRoomDraft((previous) => ({
                        ...previous,
                        backgroundColor: event.target.value,
                      }))}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={addRoomDraft.backgroundColor}
                      maxLength={7}
                      onChange={(event) => setAddRoomDraft((previous) => ({
                        ...previous,
                        backgroundColor: event.target.value,
                      }))}
                      className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(addRoomDraft.includeSpawn)}
                    onChange={(event) => setAddRoomDraft((previous) => ({
                      ...previous,
                      includeSpawn: event.target.checked,
                    }))}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800"
                  />
                  Add Character Spawn To New Room
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddRoomModal}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createRoomFromModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-400 bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}

        {isTutorialGuideOpen && (
          <div
            className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-950/85 p-4"
            onClick={() => setIsTutorialGuideOpen(false)}
          >
            <div
              className="w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-white">tutorial Guide</h2>
                  <p className="text-sm text-slate-400">Watch the teacher level editor walkthrough.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTutorialGuideOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                  aria-label="Close tutorial guide"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <video
                  key={TUTORIAL_GUIDE_VIDEO_PATH}
                  controls
                  preload="metadata"
                  className="max-h-[75vh] w-full rounded-2xl bg-black"
                >
                  <source src={TUTORIAL_GUIDE_VIDEO_PATH} type="video/mp4" />
                  Your browser does not support the tutorial video.
                </video>
              </div>
            </div>
          </div>
        )}

        {abilityModalType && selectedComponent?.type === 'spawn' && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
            onPointerDown={consumeCanvasOverlayPointer}
            onClick={consumeCanvasOverlayPointer}
            onKeyDown={consumeCanvasOverlayKey}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
              onPointerDown={consumeCanvasOverlayPointer}
              onClick={consumeCanvasOverlayPointer}
              onKeyDown={consumeCanvasOverlayKey}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-100">
                    {abilityModalType === 'jump' ? 'Jump Details' : (abilityModalType === 'dash' ? 'Dash Details' : 'Projectile Details')}
                  </p>
                  <p className="text-xs text-slate-400">These values are saved on the spawn point and used in play mode.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbilityModalType(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {abilityModalType === 'jump' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Jump Height (px)
                    <input
                      type="number"
                      min={40}
                      max={620}
                      step={1}
                      value={selectedAbilityConfig.jumpHeight}
                      onChange={(event) => {
                        const jumpHeight = clampNumber(Math.round(Number(event.target.value) || DEFAULT_PLAYER_ABILITY_CONFIG.jumpHeight), 40, 620);
                        updateSelectedComponentPartial({
                          jumpHeight,
                          jumpSpeed: getJumpSpeedFromHeight(jumpHeight),
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Jump Speed
                    <input
                      type="number"
                      min={180}
                      max={1400}
                      step={10}
                      value={selectedAbilityConfig.jumpSpeed}
                      onChange={(event) => updateSelectedComponentPartial({
                        jumpSpeed: clampNumber(Math.round(Number(event.target.value) || DEFAULT_PLAYER_ABILITY_CONFIG.jumpSpeed), 180, 1400),
                      })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Jump Keybind
                    <input
                      type="text"
                      maxLength={24}
                      value={selectedAbilityConfig.jumpKeybind}
                      onChange={(event) => updateSelectedComponentPartial({ jumpKeybind: event.target.value.toUpperCase().slice(0, 24) })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <ToggleRow
                    label="Allow Dash For Each Jump"
                    checked={Boolean(selectedAbilityConfig.dashResetsOnJump)}
                    onChange={(event) => updateSelectedComponentPartial({ dashResetsOnJump: event.target.checked })}
                    tooltip="When enabled, a new jump refreshes the air dash use."
                  />
                </div>
              )}

              {abilityModalType === 'dash' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Dash Mode
                    <select
                      value={selectedAbilityConfig.dashMode}
                      onChange={(event) => updateSelectedComponentPartial({ dashMode: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    >
                      {DASH_MODE_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>{mode.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Dash Keybind
                    <input
                      type="text"
                      maxLength={24}
                      value={selectedAbilityConfig.dashKeybind}
                      onChange={(event) => updateSelectedComponentPartial({ dashKeybind: event.target.value.toUpperCase().slice(0, 24) })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Dash Speed
                    <input
                      type="number"
                      min={120}
                      max={2200}
                      step={10}
                      value={selectedAbilityConfig.dashSpeed}
                      onChange={(event) => updateSelectedComponentPartial({
                        dashSpeed: clampNumber(Math.round(Number(event.target.value) || DEFAULT_PLAYER_ABILITY_CONFIG.dashSpeed), 120, 2200),
                      })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Dash Distance (px)
                    <input
                      type="number"
                      min={40}
                      max={1200}
                      step={1}
                      value={selectedAbilityConfig.dashDistance}
                      onChange={(event) => updateSelectedComponentPartial({
                        dashDistance: clampNumber(Math.round(Number(event.target.value) || DEFAULT_PLAYER_ABILITY_CONFIG.dashDistance), 40, 1200),
                      })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 sm:col-span-2">
                    Cooldown (ms)
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step={25}
                      value={selectedAbilityConfig.dashCooldownMs}
                      onChange={(event) => updateSelectedComponentPartial({
                        dashCooldownMs: clampNumber(Math.round(Number(event.target.value) || 0), 0, 5000),
                      })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                </div>
              )}

              {abilityModalType === 'projectile' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ['Damage', 'projectileDamage', 1, 20, 1],
                    ['Size (px)', 'projectileSize', 12, 160, 1],
                    ['Consecutive Projectiles', 'projectileBurstCount', 1, 8, 1],
                    ['Cooldown (ms)', 'projectileCooldownMs', 80, 5000, 25],
                    ['Projectile Speed', 'projectileSpeed', 80, 1800, 10],
                    ['Projectile Distance (px)', 'projectileDistance', 80, 2400, 10],
                  ].map(([label, key, min, max, step]) => (
                    <label key={key} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      {label}
                      <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={selectedAbilityConfig[key]}
                        onChange={(event) => updateSelectedComponentPartial({
                          [key]: clampNumber(Math.round(Number(event.target.value) || DEFAULT_PLAYER_ABILITY_CONFIG[key]), min, max),
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                      />
                    </label>
                  ))}
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 sm:col-span-2">
                    Projectile Keybind
                    <input
                      type="text"
                      maxLength={24}
                      value={selectedAbilityConfig.projectileKeybind}
                      onChange={(event) => updateSelectedComponentPartial({ projectileKeybind: event.target.value.toUpperCase().slice(0, 24) })}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAbilityModalType(null)}
                  className="rounded-lg border border-cyan-400 bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-400"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {isTopicModalOpen && topicModalComponent && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4"
            role="dialog"
            aria-modal="true"
            onPointerDown={consumeCanvasOverlayPointer}
            onClick={consumeCanvasOverlayPointer}
            onKeyDown={consumeCanvasOverlayKey}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
              onPointerDown={consumeCanvasOverlayPointer}
              onClick={consumeCanvasOverlayPointer}
              onKeyDown={consumeCanvasOverlayKey}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-100">Set Topic</p>
                  <p className="text-xs text-slate-400">Configure AI question generation for this statue.</p>
                </div>
                <button
                  type="button"
                  onClick={closeTopicModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  Question Topic (AI)
                  <input
                    type="text"
                    value={topicModalDraft.questionTopic}
                    onChange={(event) => setTopicModalDraft((previous) => ({
                      ...previous,
                      questionTopic: event.target.value.slice(0, 140),
                    }))}
                    maxLength={140}
                    placeholder="Example: loops, fractions, networking"
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  />
                </label>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Difficulty (AI)
                    <select
                      value={topicModalDraft.aiDifficulty}
                      onChange={(event) => setTopicModalDraft((previous) => ({
                        ...previous,
                        aiDifficulty: event.target.value,
                      }))}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    >
                      {AI_DIFFICULTY_OPTIONS.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>{difficulty.toUpperCase()}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Choices Count (AI)
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={clampNumber(Number(topicModalDraft.aiChoicesCount) || 4, 2, 6)}
                      onChange={(event) => setTopicModalDraft((previous) => ({
                        ...previous,
                        aiChoicesCount: clampNumber(Number(event.target.value) || 4, 2, 6),
                      }))}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Language (AI)
                    <input
                      type="text"
                      value={topicModalDraft.aiLanguage}
                      onChange={(event) => setTopicModalDraft((previous) => ({
                        ...previous,
                        aiLanguage: event.target.value.slice(0, 40),
                      }))}
                      maxLength={40}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>

                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Grade Level (AI)
                    <input
                      type="text"
                      value={topicModalDraft.aiGradeLevel}
                      onChange={(event) => setTopicModalDraft((previous) => ({
                        ...previous,
                        aiGradeLevel: event.target.value.slice(0, 40),
                      }))}
                      maxLength={40}
                      placeholder="Example: Grade 6"
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                    />
                  </label>
                </div>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  Extra Instructions (AI)
                  <textarea
                    value={topicModalDraft.aiInstructions}
                    onChange={(event) => setTopicModalDraft((previous) => ({
                      ...previous,
                      aiInstructions: event.target.value.slice(0, 500),
                    }))}
                    rows={4}
                    maxLength={500}
                    placeholder="Example: Use real-world examples and simple vocabulary."
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeTopicModal}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyTopicModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400 bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-400"
                >
                  Save Topic
                </button>
              </div>
            </div>
          </div>
        )}

        {isRoomsPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/75 p-3 lg:hidden">
            <div className="h-[80svh] w-full rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">Sidebar</p>
                <button
                  type="button"
                  onClick={() => setIsRoomsPanelOpen(false)}
                  className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold"
                >
                  Close
                </button>
              </div>
              {leftSidebarPanel}
            </div>
          </div>
        )}

        {isInspectorPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/75 p-3 lg:hidden">
            <div className="h-[86svh] w-full rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">Inspector</p>
                <button
                  type="button"
                  onClick={() => setIsInspectorPanelOpen(false)}
                  className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold"
                >
                  Close
                </button>
              </div>
              {workspaceEditMode === 'mapTiles' && !isPlayMode ? mapTilesInspectorPanel : inspectorPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherLevelEditorPage;
