import { describe, expect, it } from 'vitest';

import levelOne from './level-01.json';

describe('Game 1 Level 1 treasure hunt', () => {
  it('starts from the authored Room 1 spawn', () => {
    expect(levelOne.startRoomId).toBeUndefined();
    expect(levelOne.rooms[0].id).toBe('room-1');
    expect(levelOne.rooms[0].spawn).toEqual({ x: 100, y: 570 });
  });

  it('defines the complete five-room mission flow', () => {
    expect(levelOne.treasureHunt).toBe(true);
    expect(levelOne.rooms).toHaveLength(5);
    expect(levelOne.rooms.slice(0, 4).map((room) => room.portal?.targetRoomId)).toEqual([
      'room-2', 'room-3', 'room-4', 'room-5',
    ]);
  });

  it('places one scroll clue in each exploration room', () => {
    const explorationRooms = levelOne.rooms.slice(1, 4);
    const scrolls = explorationRooms.flatMap((room) => room.coins || [])
      .filter((pickup) => pickup.collectibleType === 'scroll');
    expect(scrolls.map((scroll) => scroll.id)).toEqual(['scroll-1', 'scroll-2', 'scroll-3']);
    expect(levelOne.settings.coinGoal).toBe(0);
    expect(explorationRooms[0].portal.requiredKeys).toBe(2);
    expect(explorationRooms.map((room) => room.portal.requiredScrollId)).toEqual(['scroll-1', 'scroll-2', 'scroll-3']);
  });

  it('ends at a treasure chest with only the authored final treasure riddle', () => {
    const finalRoom = levelOne.rooms[4];

    expect(levelOne.questions).toHaveLength(1);
    expect(levelOne.questions[0].choices[levelOne.questions[0].answerIndex]).toBe('VARIABLE');
    expect(levelOne.questions[0]).toMatchObject({
      challengeType: 'WORD_SCRAMBLE',
      maxAttempts: 3,
      jumbledWord: 'AIBLERVE',
      answer: 'VARIABLE',
      damageOnWrongAnswer: 1,
    });
    expect(finalRoom.villain).toBeUndefined();
    expect(finalRoom.portal).toMatchObject({
      appearance: 'TREASURE_CHEST',
      endsLevel: true,
      requiredCoins: 3,
      questionId: 'java-treasure-riddle',
    });
  });

  it('uses only the requested room mechanics and approved Treasure Hunt sprite frames', () => {
    const pickupTypes = levelOne.rooms.flatMap((room) => room.coins || []).map((pickup) => pickup.collectibleType);
    const platforms = levelOne.rooms.flatMap((room) => room.platforms || []);

    expect(pickupTypes).toEqual(expect.arrayContaining(['coin', 'key', 'scroll', 'speed', 'jump', 'health', 'shield']));
    expect(pickupTypes).not.toContain('doubleJump');
    expect(platforms.some((platform) => platform.hazard)).toBe(true);
    expect(platforms.filter((platform) => platform.moveAxis)).toHaveLength(3);
    expect(platforms.filter((platform) => platform.disappearEveryMs)).toHaveLength(1);
    expect(levelOne.rooms.flatMap((room) => room.projectileEnemies || [])).toHaveLength(1);
    expect(levelOne.settings.allowDoubleJump).toBe(false);

    levelOne.rooms.flatMap((room) => room.coins || []).forEach((pickup) => {
      if (pickup.collectibleType === 'coin') {
        expect(pickup.spriteFrame).toBeUndefined();
      } else {
        expect(pickup.spriteFrame).toBeTruthy();
      }
    });
  });

  it('matches the exact enemy, hazard, and moving-platform room pattern', () => {
    const [mission, keys, spikes, moving, finalRoom] = levelOne.rooms;

    expect([mission.coins.length, mission.ghosts.length, mission.projectileEnemies.length]).toEqual([1, 0, 1]);
    expect(mission.projectileEnemies[0]).toMatchObject({ enemyType: 'elemental', fireDirection: 'LEFT' });
    expect(mission.platforms).toHaveLength(6);
    expect(mission.platforms.find((platform) => platform.id === 'room1-step-2')).toMatchObject({
      moveAxis: 'y', moveDistance: 55, moveDuration: 1900,
    });
    expect(mission.platforms.find((platform) => platform.id === 'room1-step-3'))
      .toMatchObject({ disappearEveryMs: 3200 });
    expect(new Set(mission.platforms.map((platform) => platform.width))).toEqual(new Set([114, 152, 190]));
    expect(mission.platforms.every((platform) => platform.bodyHeight === 34)).toBe(true);
    expect(mission.platforms.every((platform) => platform.width % 38 === 0)).toBe(true);
    expect(mission.ghosts
      .filter((enemy) => enemy.enemyType !== 'ghost')
      .every((enemy) => enemy.canJump === false)).toBe(true);
    expect(keys.coins.filter((pickup) => pickup.collectibleType === 'key')).toHaveLength(2);
    expect(keys.ghosts).toHaveLength(1);
    expect(spikes.platforms.filter((platform) => platform.hazardType === 'spikes')).toHaveLength(1);
    expect(spikes.platforms.filter((platform) => platform.moveAxis)).toHaveLength(1);
    expect(spikes.coins.some((pickup) => pickup.collectibleType === 'jump')).toBe(true);
    expect(spikes.ghosts.some((enemy) => enemy.enemyType === 'ghost' && enemy.chasePlayer)).toBe(true);
    expect(moving.platforms.filter((platform) => platform.moveAxis)).toHaveLength(1);
    expect(moving.platforms.find((platform) => platform.id === 'room4-moving')).toMatchObject({
      moveAxis: 'y',
      moveDistance: 114,
      moveDuration: 1900,
    });
    expect(moving.ghosts).toHaveLength(2);
    expect(moving.ghosts.find((enemy) => enemy.id === 'room4-ghost')).toMatchObject({
      chasePlayer: true,
      chaseDelayMs: 3000,
    });
    expect(moving.coins.some((pickup) => pickup.collectibleType === 'health')).toBe(true);
    expect(moving.ghosts.find((ghost) => ghost.id === 'room4-ghost')).toMatchObject({
      x: 920,
      y: 520,
    });
    expect(finalRoom.platforms.some((platform) => platform.hazardType === 'spikes')).toBe(true);
    expect(finalRoom.platforms.filter((platform) => platform.disappearEveryMs)).toHaveLength(0);
    expect(finalRoom.ghosts).toHaveLength(3);
  });

  it('uses the Teacher Editor tile grid consistently in every room', () => {
    levelOne.rooms.forEach((room) => {
      const playablePlatforms = room.platforms.filter((platform) => !platform.hazard);
      expect(playablePlatforms.every((platform) => platform.bodyHeight === 34)).toBe(true);
      expect(playablePlatforms.every((platform) => platform.width % 38 === 0)).toBe(true);
      expect(playablePlatforms.every((platform) => platform.x - (platform.width / 2) >= 48)).toBe(true);
      expect(playablePlatforms.every((platform) => platform.x + (platform.width / 2) <= 1232)).toBe(true);
      expect(playablePlatforms.every((platform) => platform.y + (platform.bodyHeight / 2) <= 696)).toBe(true);
      expect(room.ghosts
        .filter((enemy) => enemy.enemyType !== 'ghost')
        .every((enemy) => enemy.canJump === false)).toBe(true);
    });
  });

  it('varies platform lengths as the room challenges become harder', () => {
    const playableWidths = levelOne.rooms.map((room) => (
      room.platforms.filter((platform) => !platform.hazard).map((platform) => platform.width)
    ));

    expect(new Set(playableWidths[0]).size).toBeGreaterThan(1);
    expect(new Set(playableWidths[1]).size).toBeGreaterThan(1);
    expect(playableWidths[2]).toContain(76);
    expect(playableWidths[3]).toContain(76);
    expect(playableWidths[4].filter((width) => width === 76).length).toBeGreaterThanOrEqual(5);
  });

  it('restores the ghost challenge without changing the required room objectives', () => {
    expect(levelOne.rooms[0].projectileEnemies.some((enemy) => enemy.enemyType === 'elemental')).toBe(true);
    expect(levelOne.rooms[1].ghosts.some((enemy) => enemy.enemyType === 'ghost')).toBe(true);
    expect(levelOne.rooms[2].ghosts.some((enemy) => enemy.enemyType === 'ghost')).toBe(true);
    expect(levelOne.rooms[3].ghosts.some((enemy) => enemy.enemyType === 'ghost')).toBe(true);
    expect(levelOne.rooms[4].ghosts.some((enemy) => enemy.enemyType === 'ghost')).toBe(true);
  });

  it('makes ghosts chase the player and restores visible fire hazards', () => {
    const ghosts = levelOne.rooms.flatMap((room) => room.ghosts)
      .filter((enemy) => enemy.enemyType === 'ghost');
    const fires = levelOne.rooms.flatMap((room) => room.platforms)
      .filter((platform) => platform.hazardType === 'fire');

    expect(ghosts).toHaveLength(4);
    expect(ghosts.every((enemy) => enemy.chasePlayer === true)).toBe(true);
    expect(fires).toHaveLength(2);
    expect(levelOne.rooms.slice(0, 4).flatMap((room) => room.platforms)
      .some((platform) => platform.hazardType === 'fire')).toBe(false);
    expect(fires.every((fire) => fire.hazardSpriteFrame === 'fireball')).toBe(true);
  });
});
