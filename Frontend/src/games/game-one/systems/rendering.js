import {
  getGameOneSurfaceGeometry,
  getGameOneSurfaceMetricsFromGeometry,
} from './surfaceGeometry';

export const getGameOneSpriteDisplaySize = (manifestEntry, fallback = {}) => {
  if (!manifestEntry?.frameWidth || !manifestEntry?.frameHeight) {
    return fallback;
  }

  const scale = Number(manifestEntry.scale || 1);
  return {
    width: Math.round(manifestEntry.frameWidth * scale),
    height: Math.round(manifestEntry.frameHeight * scale),
  };
};

export const getGameOneSurfaceMetrics = (manifest, config = {}) => {
  return getGameOneSurfaceMetricsFromGeometry(getGameOneSurfaceGeometry(manifest, config));
};
