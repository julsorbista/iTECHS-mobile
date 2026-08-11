export const applyCombatDamage = (currentHitPoints, damage = 1) => {
  const current = Math.max(0, Math.round(Number(currentHitPoints) || 0));
  const appliedDamage = Math.max(1, Math.round(Number(damage) || 1));
  const hitPoints = Math.max(0, current - appliedDamage);

  return {
    hitPoints,
    defeated: hitPoints <= 0,
  };
};
