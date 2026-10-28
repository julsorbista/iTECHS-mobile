import { describe, expect, it } from 'vitest';
import levelOne from './level-01.json';
import levelTwo from './level-02.json';
import levelThree from './level-03-operators.json';
import levelFour from './level-04.json';
import levelFive from './level-05.json';

const levels = [levelOne, levelTwo, levelThree, levelFour, levelFive];

describe('Game One collectible separation', () => {
  it('provides three dedicated hint coins in every treasure level', () => {
    levels.forEach((level) => {
      const pickups = level.rooms.flatMap((room) => room.coins || []);
      expect(
        pickups.filter(({ collectibleType }) => collectibleType === 'coin'),
        `${level.title} dedicated coins`,
      ).toHaveLength(3);
    });
  });

  it('keeps coin, scroll, and key identifiers and types separate', () => {
    levels.forEach((level) => {
      const pickups = level.rooms.flatMap((room) => room.coins || []);
      const objectivePickups = pickups.filter(({ collectibleType }) => (
        ['coin', 'scroll', 'key'].includes(collectibleType)
      ));
      expect(new Set(objectivePickups.map(({ id }) => id)).size).toBe(objectivePickups.length);
      expect(objectivePickups.every(({ collectibleType }) => (
        ['coin', 'scroll', 'key'].includes(collectibleType)
      ))).toBe(true);
    });
  });
});
