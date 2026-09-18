import { describe, expect, it } from 'vitest';

import levelFive from './level-05.json';
import levelFour from './level-04.json';
import levelThree from './level-03-operators.json';

describe('Game One Level 5 — Labyrinth of Loops', () => {
  it('defines five rooms, three Loop Seals, and three learning scrolls', () => {
    expect(levelFive.title).toBe('Labyrinth of Loops');
    expect(levelFive.rooms).toHaveLength(5);
    const pickups = levelFive.rooms.flatMap((room) => room.coins || []);
    expect(pickups.filter(({ collectibleType }) => collectibleType === 'key')).toHaveLength(3);
    expect(pickups.filter(({ collectibleType }) => collectibleType === 'scroll')).toHaveLength(3);
    expect(levelFive.rooms.map(({ backgroundKey }) => backgroundKey)).toEqual([
      'room_10', 'ruinsGate', 'tutorialGrove', 'swampTrail', 'room_1',
    ]);
  });

  it('uses predictable repeating mechanics without permanent-collapse dead ends', () => {
    const platforms = levelFive.rooms.flatMap((room) => room.platforms || []);
    expect(platforms.filter(({ moveAxis }) => moveAxis)).toHaveLength(7);
    expect(levelFive.rooms[4].platforms.filter(({ disappearEveryMs }) => disappearEveryMs)).toHaveLength(2);
    expect(platforms.some(({ collapseDelayMs }) => collapseDelayMs)).toBe(false);
    expect(levelFive.rooms[4].ghosts[0].chaseDelayMs).toBe(5000);
  });

  it('uses distinct room geometry instead of copying Levels 3 and 4', () => {
    const geometry = (level) => level.rooms.map((room) => room.platforms
      .filter(({ hazard }) => !hazard)
      .map(({ x, y }) => [x, y]));
    expect(geometry(levelFive)).not.toEqual(geometry(levelFour));
    expect(geometry(levelFive)).not.toEqual(geometry(levelThree));
    expect(geometry(levelFour)).not.toEqual(geometry(levelThree));
  });

  it('keeps the Room 2 opening route within normal jump height', () => {
    const room = levelFive.rooms[1];
    const platform = (id) => room.platforms.find((entry) => entry.id === id);
    expect(platform('r2-lower-one').y).toBe(575);
    expect(platform('r2-lower-one')).toMatchObject({
      moveAxis: 'x', moveDistance: 60, moveDuration: 2050,
    });
    expect(platform('r2-shuttle').moveAxis).toBeUndefined();
    expect(platform('r2-lift')).toBeUndefined();
    expect(platform('r2-scroll-ledge').y).toBe(390);
    expect(room.coins.find(({ id }) => id === 'r2-jump').y).toBe(493);
    expect(room.coins.find(({ id }) => id === 'scroll-2').y).toBe(308);
  });

  it('uses the requested fixed platforms and Room 1 shadow-spirit replacement', () => {
    const platform = (roomIndex, id) => levelFive.rooms[roomIndex].platforms
      .find((entry) => entry.id === id);
    expect(platform(0, 'r1-high-shuttle').moveAxis).toBeUndefined();
    expect(platform(0, 'r1-scroll-shuttle').moveAxis).toBeUndefined();
    expect(platform(0, 'r1-scroll-shuttle')).toMatchObject({ x: 815, y: 480 });
    expect(platform(4, 'r5-shuttle').moveAxis).toBeUndefined();
    expect(levelFive.rooms[0].ghosts).toContainEqual(expect.objectContaining({
      id: 'r1-shadow-spirit', enemyType: 'shadowspirit', x: 895,
    }));
  });

  it('uses only visible seals and scrolls for progression and leaves the Loop Trial portal open', () => {
    expect(levelFive.rooms.slice(0, 3).map(({ portal }) => portal.requiredKeys)).toEqual([1, 2, 3]);
    expect(levelFive.rooms.slice(0, 3).map(({ portal }) => portal.requiredScrollId)).toEqual([
      'scroll-1', 'scroll-2', 'scroll-3',
    ]);
    expect(levelFive.rooms.slice(0, 4).every(({ portal }) => portal.requiredQuestionIds === undefined)).toBe(true);
    expect(levelFive.rooms.slice(0, 4).every(({ villain }) => villain === undefined)).toBe(true);
    expect(levelFive.rooms[3].portal).toMatchObject({ locked: false, targetRoomId: 'room-5' });
    expect(levelFive.rooms[0].platforms.find(({ id }) => id === 'r1-portal-floor')).toMatchObject({
      x: 1160, y: 672, width: 152,
    });
  });

  it('uses the three-attempt LOOP treasure without health loss', () => {
    const question = levelFive.questions.find(({ id }) => id === levelFive.treasureQuestionId);
    expect(question).toMatchObject({
      challengeType: 'WORD_SCRAMBLE', jumbledWord: 'OPOL', answer: 'LOOP',
      maxAttempts: 3, damageOnWrongAnswer: 0, lockAttemptSessionOnClose: true,
    });
    expect(question.failureMessages).toHaveLength(3);
    expect(levelFive.rooms[4].portal).toMatchObject({
      appearance: 'TREASURE_CHEST', requiredCoins: 3, questionId: 'loop-core-riddle',
    });
  });
});
