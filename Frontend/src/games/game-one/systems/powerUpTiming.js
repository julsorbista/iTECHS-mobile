export const isTimedPowerUpActive = (now, activeUntil) => (
  Number(now) < Number(activeUntil || 0)
);

export const getBoostedMoveSpeed = (baseSpeed, now, activeUntil, multiplier = 1.75) => (
  isTimedPowerUpActive(now, activeUntil) ? Number(baseSpeed) * Number(multiplier) : Number(baseSpeed)
);
