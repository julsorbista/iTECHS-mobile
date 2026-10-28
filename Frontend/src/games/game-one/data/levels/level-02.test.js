import { describe, expect, it } from 'vitest';

import levelTwo from './level-02.json';

describe('Game One Level 2 — Temple of Data Types', () => {
  it('uses a short briefing and five gameplay rooms', () => {
    expect(levelTwo.title).toBe('Temple of Data Types');
    expect(levelTwo.missionTitle).toBe('MISSION: Restore the Data Temple');
    expect(levelTwo.rooms).toHaveLength(5);
    expect(levelTwo.rooms.map((room) => room.id)).toEqual([
      'room-1', 'room-2', 'room-3', 'room-4', 'room-5',
    ]);
    expect(levelTwo.rooms[0].objective).toContain('Number Chamber');
    expect(levelTwo.rooms.map((room) => room.backgroundKey)).toEqual([
      'room_2', 'room_3', 'room_4', 'room_5', 'room_6',
    ]);
  });

  it('uses only three learning scrolls and no Data Crystal key substitutes', () => {
    const pickups = levelTwo.rooms.flatMap((room) => room.coins || []);
    const scrolls = pickups.filter((pickup) => pickup.collectibleType === 'scroll');

    expect(pickups.filter((pickup) => pickup.collectibleType === 'key')).toHaveLength(0);
    expect(scrolls.map((scroll) => scroll.id)).toEqual(['scroll-1', 'scroll-2', 'scroll-3']);
    expect(scrolls[0].clueText).toContain('INT stores whole numbers');
    expect(scrolls[0].clueText).toContain('DOUBLE stores decimal numbers');
    expect(scrolls[1].clueText).toContain('BOOLEAN');
    expect(scrolls[2].clueText).toContain('STRING');
  });

  it('requires only the corresponding room scroll at each locked portal', () => {
    expect(levelTwo.rooms[0].portal).toMatchObject({ requiredScrollId: 'scroll-1' });
    expect(levelTwo.rooms[1].portal).toMatchObject({ requiredScrollId: 'scroll-2' });
    expect(levelTwo.rooms[2].portal).toMatchObject({ requiredScrollId: 'scroll-3' });
    expect(levelTwo.rooms.slice(0, 3).every((room) => !room.portal.requiredKeys)).toBe(true);
  });

  it('defines the three-attempt DATA TYPE treasure challenge with one-heart failure damage', () => {
    const [question] = levelTwo.questions;

    expect(levelTwo.treasureQuestionId).toBe('data-core-riddle');
    expect(question).toMatchObject({
      challengeType: 'WORD_SCRAMBLE',
      jumbledWord: 'ATAD EPYT',
      answer: 'DATA TYPE',
      maxAttempts: 3,
      damageOnWrongAnswer: 1,
      lockAttemptSessionOnClose: true,
    });
    expect(question.failureMessages).toHaveLength(3);
    expect(levelTwo.rooms[4].portal).toMatchObject({
      appearance: 'TREASURE_CHEST',
      requiredCoins: 3,
      questionId: 'data-core-riddle',
    });
    expect(levelTwo.rooms[4].portal.requiredKeys).toBeUndefined();
  });

  it('includes the requested escalating platform and hazard mechanics', () => {
    const platforms = levelTwo.rooms.flatMap((room) => room.platforms || []);
    const enemies = levelTwo.rooms.flatMap((room) => [
      ...(room.ghosts || []), ...(room.projectileEnemies || []),
    ]);

    expect(platforms.some((platform) => platform.moveAxis)).toBe(true);
    expect(platforms.filter((platform) => platform.disappearEveryMs)).toHaveLength(1);
    expect(platforms.some((platform) => platform.hazardType === 'spikes')).toBe(true);
    expect(platforms.some((platform) => platform.hazardType === 'fire')).toBe(true);
    expect(enemies.some((enemy) => enemy.enemyType === 'elemental')).toBe(true);
    expect(levelTwo.rooms[2].ghosts.find((enemy) => enemy.id === 'r3-ghost')).toMatchObject({
      chasePlayer: true,
      chaseDelayMs: 3000,
    });
    expect(levelTwo.rooms[0].ghosts.some((enemy) => enemy.id === 'r1-slime')).toBe(false);
    expect(levelTwo.rooms[4].ghosts.find((enemy) => enemy.id === 'r5-ghost')).toMatchObject({
      chasePlayer: true,
      chaseDelayMs: 5000,
    });
    expect(levelTwo.rooms[2].platforms.find(({ id }) => id === 'r3-c').moveAxis).toBeUndefined();
    expect(levelTwo.rooms[3].platforms.find(({ id }) => id === 'r4-b').moveAxis).toBeUndefined();
    expect(levelTwo.rooms[3].platforms.find(({ id }) => id === 'r4-d').disappearEveryMs).toBeUndefined();
    expect(levelTwo.rooms[4].platforms.find(({ id }) => id === 'r5-a').moveAxis).toBeUndefined();
    expect(levelTwo.rooms[4].platforms.find(({ id }) => id === 'r5-c').moveAxis).toBeUndefined();
    expect(levelTwo.rooms[4].platforms.find(({ id }) => id === 'r5-b').disappearEveryMs).toBe(1900);
    expect(levelTwo.rooms[4].platforms.find(({ id }) => id === 'r5-d').disappearEveryMs).toBeUndefined();
  });
});
