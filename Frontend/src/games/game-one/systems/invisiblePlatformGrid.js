export const INVISIBLE_PLATFORM_GRID_SIZE = 40;
export const INVISIBLE_PLATFORM_DEFAULT_WIDTH = INVISIBLE_PLATFORM_GRID_SIZE * 4;
export const INVISIBLE_PLATFORM_DEFAULT_HEIGHT = INVISIBLE_PLATFORM_GRID_SIZE;
export const INVISIBLE_PLATFORM_MAX_HEIGHT = 360;

const DEFAULT_VIEWPORT = Object.freeze({ width: 1280, height: 720 });

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveGridSize = (gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => {
  const parsed = Number(gridSize);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(1, Math.round(parsed))
    : INVISIBLE_PLATFORM_GRID_SIZE;
};

const resolveViewport = (viewport = DEFAULT_VIEWPORT) => ({
  width: Math.max(1, Math.round(toFiniteNumber(viewport?.width, DEFAULT_VIEWPORT.width))),
  height: Math.max(1, Math.round(toFiniteNumber(viewport?.height, DEFAULT_VIEWPORT.height))),
});

const floorToGrid = (value, gridSize) => (
  Math.floor(Math.max(0, toFiniteNumber(value, 0)) / gridSize) * gridSize
);

export const snapInvisiblePlatformValue = (value, gridSize = INVISIBLE_PLATFORM_GRID_SIZE) => {
  const resolvedGridSize = resolveGridSize(gridSize);
  return Math.round(toFiniteNumber(value, 0) / resolvedGridSize) * resolvedGridSize;
};

export const normalizeInvisiblePlatformDimension = (
  value,
  {
    gridSize = INVISIBLE_PLATFORM_GRID_SIZE,
    fallback = INVISIBLE_PLATFORM_DEFAULT_WIDTH,
    max = DEFAULT_VIEWPORT.width,
  } = {},
) => {
  const resolvedGridSize = resolveGridSize(gridSize);
  const rawMax = Math.max(resolvedGridSize, Math.round(toFiniteNumber(max, DEFAULT_VIEWPORT.width)));
  const resolvedMax = Math.max(
    resolvedGridSize,
    Math.floor(rawMax / resolvedGridSize) * resolvedGridSize,
  );
  const fallbackValue = Math.max(resolvedGridSize, toFiniteNumber(fallback, resolvedGridSize));
  const rawValue = toFiniteNumber(value, fallbackValue);
  const snappedValue = snapInvisiblePlatformValue(rawValue, resolvedGridSize);

  return clampNumber(
    snappedValue > 0 ? snappedValue : snapInvisiblePlatformValue(fallbackValue, resolvedGridSize),
    resolvedGridSize,
    resolvedMax,
  );
};

export const normalizeInvisiblePlatformLocalFrame = (
  platform = {},
  {
    gridSize = INVISIBLE_PLATFORM_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
    maxWidth = null,
    maxHeight = null,
    allowOutOfBoundsY = false,
    yMin = -20000,
    yMax = 20000,
  } = {},
) => {
  const resolvedGridSize = resolveGridSize(gridSize);
  const resolvedViewport = resolveViewport(viewport);
  const width = normalizeInvisiblePlatformDimension(platform.width, {
    gridSize: resolvedGridSize,
    fallback: INVISIBLE_PLATFORM_DEFAULT_WIDTH,
    max: maxWidth ?? resolvedViewport.width,
  });
  const height = normalizeInvisiblePlatformDimension(platform.height, {
    gridSize: resolvedGridSize,
    fallback: INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
    max: maxHeight ?? resolvedViewport.height,
  });

  const fallbackX = width / 2;
  const fallbackY = height / 2;
  const rawLeft = toFiniteNumber(platform.x, fallbackX) - (width / 2);
  const rawTop = toFiniteNumber(platform.y, fallbackY) - (height / 2);
  const maxLeft = floorToGrid(resolvedViewport.width - width, resolvedGridSize);
  const maxTop = floorToGrid(resolvedViewport.height - height, resolvedGridSize);
  const left = clampNumber(
    snapInvisiblePlatformValue(rawLeft, resolvedGridSize),
    0,
    maxLeft,
  );
  const top = allowOutOfBoundsY
    ? clampNumber(
        snapInvisiblePlatformValue(rawTop, resolvedGridSize),
        Math.round(toFiniteNumber(yMin, -20000)),
        Math.round(toFiniteNumber(yMax, 20000)),
      )
    : clampNumber(
        snapInvisiblePlatformValue(rawTop, resolvedGridSize),
        0,
        maxTop,
      );

  return {
    x: left + (width / 2),
    y: top + (height / 2),
    width,
    height,
  };
};

export const normalizeInvisiblePlatformComponent = (
  component = {},
  options = {},
) => ({
  ...component,
  ...normalizeInvisiblePlatformLocalFrame(component, options),
});
