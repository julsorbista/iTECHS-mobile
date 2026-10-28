import { describe, expect, it } from 'vitest';
import { applyGameThreeLevelProgression } from './applyLevelProgression';

describe('Game 3 progression with older hosted content', () => {
  it.each([2, 3, 4, 5, 6, 6, 7, 8, 9, 10].map((pairs, index) => [index + 1, pairs]))(
    'limits level %i to %i pairs without modifying the server response',
    (level, expectedPairs) => {
      const original = {
        pairs: Array.from({ length: 18 }, (_, id) => ({ id: `pair-${id}` })),
        settings: { columns: 8, customSetting: true },
      };
      const result = applyGameThreeLevelProgression(original, level);
      expect(result.pairs).toHaveLength(expectedPairs);
      expect(result.subtitle).toBe(`${expectedPairs * 2} cards | ${expectedPairs} pairs`);
      expect(result.settings.customSetting).toBe(true);
      expect(original.pairs).toHaveLength(18);
      expect(original.settings.columns).toBe(8);
    },
  );

  it('keeps a smaller teacher deck intact', () => {
    const pairs = [{ id: 'a' }, { id: 'b' }];
    expect(applyGameThreeLevelProgression({ pairs }, 10).pairs).toEqual(pairs);
  });
});
