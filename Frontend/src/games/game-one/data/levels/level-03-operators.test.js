import { describe, expect, it } from 'vitest';

import levelThree from './level-03-operators.json';
import { prepareGameOneRuntimeLevelData } from '../../runtime/prepareGameOneRuntimeLevelData';

describe('Game One Level 3 — Fortress of Operators', () => {
  it('defines five rooms, three distinct seals, three hint coins, and three learning scrolls', () => {
    expect(levelThree.title).toBe('Fortress of Operators');
    expect(levelThree.rooms).toHaveLength(5);
    const pickups = levelThree.rooms.flatMap((room) => room.coins || []);
    expect(pickups.filter((pickup) => pickup.collectibleType === 'key')).toHaveLength(3);
    expect(pickups.filter((pickup) => pickup.collectibleType === 'coin')).toHaveLength(3);
    expect(pickups.filter((pickup) => pickup.collectibleType === 'scroll')).toHaveLength(3);
    expect(levelThree.rooms.slice(0, 3).every((room) => (
      room.coins.filter(({ collectibleType }) => collectibleType === 'coin').length === 1
      && room.coins.filter(({ collectibleType }) => collectibleType === 'key').length === 1
      && room.coins.filter(({ collectibleType }) => collectibleType === 'scroll').length === 1
    ))).toBe(true);
    expect(levelThree.rooms.slice(0, 3).every((room) => {
      const hintCoin = room.coins.find(({ collectibleType }) => collectibleType === 'coin');
      const seal = room.coins.find(({ collectibleType }) => collectibleType === 'key');
      return Math.hypot(hintCoin.x - seal.x, hintCoin.y - seal.y) >= 150;
    })).toBe(true);
    expect(levelThree.rooms.map((room) => room.backgroundKey)).toEqual([
      'ruinsGate', 'room_10', 'room_1', 'swampTrail', 'tutorialGrove',
    ]);
    expect(levelThree.rooms.every((room) => !/^room_[2-6]$/.test(room.backgroundKey))).toBe(true);
  });

  it('uses a moderate challenge curve above Level 2 without permanent-collapse dead ends', () => {
    const platforms = levelThree.rooms.flatMap((room) => room.platforms || []);
    expect(platforms.filter((platform) => platform.collapseDelayMs)).toHaveLength(0);
    expect(platforms.filter((platform) => platform.disappearEveryMs)).toHaveLength(2);
    expect(platforms.filter((platform) => platform.moveAxis).length).toBeGreaterThanOrEqual(7);
    expect(platforms.some((platform) => platform.hazardType === 'laser')).toBe(false);
    const runtimeLevel = prepareGameOneRuntimeLevelData(levelThree);
    expect(runtimeLevel.rooms.some((room) => room.coins.some((pickup) => pickup.collectibleType === 'poison'))).toBe(false);
    expect(platforms.some((platform) => platform.hazardType === 'spikedBall')).toBe(false);
    const roomOnePlatforms = levelThree.rooms[0].platforms;
    expect(roomOnePlatforms.find(({ id }) => id === 'r2-lift')).toMatchObject({
      moveAxis: 'y',
      moveDistance: -105,
    });
    expect(roomOnePlatforms.some(({ disappearEveryMs }) => disappearEveryMs)).toBe(false);
    expect(roomOnePlatforms.some(({ collapseDelayMs }) => collapseDelayMs)).toBe(false);
    const roomTwoPlatforms = levelThree.rooms[1].platforms;
    expect(roomTwoPlatforms.find(({ id }) => id === 'r1-middle-static')?.moveAxis).toBeUndefined();
    expect(roomTwoPlatforms.find(({ id }) => id === 'r1-high-shuttle')?.moveAxis).toBeUndefined();
    expect(roomTwoPlatforms.find(({ id }) => id === 'r1-scroll-shuttle')?.moveAxis).toBeUndefined();
    expect(levelThree.rooms[2].platforms.find(({ id }) => id === 'r3-center-shuttle')?.moveAxis).toBeUndefined();
    expect(levelThree.rooms[2].ghosts.find(({ id }) => id === 'r3-ghost')).toMatchObject({
      x: 920,
      y: 565,
    });
    expect(levelThree.rooms[0].portal).toMatchObject({
      targetRoomId: 'room-2',
      requiredKeys: 1,
      requiredScrollId: 'scroll-2',
    });
    expect(levelThree.rooms[1].portal).toMatchObject({
      targetRoomId: 'room-3',
      requiredKeys: 2,
      requiredScrollId: 'scroll-1',
    });
  });

  it('keeps all three Operator Seals at the compact collectible size', () => {
    const seals = levelThree.rooms.flatMap((room) => room.coins || [])
      .filter(({ collectibleType }) => collectibleType === 'key');
    expect(seals.map(({ size }) => size)).toEqual([34, 34, 34]);
    expect(seals.map(({ spriteFrame }) => spriteFrame)).toEqual(['key-blue', 'key-red', 'key-green']);
  });

  it('keeps Room 4 free of removed statues and allows direct entry to Room 5', () => {
    const roomFour = levelThree.rooms[3];
    expect(roomFour.villain).toBeUndefined();
    expect(roomFour.portal).toMatchObject({
      locked: false,
      targetRoomId: 'room-5',
    });
    expect(roomFour.portal.requiredQuestionIds).toBeUndefined();
    expect(levelThree.questions.some(({ id }) => id.startsWith('operator-gate-'))).toBe(false);
  });

  it('uses the three-attempt OPERATOR treasure challenge', () => {
    const question = levelThree.questions.find(({ id }) => id === levelThree.treasureQuestionId);
    expect(question).toMatchObject({
      challengeType: 'WORD_SCRAMBLE',
      jumbledWord: 'RATOPERO',
      answer: 'OPERATOR',
      maxAttempts: 3,
      damageOnWrongAnswer: 1,
      lockAttemptSessionOnClose: true,
    });
    expect(question.failureMessages).toHaveLength(3);
    expect(levelThree.rooms[4].portal).toMatchObject({
      appearance: 'TREASURE_CHEST',
      requiredCoins: 3,
      questionId: 'operator-core-riddle',
    });
  });
});
