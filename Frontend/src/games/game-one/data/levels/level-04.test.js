import { describe, expect, it } from 'vitest';

import levelFour from './level-04.json';

describe('Game One Level 4 — Citadel of Decisions', () => {
  it('defines five rooms, three seals, and three conditional scrolls', () => {
    expect(levelFour.title).toBe('Citadel of Decisions');
    expect(levelFour.rooms).toHaveLength(5);
    const pickups = levelFour.rooms.flatMap((room) => room.coins || []);
    expect(pickups.filter(({ collectibleType }) => collectibleType === 'key')).toHaveLength(3);
    expect(pickups.filter(({ collectibleType }) => collectibleType === 'scroll')).toHaveLength(3);
    expect(levelFour.rooms.map(({ backgroundKey }) => backgroundKey)).toEqual([
      'ruinsGate', 'room_10', 'swampTrail', 'room_1', 'tutorialGrove',
    ]);
  });

  it('uses a challenging but feasible teacher-side mechanic set', () => {
    const platforms = levelFour.rooms.flatMap((room) => room.platforms || []);
    expect(platforms.filter(({ moveAxis }) => moveAxis)).toHaveLength(4);
    expect(platforms.filter(({ disappearEveryMs }) => disappearEveryMs)).toHaveLength(1);
    expect(platforms.some(({ collapseDelayMs }) => collapseDelayMs)).toBe(false);
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-high-shuttle')).toMatchObject({
      x: 600,
      y: 535,
      width: 114,
    });
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-high-shuttle').moveAxis).toBeUndefined();
    expect(levelFour.rooms[0].platforms.some(({ id }) => id === 'r1-right-lift')).toBe(false);
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-scroll-shuttle')).toMatchObject({
      x: 830,
      y: 490,
      width: 76,
    });
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-scroll-shuttle').moveAxis).toBeUndefined();
    expect(levelFour.rooms[1].platforms.find(({ id }) => id === 'r2-shuttle').moveAxis).toBeUndefined();
    expect(levelFour.rooms[2].platforms.find(({ id }) => id === 'r3-left-lift').moveAxis).toBeUndefined();
    expect(levelFour.rooms[2].platforms.find(({ id }) => id === 'r3-right-lift').moveAxis).toBeUndefined();
    expect(levelFour.rooms[3].ghosts.find(({ id }) => id === 'r4-ghost')).toMatchObject({ x: 920 });
    expect(levelFour.rooms[3].projectileEnemies.find(({ id }) => id === 'r4-elemental')).toMatchObject({ y: 390 });
    expect(levelFour.rooms[4].platforms.find(({ id }) => id === 'r5-lift').moveAxis).toBeUndefined();
    expect(levelFour.rooms[4].platforms.find(({ id }) => id === 'r5-shuttle').moveAxis).toBeUndefined();
    expect(levelFour.rooms[4].platforms.find(({ id }) => id === 'r5-final-lift').moveAxis).toBeUndefined();
    expect(levelFour.rooms[3].ghosts.some(({ id }) => id === 'r4-shadow-spirit')).toBe(false);
    expect(levelFour.rooms[4].ghosts.find(({ id }) => id === 'r5-ghost')).toMatchObject({ x: 920 });
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-exit')).toMatchObject({
      x: 1055,
      y: 355,
      width: 152,
    });
    expect(levelFour.rooms[0].platforms.find(({ id }) => id === 'r1-portal-floor')).toMatchObject({
      x: 1070,
      y: 672,
      width: 190,
    });
    expect(levelFour.rooms[0].villain).toBeUndefined();
    expect(levelFour.rooms[0].coins.find(({ id }) => id === 'scroll-1')).toMatchObject({ x: 1055, y: 273 });
    expect(levelFour.rooms[0].projectileEnemies).toHaveLength(0);
    expect(levelFour.rooms[4].ghosts[0].chaseDelayMs).toBe(5000);
  });

  it('requires each visible seal and scroll without a hidden gate requirement', () => {
    expect(levelFour.rooms.slice(0, 3).map(({ portal }) => portal.requiredKeys)).toEqual([1, 2, 3]);
    expect(levelFour.rooms.slice(0, 3).map(({ portal }) => portal.requiredScrollId)).toEqual(['scroll-1', 'scroll-2', 'scroll-3']);
    expect(levelFour.rooms.slice(0, 3).every(({ portal }) => portal.requiredQuestionIds === undefined)).toBe(true);
    expect(levelFour.rooms.slice(0, 3).every(({ villain }) => villain === undefined)).toBe(true);
    expect(levelFour.rooms[3].portal).toMatchObject({ locked: false, targetRoomId: 'room-5' });
    expect(levelFour.rooms[3].portal.requiredQuestionIds).toBeUndefined();
    const seals = levelFour.rooms.flatMap((room) => room.coins || [])
      .filter(({ collectibleType }) => collectibleType === 'key');
    expect(seals.map(({ spriteFrame, size }) => [spriteFrame, size])).toEqual([
      ['key-red', 34], ['key-blue', 34], ['key-green', 34],
    ]);
    const gates = levelFour.rooms.flatMap((room) => (
      Array.isArray(room.villain) ? room.villain : room.villain ? [room.villain] : []
    ));
    expect(gates).toHaveLength(0);
  });

  it('uses the three-attempt CONDITION treasure challenge without health loss', () => {
    const question = levelFour.questions.find(({ id }) => id === levelFour.treasureQuestionId);
    expect(question).toMatchObject({
      challengeType: 'WORD_SCRAMBLE', jumbledWord: 'NODIITCON', answer: 'CONDITION',
      maxAttempts: 3, damageOnWrongAnswer: 0, lockAttemptSessionOnClose: true,
    });
    expect(question.failureMessages).toHaveLength(3);
    expect(levelFour.rooms[4].portal).toMatchObject({
      appearance: 'TREASURE_CHEST', requiredCoins: 3, questionId: 'decision-core-riddle',
    });
  });
});
