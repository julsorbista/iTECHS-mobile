  export const TRIGGER_PLATFORM_DEFAULT_GRID_SIZE = 48;
export const TRIGGER_PLATFORM_ACTIONS = Object.freeze(['NONE', 'MOVE', 'GO_THROUGH']);

const DEFAULT_VIEWPORT = Object.freeze({
  width: 1296,
  height: 720,
});

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

export const resolveTriggerPlatformGridSize = (gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE) => {
  const parsed = Math.round(toFiniteNumber(gridSize, TRIGGER_PLATFORM_DEFAULT_GRID_SIZE));
  return Math.max(1, parsed || TRIGGER_PLATFORM_DEFAULT_GRID_SIZE);
};

export const resolveTriggerPlatformViewport = (viewport = DEFAULT_VIEWPORT) => ({
  width: Math.max(1, Math.round(toFiniteNumber(viewport?.width, DEFAULT_VIEWPORT.width))),
  height: Math.max(1, Math.round(toFiniteNumber(viewport?.height, DEFAULT_VIEWPORT.height))),
});

const normalizeTriggerPlatformCellValue = (value, maxValue) => clampNumber(
  Math.round(toFiniteNumber(value, 0)),
  0,
  Math.max(0, maxValue),
);

export const normalizeTriggerPlatformAction = (value, fallback = 'NONE') => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';

  if (TRIGGER_PLATFORM_ACTIONS.includes(normalized)) {
    return normalized;
  }

  return fallback;
};

export const normalizeTriggerPlatformGoThrough = (value) => ({
  player: Boolean(value?.player),
  entities: Boolean(value?.entities),
});

export const createTriggerPlatformCellKey = (cell) => `${cell.col}:${cell.row}`;

export const normalizeTriggerPlatformCells = (
  cells,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
  } = {},
) => {
  const resolvedGridSize = resolveTriggerPlatformGridSize(gridSize);
  const resolvedViewport = resolveTriggerPlatformViewport(viewport);
  const maxCol = Math.max(0, Math.floor((resolvedViewport.width - 1) / resolvedGridSize));
  const maxRow = Math.max(0, Math.floor((resolvedViewport.height - 1) / resolvedGridSize));
  const source = Array.isArray(cells) ? cells : [];
  const deduped = new Map();

  source.forEach((cell) => {
    if (!cell || typeof cell !== 'object') {
      return;
    }

    const normalizedCell = {
      col: normalizeTriggerPlatformCellValue(cell.col, maxCol),
      row: normalizeTriggerPlatformCellValue(cell.row, maxRow),
    };

    deduped.set(createTriggerPlatformCellKey(normalizedCell), normalizedCell);
  });

  return Array.from(deduped.values()).sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }

    return left.col - right.col;
  });
};

export const worldPointToTriggerPlatformCell = (
  point,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
  } = {},
) => {
  const resolvedGridSize = resolveTriggerPlatformGridSize(gridSize);
  const resolvedViewport = resolveTriggerPlatformViewport(viewport);
  const maxCol = Math.max(0, Math.floor((resolvedViewport.width - 1) / resolvedGridSize));
  const maxRow = Math.max(0, Math.floor((resolvedViewport.height - 1) / resolvedGridSize));

  return {
    col: clampNumber(Math.floor(toFiniteNumber(point?.x, 0) / resolvedGridSize), 0, maxCol),
    row: clampNumber(Math.floor(toFiniteNumber(point?.y, 0) / resolvedGridSize), 0, maxRow),
  };
};

export const triggerPlatformCellToWorldPoint = (
  cell,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
  } = {},
) => {
  const resolvedGridSize = resolveTriggerPlatformGridSize(gridSize);

  return {
    x: (Math.round(toFiniteNumber(cell?.col, 0)) * resolvedGridSize) + (resolvedGridSize * 0.5),
    y: (Math.round(toFiniteNumber(cell?.row, 0)) * resolvedGridSize) + (resolvedGridSize * 0.5),
  };
};

export const getTriggerPlatformBounds = (
  cells,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
  } = {},
) => {
  const resolvedGridSize = resolveTriggerPlatformGridSize(gridSize);
  const normalizedCells = normalizeTriggerPlatformCells(cells, { gridSize: resolvedGridSize });
  if (!normalizedCells.length) {
    const fallbackWorldPoint = triggerPlatformCellToWorldPoint({ col: 0, row: 0 }, { gridSize: resolvedGridSize });
    return {
      left: fallbackWorldPoint.x - (resolvedGridSize * 0.5),
      top: fallbackWorldPoint.y - (resolvedGridSize * 0.5),
      right: fallbackWorldPoint.x + (resolvedGridSize * 0.5),
      bottom: fallbackWorldPoint.y + (resolvedGridSize * 0.5),
      width: resolvedGridSize,
      height: resolvedGridSize,
      centerX: fallbackWorldPoint.x,
      centerY: fallbackWorldPoint.y,
    };
  }

  const cols = normalizedCells.map((cell) => cell.col);
  const rows = normalizedCells.map((cell) => cell.row);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const left = minCol * resolvedGridSize;
  const top = minRow * resolvedGridSize;
  const right = (maxCol + 1) * resolvedGridSize;
  const bottom = (maxRow + 1) * resolvedGridSize;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2),
  };
};

export const normalizeTriggerPlatformDestination = (
  value,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
    fallback = null,
  } = {},
) => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const [normalized] = normalizeTriggerPlatformCells([value], { gridSize, viewport });
  return normalized || fallback;
};

export const normalizeTriggerPlatformComponent = (
  component = {},
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
  } = {},
) => {
  const resolvedGridSize = resolveTriggerPlatformGridSize(gridSize);
  const resolvedViewport = resolveTriggerPlatformViewport(viewport);
  const fallbackCell = worldPointToTriggerPlatformCell({
    x: toFiniteNumber(component.x, resolvedViewport.width * 0.5),
    y: toFiniteNumber(component.y, resolvedViewport.height * 0.5),
  }, {
    gridSize: resolvedGridSize,
    viewport: resolvedViewport,
  });
  const normalizedCells = normalizeTriggerPlatformCells(
    Array.isArray(component.cells) && component.cells.length ? component.cells : [fallbackCell],
    { gridSize: resolvedGridSize, viewport: resolvedViewport },
  );
  const bounds = getTriggerPlatformBounds(normalizedCells, { gridSize: resolvedGridSize });
  const triggeredTileKey = typeof component.triggeredTileKey === 'string' ? component.triggeredTileKey.trim().slice(0, 120) : '';
  const untriggeredTileKey = typeof component.untriggeredTileKey === 'string' ? component.untriggeredTileKey.trim().slice(0, 120) : '';
  const hasConfiguredTiles = Boolean(triggeredTileKey || untriggeredTileKey);
  const normalizedInvisible = typeof component.invisible === 'boolean'
    ? (component.invisible && !hasConfiguredTiles)
    : !hasConfiguredTiles;

  return {
    ...component,
    x: bounds.centerX,
    y: bounds.centerY,
    width: bounds.width,
    height: bounds.height,
    cells: normalizedCells,
    triggerId: typeof component.triggerId === 'string' ? component.triggerId.trim().slice(0, 80) : '',
    invisible: normalizedInvisible,
    passThroughSides: Array.isArray(component.passThroughSides) ? component.passThroughSides : [],
    triggeredTileKey,
    untriggeredTileKey,
    correctAction: normalizeTriggerPlatformAction(component.correctAction, 'NONE'),
    wrongAction: normalizeTriggerPlatformAction(component.wrongAction, 'NONE'),
    correctMoveTo: normalizeTriggerPlatformDestination(component.correctMoveTo, {
      gridSize: resolvedGridSize,
      viewport: resolvedViewport,
      fallback: null,
    }),
    wrongMoveTo: normalizeTriggerPlatformDestination(component.wrongMoveTo, {
      gridSize: resolvedGridSize,
      viewport: resolvedViewport,
      fallback: null,
    }),
    correctGoThrough: normalizeTriggerPlatformGoThrough(component.correctGoThrough),
    wrongGoThrough: normalizeTriggerPlatformGoThrough(component.wrongGoThrough),
  };
};

export const updateTriggerPlatformCells = (
  component,
  nextCells,
  options = {},
) => normalizeTriggerPlatformComponent({
  ...(component || {}),
  cells: normalizeTriggerPlatformCells(nextCells, options),
}, options);

export const paintTriggerPlatformCell = (
  component,
  cell,
  {
    erase = false,
    ...options
  } = {},
) => {
  const baseComponent = normalizeTriggerPlatformComponent(component, options);
  const normalizedCell = normalizeTriggerPlatformDestination(cell, {
    ...options,
    fallback: null,
  });

  if (!normalizedCell) {
    return baseComponent;
  }

  const currentCells = normalizeTriggerPlatformCells(baseComponent.cells, options);
  const cellKey = createTriggerPlatformCellKey(normalizedCell);
  const currentKeys = new Set(currentCells.map(createTriggerPlatformCellKey));

  if (erase) {
    const remainingCells = currentCells.filter((entry) => createTriggerPlatformCellKey(entry) !== cellKey);
    return updateTriggerPlatformCells(baseComponent, remainingCells.length ? remainingCells : currentCells, options);
  }

  if (currentKeys.has(cellKey)) {
    return baseComponent;
  }

  return updateTriggerPlatformCells(baseComponent, [...currentCells, normalizedCell], options);
};

export const translateTriggerPlatformCells = (
  cells,
  destinationAnchor,
  {
    gridSize = TRIGGER_PLATFORM_DEFAULT_GRID_SIZE,
    viewport = DEFAULT_VIEWPORT,
  } = {},
) => {
  const normalizedCells = normalizeTriggerPlatformCells(cells, { gridSize, viewport });
  const normalizedDestination = normalizeTriggerPlatformDestination(destinationAnchor, {
    gridSize,
    viewport,
    fallback: null,
  });

  if (!normalizedCells.length || !normalizedDestination) {
    return normalizedCells;
  }

  const minCol = Math.min(...normalizedCells.map((cell) => cell.col));
  const minRow = Math.min(...normalizedCells.map((cell) => cell.row));
  const deltaCol = normalizedDestination.col - minCol;
  const deltaRow = normalizedDestination.row - minRow;

  return normalizeTriggerPlatformCells(
    normalizedCells.map((cell) => ({
      col: cell.col + deltaCol,
      row: cell.row + deltaRow,
    })),
    { gridSize, viewport },
  );
};
