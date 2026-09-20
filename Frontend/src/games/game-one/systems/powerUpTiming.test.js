import { describe, expect, it } from 'vitest';
import { getBoostedMoveSpeed, isTimedPowerUpActive } from './powerUpTiming';

describe('Game 1 timed power-ups', () => {
  it('applies the speed multiplier until the exact expiry time', () => {
    expect(getBoostedMoveSpeed(230, 1000, 10000)).toBe(402.5);
    expect(getBoostedMoveSpeed(230, 10000, 10000)).toBe(230);
    expect(isTimedPowerUpActive(9999, 10000)).toBe(true);
    expect(isTimedPowerUpActive(10000, 10000)).toBe(false);
  });
});
