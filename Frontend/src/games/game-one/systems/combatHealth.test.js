import { describe, expect, it } from 'vitest';
import { applyCombatDamage } from './combatHealth';

describe('Game 1 combat health', () => {
  it('reduces enemy health by the projectile damage', () => {
    expect(applyCombatDamage(3, 1)).toEqual({
      hitPoints: 2,
      defeated: false,
    });
  });

  it('marks the enemy defeated when health reaches zero', () => {
    expect(applyCombatDamage(1, 1)).toEqual({
      hitPoints: 0,
      defeated: true,
    });
  });
});
