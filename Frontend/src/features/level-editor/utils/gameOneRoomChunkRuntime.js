import { normalizeRoomChunkData } from './roomChunkSchema';
import {
  INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
  INVISIBLE_PLATFORM_DEFAULT_WIDTH,
  INVISIBLE_PLATFORM_GRID_SIZE,
  INVISIBLE_PLATFORM_MAX_HEIGHT,
  normalizeInvisiblePlatformLocalFrame,
} from '../../../games/game-one/systems/invisiblePlatformGrid';
import { normalizePlayerAbilityConfig } from '../../../games/game-one/systems/playerAbilityConfig';
import {
  normalizeTriggerPlatformComponent,
  triggerPlatformCellToWorldPoint,
} from '../../../games/game-one/systems/triggerPlatformUtils';

const DEFAULT_EDITOR_VIEWPORT = Object.freeze({ width: 1296, height: 720 });
const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const DEFAULT_LEVEL_SETTINGS = Object.freeze({
  playerHealth: 3,
  timerEnabled: false,
  timerSeconds: 120,
  allowMidairDash: true,
  allowProjectile: true,
  allowDoubleJump: true,
});
const DEFAULT_CHARACTER_RENDER_LAYER = 'back';
const DEFAULT_COMPONENT_SIZE = 60;
const DEFAULT_COIN_SIZE = 36;
const DEFAULT_STATUE_SIZE = 212;
const DEFAULT_STATUE_TEXTURE_KEY = 'teacher-statue-elem12';
const DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER = 1;
const MAX_MAP_TILE_SIZE = 1024;
const MAX_MAP_TILE_Z_INDEX = 9999;
const GHOST_MOVEMENT_DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
const AI_DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

export const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export const normalizeCharacterRenderLayer = (value, fallback = DEFAULT_CHARACTER_RENDER_LAYER) => {
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

export const toTileBlendMode = (value) => (String(value || '').trim().toLowerCase() === 'screen' ? 'screen' : 'normal');

export const normalizeMapTileZIndex = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampNumber(fallback, 0, MAX_MAP_TILE_Z_INDEX);
  }

  return clampNumber(Math.round(parsed), 0, MAX_MAP_TILE_Z_INDEX);
};

export const normalizeMapTileRotation = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return clampNumber(fallback, 0, 359);
  }

  const rounded = Math.round(parsed);
  return clampNumber(((rounded % 360) + 360) % 360, 0, 359);
};

export const sortMapTilesByLayer = (tiles = []) => (Array.isArray(tiles)
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

const resolveRoomBackgroundTileTextureKeyAtPoint = (tiles = [], localX = 0, localY = 0) => {
  if (!Array.isArray(tiles) || !tiles.length) {
    return '';
  }

  const pointX = Number(localX);
  const pointY = Number(localY);
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
    return '';
  }

  for (let index = tiles.length - 1; index >= 0; index -= 1) {
    const tile = tiles[index];
    const tileTextureKey = typeof tile?.textureKey === 'string' ? tile.textureKey.trim() : '';
    if (!tileTextureKey) {
      continue;
    }

    const tileX = Number(tile?.x);
    const tileY = Number(tile?.y);
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
      continue;
    }

    const tileSize = clampNumber(toFiniteNumber(tile?.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE);
    const halfSize = tileSize * 0.5;

    if (Math.abs(pointX - tileX) <= halfSize && Math.abs(pointY - tileY) <= halfSize) {
      return tileTextureKey;
    }
  }

  return '';
};

export const toRuntimeBackgroundTileTextureKey = (roomId, tileId, index, tileKey = '') => {
  const safeRoom = typeof roomId === 'string' && roomId.trim() ? roomId.trim() : 'room';
  const safeTile = typeof tileId === 'string' && tileId.trim() ? tileId.trim() : `tile-${index + 1}`;
  const safeVariant = typeof tileKey === 'string' && tileKey.trim() ? tileKey.trim() : 'variant';
  return `room-bg-${safeRoom}-${safeTile}-${safeVariant}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
};

const isGenericStatuePrompt = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'what is the correct answer?'
    || normalized === 'solve the statue riddle.';
};

const normalizeLevelSettings = (settings = {}) => ({
  playerHealth: clampNumber(toFiniteNumber(settings.playerHealth, DEFAULT_LEVEL_SETTINGS.playerHealth), 1, 10),
  timerEnabled: Boolean(settings.timerEnabled),
  timerSeconds: clampNumber(toFiniteNumber(settings.timerSeconds, DEFAULT_LEVEL_SETTINGS.timerSeconds), 10, 3600),
  allowMidairDash: settings.allowMidairDash !== false,
  allowProjectile: settings.allowProjectile !== false,
  allowDoubleJump: settings.allowDoubleJump !== false,
});

const normalizeStatueQuestion = (component, questionId) => {
  const questionTopic = typeof component.questionTopic === 'string'
    ? component.questionTopic.trim().slice(0, 140)
    : '';
  const aiDifficultyRaw = typeof component.aiDifficulty === 'string'
    ? component.aiDifficulty.trim().toLowerCase()
    : '';
  const aiDifficulty = AI_DIFFICULTY_OPTIONS.includes(aiDifficultyRaw) ? aiDifficultyRaw : 'medium';
  const aiLanguage = typeof component.aiLanguage === 'string' && component.aiLanguage.trim()
    ? component.aiLanguage.trim().slice(0, 40)
    : 'English';
  const aiGradeLevel = typeof component.aiGradeLevel === 'string'
    ? component.aiGradeLevel.trim().slice(0, 40)
    : '';
  const aiInstructions = typeof component.aiInstructions === 'string'
    ? component.aiInstructions.trim().slice(0, 500)
    : '';
  const aiChoicesCount = clampNumber(toFiniteNumber(component.aiChoicesCount, 4), 2, 6);
  const damageOnWrongAnswer = clampNumber(
    Math.trunc(toFiniteNumber(component.damageOnWrongAnswer, DEFAULT_STATUE_DAMAGE_ON_WRONG_ANSWER)),
    0,
    10,
  );
  const teacherChoices = Array.isArray(component.choices)
    ? component.choices
      .map((choice) => (typeof choice === 'string' ? choice.trim().slice(0, 120) : ''))
      .filter(Boolean)
    : [];
  const choices = teacherChoices.length >= 2
    ? teacherChoices
    : Array.from({ length: aiChoicesCount }, (_, choiceIndex) => `Option ${choiceIndex + 1}`);
  const rawPrompt = typeof component.prompt === 'string' && component.prompt.trim()
    ? component.prompt.trim().slice(0, 240)
    : 'Solve the statue riddle.';
  const prompt = questionTopic && isGenericStatuePrompt(rawPrompt)
    ? `Question about ${questionTopic}`.slice(0, 240)
    : rawPrompt;

  return {
    question: {
      id: questionId,
      topic: questionTopic || null,
      prompt,
      choices,
      answerIndex: clampNumber(toFiniteNumber(component.correctAnswerIndex, 0), 0, Math.max(0, choices.length - 1)),
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
    },
    runtimeFields: {
      questionTopic,
      aiChoicesCount,
      aiDifficulty,
      aiLanguage,
      aiGradeLevel,
      aiInstructions,
      damageOnWrongAnswer,
    },
  };
};

const createQuestionIdResolver = () => {
  const usedQuestionIds = new Set();

  return (candidateId, fallbackBase) => {
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
};

const getEditorIdentity = (component, includeEditorIds) => {
  if (!includeEditorIds) {
    return {};
  }

  const editorId = typeof component?._editorId === 'string' && component._editorId.trim()
    ? component._editorId.trim()
    : (typeof component?.id === 'string' && component.id.trim() ? component.id.trim() : '');

  return editorId ? { _editorId: editorId } : {};
};

export const buildGameOneLevelDataFromRoomChunk = ({
  roomChunkData,
  selectedRoomId = '',
  levelNumber = 1,
  activeBackground = 'tutorialGrove',
  defaultPlatformTextureKey = 'grass',
  platformTileByKey = {},
  viewport = DEFAULT_EDITOR_VIEWPORT,
  includeDebugInvisibleCollision = false,
  includeEditorIds = false,
  snapGridSize = INVISIBLE_PLATFORM_GRID_SIZE,
} = {}) => {
  const normalizedRoomChunkData = normalizeRoomChunkData(roomChunkData);
  const rooms = Array.isArray(normalizedRoomChunkData?.rooms) ? normalizedRoomChunkData.rooms : [];
  const orderedRooms = [...rooms].sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    return left.col - right.col;
  });
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || orderedRooms[0] || null;
  const selectedRoomComponents = Array.isArray(selectedRoom?.components) ? selectedRoom.components : [];
  const fallbackRoom = selectedRoom || orderedRooms[0] || null;
  const fallbackOffsetX = toFiniteNumber(fallbackRoom?.col, 0) * viewport.width;
  const fallbackOffsetY = toFiniteNumber(fallbackRoom?.row, 0) * viewport.height;
  const levelSettings = normalizeLevelSettings(normalizedRoomChunkData?.settings);
  const selectedRoomSpawn = selectedRoomComponents.find((component) => component.type === 'spawn');
  const resolvedCharacterHealth = clampNumber(
    toFiniteNumber(selectedRoomSpawn?.health, levelSettings.playerHealth),
    1,
    10,
  );
  const resolvedAllowMidairDash = selectedRoomSpawn?.allowMidairDash !== false
    && levelSettings.allowMidairDash !== false;
  const resolvedAllowProjectile = selectedRoomSpawn?.allowProjectile !== false
    && levelSettings.allowProjectile !== false;
  const resolvedAllowDoubleJump = selectedRoomSpawn?.allowDoubleJump !== false
    && levelSettings.allowDoubleJump !== false;
  const resolveQuestionId = createQuestionIdResolver();
  const questionIdByTriggerId = new Map();

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

  orderedRooms.forEach((room) => {
    const offsetX = toFiniteNumber(room.col, 0) * viewport.width;
    const offsetY = toFiniteNumber(room.row, 0) * viewport.height;
    const roomComponents = Array.isArray(room.components) ? room.components : [];

    roomComponents.forEach((component, index) => {
      if (component.type !== 'statue') {
        return;
      }

      const componentId = `${room.id}-${component.id || `statue-${index + 1}`}`;
      const rawTriggerId = typeof component.triggerId === 'string' && component.triggerId.trim()
        ? component.triggerId.trim()
        : (typeof component.questionId === 'string' ? component.questionId.trim() : '');
      const questionId = resolveQuestionId(rawTriggerId, `statue-${componentId}`);
      const { question, runtimeFields } = normalizeStatueQuestion(component, questionId);
      questions.push(question);
      if (rawTriggerId) {
        questionIdByTriggerId.set(rawTriggerId, questionId);
      }

      worldObjects.villain.push({
        ...getEditorIdentity(component, includeEditorIds),
        id: componentId,
        x: toFiniteNumber(component.x, 640) + offsetX,
        y: toFiniteNumber(component.y, 520) + offsetY,
        renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
        size: clampNumber(toFiniteNumber(component.size, DEFAULT_STATUE_SIZE), 16, MAX_MAP_TILE_SIZE),
        textureKey: typeof component.textureKey === 'string' && component.textureKey.trim()
          ? component.textureKey.trim()
          : DEFAULT_STATUE_TEXTURE_KEY,
        questionId,
        ...runtimeFields,
        appearance: 'STATUE',
        interactionLabel: 'statue',
      });
    });
  });

  if (selectedRoomSpawn) {
    worldObjects.spawn = {
      ...getEditorIdentity(selectedRoomSpawn, includeEditorIds),
      x: toFiniteNumber(selectedRoomSpawn.x, 160) + fallbackOffsetX,
      y: toFiniteNumber(selectedRoomSpawn.y, 560) + fallbackOffsetY,
      size: clampNumber(toFiniteNumber(selectedRoomSpawn.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE),
      health: resolvedCharacterHealth,
      allowMidairDash: resolvedAllowMidairDash,
      allowProjectile: resolvedAllowProjectile,
      allowDoubleJump: resolvedAllowDoubleJump,
      ...normalizePlayerAbilityConfig(selectedRoomSpawn),
    };
  }

  orderedRooms.forEach((room) => {
    const offsetX = toFiniteNumber(room.col, 0) * viewport.width;
    const offsetY = toFiniteNumber(room.row, 0) * viewport.height;
    const roomComponents = Array.isArray(room.components) ? room.components : [];
    const roomRuntimeBackgroundTiles = [];

    sortMapTilesByLayer(room.backgroundTiles).forEach((tile, tileIndex) => {
      const visual = platformTileByKey[tile.tileKey];
      if (!visual?.url) {
        return;
      }

      const tileId = typeof tile.id === 'string' && tile.id.trim()
        ? tile.id.trim().slice(0, 120)
        : `tile-${tileIndex + 1}`;

      const localTileX = clampNumber(toFiniteNumber(tile.x, 640), 0, viewport.width * 80);
      const localTileY = clampNumber(toFiniteNumber(tile.y, 360), 0, viewport.height * 80);
      const runtimeTextureKey = toRuntimeBackgroundTileTextureKey(room.id, tileId, tileIndex, tile.tileKey);
      const runtimeTileBase = {
        id: `${room.id}-${tileId}`.slice(0, 120),
        tileKey: tile.tileKey,
        textureKey: runtimeTextureKey,
        imageUrl: visual.url,
        renderLayer: normalizeCharacterRenderLayer(tile.renderLayer),
        size: clampNumber(toFiniteNumber(tile.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE),
        zIndex: normalizeMapTileZIndex(tile.zIndex, tileIndex),
        rotationDeg: normalizeMapTileRotation(tile.rotationDeg, 0),
        flipX: Boolean(tile.flipX),
        flipY: Boolean(tile.flipY),
        blendMode: toTileBlendMode(visual.blendMode),
      };

      roomRuntimeBackgroundTiles.push({
        ...runtimeTileBase,
        x: localTileX,
        y: localTileY,
      });

      worldObjects.backgroundTiles.push({
        ...(includeEditorIds ? { _editorId: tileId } : {}),
        ...runtimeTileBase,
        x: localTileX + offsetX,
        y: localTileY + offsetY,
      });
    });

    roomComponents.forEach((component, index) => {
      if (component.type === 'statue') {
        return;
      }

      const componentId = `${room.id}-${component.id || `component-${index + 1}`}`;

      if (component.type === 'spawn') {
        return;
      }

      if (component.type === 'invisiblePlatform') {
        const frame = normalizeInvisiblePlatformLocalFrame(component, {
          gridSize: snapGridSize,
          viewport,
          maxHeight: INVISIBLE_PLATFORM_MAX_HEIGHT,
        });
        worldObjects.invisiblePlatforms.push({
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          x: frame.x + offsetX,
          y: frame.y + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          width: frame.width || INVISIBLE_PLATFORM_DEFAULT_WIDTH,
          height: frame.height || INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
          textureKey: component.textureKey || defaultPlatformTextureKey,
          invisible: true,
          collisionMode: 'SOLID',
          passThroughSides: Array.isArray(component.passThroughSides) ? component.passThroughSides : [],
        });
        return;
      }

      if (component.type === 'triggerPlatform') {
        const normalizedTriggerPlatform = normalizeTriggerPlatformComponent(component, {
          gridSize: snapGridSize,
          viewport,
        });
        const linkedQuestionId = questionIdByTriggerId.get(normalizedTriggerPlatform.triggerId)
          || normalizedTriggerPlatform.triggerId;
        const resolveConfiguredTriggerTextureKey = (value) => {
          const rawValue = typeof value === 'string' ? value.trim() : '';
          if (!rawValue) {
            return '';
          }

          if (roomRuntimeBackgroundTiles.some((tile) => tile.textureKey === rawValue)) {
            return rawValue;
          }

          const matchingTile = roomRuntimeBackgroundTiles.find((tile) => tile.tileKey === rawValue);
          if (matchingTile?.textureKey) {
            return matchingTile.textureKey;
          }

          return rawValue;
        };
        const inferTriggerTextureKeyFromCells = () => {
          const countsByTextureKey = new Map();

          (normalizedTriggerPlatform.cells || []).forEach((cell) => {
            const point = triggerPlatformCellToWorldPoint(cell, { gridSize: snapGridSize });
            const textureKey = resolveRoomBackgroundTileTextureKeyAtPoint(roomRuntimeBackgroundTiles, point.x, point.y);
            if (!textureKey) {
              return;
            }

            countsByTextureKey.set(textureKey, (countsByTextureKey.get(textureKey) || 0) + 1);
          });

          let bestTextureKey = '';
          let bestCount = 0;
          countsByTextureKey.forEach((count, textureKey) => {
            if (count > bestCount) {
              bestCount = count;
              bestTextureKey = textureKey;
            }
          });

          return bestTextureKey;
        };

        const inferredTriggerTextureKey = inferTriggerTextureKeyFromCells();
        const untriggeredTileKey = resolveConfiguredTriggerTextureKey(normalizedTriggerPlatform.untriggeredTileKey)
          || inferredTriggerTextureKey;
        const triggeredTileKey = resolveConfiguredTriggerTextureKey(normalizedTriggerPlatform.triggeredTileKey)
          || inferredTriggerTextureKey;

        worldObjects.triggerPlatforms.push({
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          x: toFiniteNumber(normalizedTriggerPlatform.x, 640) + offsetX,
          y: toFiniteNumber(normalizedTriggerPlatform.y, 520) + offsetY,
          width: toFiniteNumber(normalizedTriggerPlatform.width, snapGridSize),
          height: toFiniteNumber(normalizedTriggerPlatform.height, snapGridSize),
          cellSize: snapGridSize,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          invisible: normalizedTriggerPlatform.invisible === true
            && !(untriggeredTileKey || triggeredTileKey),
          passThroughSides: Array.isArray(normalizedTriggerPlatform.passThroughSides)
            ? normalizedTriggerPlatform.passThroughSides
            : [],
          questionId: linkedQuestionId,
          triggerId: normalizedTriggerPlatform.triggerId,
          untriggeredTileKey,
          triggeredTileKey,
          correctAction: normalizedTriggerPlatform.correctAction || 'NONE',
          wrongAction: normalizedTriggerPlatform.wrongAction || 'NONE',
          correctGoThrough: normalizedTriggerPlatform.correctGoThrough || { player: false, entities: false },
          wrongGoThrough: normalizedTriggerPlatform.wrongGoThrough || { player: false, entities: false },
          correctMoveTo: normalizedTriggerPlatform.correctMoveTo
            ? (() => {
                const point = triggerPlatformCellToWorldPoint(normalizedTriggerPlatform.correctMoveTo, { gridSize: snapGridSize });
                return { x: point.x + offsetX, y: point.y + offsetY };
              })()
            : null,
          wrongMoveTo: normalizedTriggerPlatform.wrongMoveTo
            ? (() => {
                const point = triggerPlatformCellToWorldPoint(normalizedTriggerPlatform.wrongMoveTo, { gridSize: snapGridSize });
                return { x: point.x + offsetX, y: point.y + offsetY };
              })()
            : null,
          cells: (normalizedTriggerPlatform.cells || []).map((cell) => {
            const point = triggerPlatformCellToWorldPoint(cell, { gridSize: snapGridSize });
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
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          x: toFiniteNumber(component.x, 640) + offsetX,
          y: toFiniteNumber(component.y, 420) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampNumber(toFiniteNumber(component.size, DEFAULT_COIN_SIZE), 16, MAX_MAP_TILE_SIZE),
        });
        return;
      }

      if (['ghost', 'slimeGreen', 'slimeOrange'].includes(component.type)) {
        const enemyType = component.type === 'slimeGreen'
          ? 'slimegreen'
          : (component.type === 'slimeOrange' ? 'slimeorange' : normalizeGhostEnemyType(component.enemyType, 'ghost'));
        const defaultSpeed = enemyType === 'slimegreen'
          ? 72
          : (enemyType === 'slimeorange' ? 80 : 80);
        const movementDirection = typeof component.movementDirection === 'string'
          ? component.movementDirection.toUpperCase()
          : '';

        worldObjects.ghosts.push({
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          x: toFiniteNumber(component.x, 640) + offsetX,
          y: toFiniteNumber(component.y, 592) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampNumber(toFiniteNumber(component.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE),
          patrolDistance: toFiniteNumber(component.patrolDistance, 220),
          speed: toFiniteNumber(component.speed, defaultSpeed),
          enemyType,
          movementDirection: GHOST_MOVEMENT_DIRECTIONS.includes(movementDirection) ? movementDirection : 'LEFT',
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
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          enemyType,
          x: toFiniteNumber(component.x, 920) + offsetX,
          y: toFiniteNumber(component.y, 556) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampNumber(toFiniteNumber(component.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE),
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
          ...getEditorIdentity(component, includeEditorIds),
          id: componentId,
          x: toFiniteNumber(component.x, 1135) + offsetX,
          y: toFiniteNumber(component.y, 556) + offsetY,
          renderLayer: normalizeCharacterRenderLayer(component.renderLayer),
          size: clampNumber(toFiniteNumber(component.size, DEFAULT_COMPONENT_SIZE), 16, MAX_MAP_TILE_SIZE),
          locked: Boolean(component.locked),
          endsLevel: Boolean(component.endsLevel),
          linkName: typeof component.linkName === 'string' ? component.linkName.trim().slice(0, 40) : '',
          variant: 'portal3',
        });
      }
    });

  });

  if (!worldObjects.spawn) {
    worldObjects.spawn = {
      x: fallbackOffsetX + 160,
      y: fallbackOffsetY + 560,
      size: DEFAULT_COMPONENT_SIZE,
      health: resolvedCharacterHealth,
      allowMidairDash: resolvedAllowMidairDash,
      allowProjectile: resolvedAllowProjectile,
      allowDoubleJump: resolvedAllowDoubleJump,
      ...normalizePlayerAbilityConfig({}),
    };
  }

  const cells = orderedRooms.length
    ? orderedRooms.map((room) => ({
      id: room.id,
      col: toFiniteNumber(room.col, 0),
      row: toFiniteNumber(room.row, 0),
      backgroundKey: room.backgroundKey || activeBackground,
      backgroundColor: room.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR,
      objective: `Previewing ${room.name || room.id}`,
      postUnlockObjective: '',
    }))
    : [{
      id: selectedRoom?.id || 'room-1',
      col: 0,
      row: 0,
      backgroundKey: selectedRoom?.backgroundKey || activeBackground,
      backgroundColor: selectedRoom?.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR,
      objective: `Previewing ${selectedRoom?.name || 'room'}`,
      postUnlockObjective: '',
    }];

  return {
    version: 2,
    id: `teacher-preview-${levelNumber}-${selectedRoom?.id || 'room'}`,
    gameType: 'GAME_ONE',
    levelNumber: Number(levelNumber) || 1,
    title: selectedRoom?.name || `Level ${levelNumber}`,
    subtitle: 'Teacher Workspace Preview',
    viewport: { ...viewport },
    settings: {
      playerHealth: resolvedCharacterHealth,
      timerEnabled: levelSettings.timerEnabled,
      timerSeconds: levelSettings.timerSeconds,
      allowMidairDash: resolvedAllowMidairDash,
      allowProjectile: resolvedAllowProjectile,
      allowDoubleJump: resolvedAllowDoubleJump,
      debugInvisibleCollision: Boolean(includeDebugInvisibleCollision),
      showPreloadUi: false,
    },
    questions,
    grid: {
      cells,
    },
    worldObjects,
  };
};

export const buildGameOneSelectedRoomEditorLevelData = ({
  roomChunkData,
  selectedRoomId = '',
  levelNumber = 1,
  activeBackground = 'tutorialGrove',
  defaultPlatformTextureKey = 'grass',
  platformTileByKey = {},
  viewport = DEFAULT_EDITOR_VIEWPORT,
  snapGridSize = INVISIBLE_PLATFORM_GRID_SIZE,
} = {}) => {
  const normalizedRoomChunkData = normalizeRoomChunkData(roomChunkData);
  const rooms = Array.isArray(normalizedRoomChunkData?.rooms) ? normalizedRoomChunkData.rooms : [];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0] || null;
  const editorRoom = selectedRoom
    ? {
        ...selectedRoom,
        row: 0,
        col: 0,
      }
    : null;

  const levelData = buildGameOneLevelDataFromRoomChunk({
    roomChunkData: {
      ...normalizedRoomChunkData,
      rooms: editorRoom ? [editorRoom] : [],
    },
    selectedRoomId: editorRoom?.id || '',
    levelNumber,
    activeBackground,
    defaultPlatformTextureKey,
    platformTileByKey,
    viewport,
    includeEditorIds: true,
    snapGridSize,
  });

  const cell = levelData.grid?.cells?.[0] || {};

  return {
    ...levelData,
    id: `teacher-room-editor-${levelNumber}-${selectedRoom?.id || 'room'}`,
    title: selectedRoom?.name || `Level ${levelNumber}`,
    subtitle: 'Teacher Room Entity Editor',
    grid: {
      cells: [
        {
          ...cell,
          id: selectedRoom?.id || cell.id || 'room-1',
          col: 0,
          row: 0,
          backgroundKey: selectedRoom?.backgroundKey || activeBackground,
          backgroundColor: selectedRoom?.backgroundColor || DEFAULT_ROOM_BACKGROUND_COLOR,
          objective: `Editing ${selectedRoom?.name || 'room'}`,
          postUnlockObjective: '',
        },
      ],
    },
  };
};
