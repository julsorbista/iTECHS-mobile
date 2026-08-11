const toPositiveNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getSpriteSourceWidth = (sprite, fallback = 1) => (
  toPositiveNumber(
    sprite?.frame?.realWidth
      ?? sprite?.frame?.width
      ?? sprite?.width,
    fallback,
  )
);

export const resolveArcadeBodySpec = (manifest = {}, fallback = {}) => {
  const body = manifest?.body && typeof manifest.body === 'object' ? manifest.body : {};

  return {
    width: Math.max(1, Math.round(toPositiveNumber(body.width, fallback.width || 28))),
    height: Math.max(1, Math.round(toPositiveNumber(body.height, fallback.height || 28))),
    offsetX: Math.round(Number.isFinite(Number(body.offsetX)) ? Number(body.offsetX) : Number(fallback.offsetX || 0)),
    offsetY: Math.round(Number.isFinite(Number(body.offsetY)) ? Number(body.offsetY) : Number(fallback.offsetY || 0)),
  };
};

export const getScaledArcadeBodyRect = ({
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
  displayOriginX = 0,
  displayOriginY = 0,
} = {}, bodySpec = {}) => {
  const width = toPositiveNumber(bodySpec.width, 1) * Math.abs(Number(scaleX) || 1);
  const height = toPositiveNumber(bodySpec.height, 1) * Math.abs(Number(scaleY) || 1);
  const left = Number(x) + ((Number(scaleX) || 1) * ((Number(bodySpec.offsetX) || 0) - Number(displayOriginX || 0)));
  const top = Number(y) + ((Number(scaleY) || 1) * ((Number(bodySpec.offsetY) || 0) - Number(displayOriginY || 0)));

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + (width / 2),
    centerY: top + (height / 2),
  };
};

export const applyConfiguredSpriteScale = (sprite, manifest = {}, config = {}, {
  minWidth = 16,
  sizeKey = 'size',
} = {}) => {
  const requestedSize = Number(config?.[sizeKey]);
  if (Number.isFinite(requestedSize) && requestedSize > 0) {
    const targetWidth = Math.max(minWidth, Math.round(requestedSize));
    const sourceWidth = getSpriteSourceWidth(sprite, targetWidth);
    sprite.setScale(targetWidth / sourceWidth);
    return targetWidth / sourceWidth;
  }

  const scale = toPositiveNumber(config?.scale, toPositiveNumber(manifest?.scale, 1));
  sprite.setScale(scale);
  return scale;
};

export const applyArcadeBodySpec = (sprite, bodySpec = {}, fallback = {}) => {
  if (!sprite?.body) {
    return null;
  }

  const spec = resolveArcadeBodySpec({ body: bodySpec }, fallback);

  sprite.body.setSize(spec.width, spec.height, false);
  sprite.body.setOffset(spec.offsetX, spec.offsetY);
  sprite.body.updateFromGameObject?.();

  return spec;
};

export const getCenteredArcadeBodySpec = (sprite, displayRatio = 0.75) => {
  const frameWidth = toPositiveNumber(
    sprite?.frame?.realWidth ?? sprite?.frame?.width ?? sprite?.width,
    1,
  );
  const frameHeight = toPositiveNumber(
    sprite?.frame?.realHeight ?? sprite?.frame?.height ?? sprite?.height,
    1,
  );
  const ratio = Math.min(1, Math.max(0.1, Number(displayRatio) || 0.75));
  const width = Math.max(1, Math.round(frameWidth * ratio));
  const height = Math.max(1, Math.round(frameHeight * ratio));

  return {
    width,
    height,
    offsetX: Math.round((frameWidth - width) / 2),
    offsetY: Math.round((frameHeight - height) / 2),
  };
};

export const applyArcadeBodyFromManifest = (sprite, manifest = {}, fallback = {}) => (
  applyArcadeBodySpec(sprite, manifest?.body, fallback)
);
