const DEFAULT_ROOM_BACKGROUND_COLOR = '#111827';
const MAX_RUNTIME_TILE_SIZE = 1024;
const MAX_RUNTIME_TILE_Z_INDEX = 9999;
const MIN_RUNTIME_TILE_ROTATION = 0;
const MAX_RUNTIME_TILE_ROTATION = 359;

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

  return {
    ...rawLevelData,
    viewport,
    grid: {
      ...(rawLevelData.grid || {}),
      cells,
    },
    worldObjects: {
      ...worldObjects,
      backgroundTiles: normalizeGameOneRuntimeBackgroundTiles(worldObjects.backgroundTiles, {
        platformTileByKey,
        viewport,
      }),
    },
  };
};

export default prepareGameOneRuntimeLevelData;
