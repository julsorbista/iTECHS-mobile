import { describe, expect, it } from 'vitest';
import { buildSubmissionPayload, calculateGameThreeStars } from './progressBridge';

describe('Game 3 progression bridge', () => {
  it('awards stars from matched-pair percentage', () => {
    expect(calculateGameThreeStars(9, 10)).toBe(3);
    expect(calculateGameThreeStars(8, 10)).toBe(2);
    expect(calculateGameThreeStars(6, 10)).toBe(1);
    expect(calculateGameThreeStars(4, 10)).toBe(0);
  });

  it('requires at least two stars to complete the level', () => {
    expect(buildSubmissionPayload({
      outcome: 'COMPLETED',
      matchedPairs: 8,
      totalPairs: 10,
      mismatches: 2,
    })).toMatchObject({ outcome: 'COMPLETED', starsEarned: 2, baseScore: 800, mistakes: 2 });

    expect(buildSubmissionPayload({
      outcome: 'COMPLETED',
      matchedPairs: 6,
      totalPairs: 10,
      mismatches: 4,
    })).toMatchObject({ outcome: 'FAILED', starsEarned: 1, baseScore: 0, mistakes: 4 });
  });

  it('leaves retry-score reduction to the backend', () => {
    expect(buildSubmissionPayload({
      outcome: 'COMPLETED',
      matchedPairs: 9,
      totalPairs: 10,
      mismatches: 1,
    }, { retryMultiplier: 0.5 }).baseScore).toBe(900);
  });
});
