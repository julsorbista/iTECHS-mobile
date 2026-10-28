const GRAVITY_Y = 1500;

export const DASH_MODE_AIR_ONLY = 'AIR_ONLY';
export const DASH_MODE_GROUND_ONLY = 'GROUND_ONLY';
export const DASH_MODE_BOTH = 'BOTH';
export const DASH_MODE_OPTIONS = Object.freeze([
  DASH_MODE_AIR_ONLY,
  DASH_MODE_GROUND_ONLY,
  DASH_MODE_BOTH,
]);

export const DEFAULT_PLAYER_ABILITY_CONFIG = Object.freeze({
  jumpHeight: 173,
  jumpSpeed: 720,
  jumpKeybind: 'SPACE',
  dashResetsOnJump: false,
  dashMode: DASH_MODE_AIR_ONLY,
  dashSpeed: 760,
  dashDistance: 122,
  dashKeybind: 'SHIFT',
  dashCooldownMs: 0,
  projectileDamage: 1,
  projectileSize: 48,
  projectileBurstCount: 1,
  projectileCooldownMs: 280,
  projectileKeybind: 'J',
  projectileSpeed: 560,
  projectileDistance: 700,
});

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeInteger = (value, min, max, fallback) => (
  Math.round(clampNumber(toFiniteNumber(value, fallback), min, max))
);

export const normalizeKeybind = (value, fallback) => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/\s+/g, '_')
    : '';
  return normalized || fallback;
};

export const getJumpVelocityFromSpeed = (jumpSpeed) => (
  -Math.abs(normalizeInteger(jumpSpeed, 180, 1400, DEFAULT_PLAYER_ABILITY_CONFIG.jumpSpeed))
);

export const getJumpSpeedFromHeight = (jumpHeight) => (
  normalizeInteger(
    Math.sqrt(2 * GRAVITY_Y * normalizeInteger(jumpHeight, 40, 620, DEFAULT_PLAYER_ABILITY_CONFIG.jumpHeight)),
    180,
    1400,
    DEFAULT_PLAYER_ABILITY_CONFIG.jumpSpeed,
  )
);

export const getDashDurationMs = (config = {}) => {
  const speed = normalizeInteger(config.dashSpeed, 120, 2200, DEFAULT_PLAYER_ABILITY_CONFIG.dashSpeed);
  const distance = normalizeInteger(config.dashDistance, 40, 1200, DEFAULT_PLAYER_ABILITY_CONFIG.dashDistance);
  return normalizeInteger((distance / speed) * 1000, 60, 900, 160);
};

export const getProjectileLifetimeMs = (config = {}) => {
  const speed = normalizeInteger(config.projectileSpeed, 80, 1800, DEFAULT_PLAYER_ABILITY_CONFIG.projectileSpeed);
  const distance = normalizeInteger(config.projectileDistance, 80, 2400, DEFAULT_PLAYER_ABILITY_CONFIG.projectileDistance);
  return normalizeInteger((distance / speed) * 1000, 120, 8000, 1250);
};

export const normalizeDashMode = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return DASH_MODE_OPTIONS.includes(normalized) ? normalized : DEFAULT_PLAYER_ABILITY_CONFIG.dashMode;
};

export const normalizePlayerAbilityConfig = (source = {}) => {
  const jumpHeight = normalizeInteger(
    source.jumpHeight,
    40,
    620,
    DEFAULT_PLAYER_ABILITY_CONFIG.jumpHeight,
  );
  const jumpSpeed = normalizeInteger(
    source.jumpSpeed,
    180,
    1400,
    getJumpSpeedFromHeight(jumpHeight),
  );
  const dashSpeed = normalizeInteger(source.dashSpeed, 120, 2200, DEFAULT_PLAYER_ABILITY_CONFIG.dashSpeed);
  const dashDistance = normalizeInteger(source.dashDistance, 40, 1200, DEFAULT_PLAYER_ABILITY_CONFIG.dashDistance);
  const projectileSpeed = normalizeInteger(
    source.projectileSpeed,
    80,
    1800,
    DEFAULT_PLAYER_ABILITY_CONFIG.projectileSpeed,
  );
  const projectileDistance = normalizeInteger(
    source.projectileDistance,
    80,
    2400,
    DEFAULT_PLAYER_ABILITY_CONFIG.projectileDistance,
  );

  return {
    jumpHeight,
    jumpSpeed,
    jumpVelocity: getJumpVelocityFromSpeed(jumpSpeed),
    jumpKeybind: normalizeKeybind(source.jumpKeybind, DEFAULT_PLAYER_ABILITY_CONFIG.jumpKeybind),
    dashResetsOnJump: Boolean(source.dashResetsOnJump),
    dashMode: normalizeDashMode(source.dashMode),
    dashSpeed,
    dashDistance,
    dashDurationMs: getDashDurationMs({ dashSpeed, dashDistance }),
    dashKeybind: normalizeKeybind(source.dashKeybind, DEFAULT_PLAYER_ABILITY_CONFIG.dashKeybind),
    dashCooldownMs: normalizeInteger(
      source.dashCooldownMs,
      0,
      5000,
      DEFAULT_PLAYER_ABILITY_CONFIG.dashCooldownMs,
    ),
    projectileDamage: normalizeInteger(
      source.projectileDamage,
      1,
      20,
      DEFAULT_PLAYER_ABILITY_CONFIG.projectileDamage,
    ),
    projectileSize: normalizeInteger(
      source.projectileSize,
      12,
      160,
      DEFAULT_PLAYER_ABILITY_CONFIG.projectileSize,
    ),
    projectileBurstCount: normalizeInteger(
      source.projectileBurstCount,
      1,
      8,
      DEFAULT_PLAYER_ABILITY_CONFIG.projectileBurstCount,
    ),
    projectileCooldownMs: normalizeInteger(
      source.projectileCooldownMs,
      80,
      5000,
      DEFAULT_PLAYER_ABILITY_CONFIG.projectileCooldownMs,
    ),
    projectileKeybind: normalizeKeybind(
      source.projectileKeybind,
      DEFAULT_PLAYER_ABILITY_CONFIG.projectileKeybind,
    ),
    projectileSpeed,
    projectileDistance,
    projectileLifetimeMs: getProjectileLifetimeMs({ projectileSpeed, projectileDistance }),
  };
};
