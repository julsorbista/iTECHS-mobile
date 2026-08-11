const PASS_THROUGH_SIDES = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positiveNumber = (value, fallback = 1) => Math.max(1, toFiniteNumber(value, fallback));

const rectFromCenter = (centerX, centerY, width, height) => {
  const resolvedWidth = positiveNumber(width, 1);
  const resolvedHeight = positiveNumber(height, 1);
  const resolvedCenterX = toFiniteNumber(centerX, 0);
  const resolvedCenterY = toFiniteNumber(centerY, 0);
  const left = resolvedCenterX - (resolvedWidth / 2);
  const top = resolvedCenterY - (resolvedHeight / 2);

  return {
    x: left,
    y: top,
    left,
    top,
    right: left + resolvedWidth,
    bottom: top + resolvedHeight,
    width: resolvedWidth,
    height: resolvedHeight,
    centerX: resolvedCenterX,
    centerY: resolvedCenterY,
  };
};

export const normalizeSurfacePassThroughSides = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
      .filter((entry) => PASS_THROUGH_SIDES.includes(entry)),
  ));
};

export const normalizeSurfaceCollisionMode = (value, fallback = 'SOLID') => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';

  if (normalized === 'ONE_WAY' || normalized === 'SOLID') {
    return normalized;
  }

  return fallback === 'ONE_WAY' ? 'ONE_WAY' : 'SOLID';
};

export const getGameOneSurfaceGeometry = (manifest, config = {}) => {
  const textureMeta = manifest?.platforms?.[config.textureKey]
    || Object.values(manifest?.platforms || {})[0]
    || { key: '', visualHeight: 60 };
  const invisible = Boolean(config?.invisible);
  const x = toFiniteNumber(config?.x, 640);
  const y = toFiniteNumber(config?.y, 520);
  const visualWidth = positiveNumber(config?.width ?? config?.bodyWidth, 120);
  const bodyWidth = positiveNumber(config?.bodyWidth ?? config?.width, visualWidth);
  const requestedVisualHeight = Number(config?.height);
  const requestedBodyHeight = Number(config?.bodyHeight);

  const visualHeight = Number.isFinite(requestedVisualHeight)
    ? Math.max(1, requestedVisualHeight)
    : positiveNumber(textureMeta.visualHeight, 60);
  const bodyHeight = invisible
    ? visualHeight
    : (Number.isFinite(requestedBodyHeight) ? Math.max(1, requestedBodyHeight) : visualHeight);
  const fallbackCollisionMode = bodyHeight <= 28 ? 'ONE_WAY' : 'SOLID';
  const collisionMode = invisible
    ? normalizeSurfaceCollisionMode(config?.collisionMode, 'SOLID')
    : normalizeSurfaceCollisionMode(config?.collisionMode, fallbackCollisionMode);
  const bodyOffsetY = invisible
    ? 0
    : toFiniteNumber(
      config?.bodyOffsetY,
      visualHeight > bodyHeight ? ((visualHeight - bodyHeight) / 2) : 0,
    );

  const visualRect = rectFromCenter(x, y, visualWidth, visualHeight);
  const bodyRect = rectFromCenter(x, y + bodyOffsetY, bodyWidth, bodyHeight);

  return {
    textureMeta,
    invisible,
    collisionMode,
    passThroughSides: normalizeSurfacePassThroughSides(config?.passThroughSides),
    bodyOffsetY,
    visualRect,
    bodyRect,
  };
};

export const getGameOneSurfaceMetricsFromGeometry = (geometry) => ({
  textureMeta: geometry.textureMeta,
  visualHeight: geometry.visualRect.height,
  bodyHeight: geometry.bodyRect.height,
  bodyWidth: geometry.bodyRect.width,
  collisionMode: geometry.collisionMode,
  bodyOffsetY: geometry.bodyOffsetY,
  passThroughSides: geometry.passThroughSides,
});

export const shouldSkipSurfaceCollisionForPassThrough = (playerBody, platformBody, passThroughSides) => {
  if (!playerBody || !platformBody || passThroughSides.length === 0) {
    return false;
  }

  const previousLeft = playerBody.prev?.x ?? playerBody.x;
  const previousTop = playerBody.prev?.y ?? playerBody.y;
  const previousRight = previousLeft + playerBody.width;
  const previousBottom = previousTop + playerBody.height;
  const verticalTolerance = Math.max(12, Math.min(48, Math.round(Math.abs(playerBody.velocity.y) * 0.06)));
  const horizontalTolerance = Math.max(12, Math.min(40, Math.round(Math.abs(playerBody.velocity.x) * 0.06)));

  if (passThroughSides.includes('TOP') && playerBody.velocity.y >= 0 && previousBottom <= platformBody.top + verticalTolerance) {
    return true;
  }

  if (passThroughSides.includes('BOTTOM') && playerBody.velocity.y <= 0 && previousTop >= platformBody.bottom - verticalTolerance) {
    return true;
  }

  if (passThroughSides.includes('LEFT') && playerBody.velocity.x >= 0 && previousRight <= platformBody.left + horizontalTolerance) {
    return true;
  }

  if (passThroughSides.includes('RIGHT') && playerBody.velocity.x <= 0 && previousLeft >= platformBody.right - horizontalTolerance) {
    return true;
  }

  return false;
};

export const shouldProcessSurfaceCollision = (playerBody, platformBody, geometry) => {
  if (!playerBody || !platformBody) {
    return false;
  }

  const passThroughSides = normalizeSurfacePassThroughSides(geometry?.passThroughSides);
  if (passThroughSides.length > 0) {
    return !shouldSkipSurfaceCollisionForPassThrough(playerBody, platformBody, passThroughSides);
  }

  if (geometry?.collisionMode === 'ONE_WAY') {
    const previousBottom = (playerBody.prev?.y ?? playerBody.y) + playerBody.height;
    const landingTolerance = Math.max(12, Math.min(48, Math.round(Math.abs(playerBody.velocity.y) * 0.06)));
    return playerBody.velocity.y >= 0 && previousBottom <= platformBody.top + landingTolerance;
  }

  return true;
};
