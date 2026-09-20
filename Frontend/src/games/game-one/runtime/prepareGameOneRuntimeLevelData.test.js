import { describe, expect, it } from 'vitest';

import { prepareGameOneRuntimeLevelData } from './prepareGameOneRuntimeLevelData';
import levelOne from '../data/levels/level-01.json';
import levelTwo from '../data/levels/level-02.json';
import levelThree from '../data/levels/level-03-operators.json';
import levelFour from '../data/levels/level-04.json';
import levelFive from '../data/levels/level-05.json';

describe('prepareGameOneRuntimeLevelData', () => {
  it('removes only poison pickups that do not have a visible supporting platform', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      rooms: [{
        platforms: [{ id: 'safe-platform', x: 300, y: 500, width: 152, bodyHeight: 34 }],
        coins: [
          { id: 'supported', collectibleType: 'poison', x: 300, y: 440 },
          { id: 'floating', collectibleType: 'poison', x: 800, y: 440 },
          { id: 'regular-coin', collectibleType: 'coin', x: 800, y: 440 },
        ],
        ghosts: [],
      }],
    });
    expect(levelData.rooms[0].coins.map(({ id }) => id)).toEqual(['supported', 'regular-coin']);
  });

  it('replaces stale published Level 1 Scroll clues with the canonical target-aligned text', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      levelNumber: 1,
      rooms: [{
        platforms: [],
        ghosts: [],
        coins: [
          { id: 'scroll-1', collectibleType: 'scroll', scrollId: 'scroll-1', clueText: 'Old clue 1' },
          { id: 'scroll-2', collectibleType: 'scroll', scrollId: 'scroll-2', clueText: 'A true path opens when a condition is satisfied.' },
          { id: 'scroll-3', collectibleType: 'scroll', scrollId: 'scroll-3', clueText: 'Old clue 3' },
        ],
      }],
    });
    const scrolls = levelData.rooms[0].coins.filter(({ collectibleType }) => collectibleType === 'scroll');
    expect(scrolls.map(({ clueText }) => clueText)).toEqual([
      expect.stringContaining('reusable name'),
      expect.stringContaining('updated while the program runs'),
      expect.stringContaining('named storage place'),
    ]);
    expect(scrolls.some(({ clueText }) => clueText.includes('condition is satisfied'))).toBe(false);
  });

  it('corrects stale published Level 1 Room 4 movement and ghost placement', () => {
    const rooms = Array.from({ length: 4 }, (_, index) => ({
      id: `room-${index + 1}`,
      platforms: [],
      coins: [],
      ghosts: [],
    }));
    rooms[3] = {
      id: 'room-4',
      platforms: [{
        id: 'room4-moving', moveAxis: 'x', moveDistance: 80, moveDuration: 2400,
      }],
      coins: [],
      ghosts: [{ id: 'room4-ghost', enemyType: 'ghost', x: 384, y: 500, chasePlayer: true }],
    };

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 1, rooms });

    expect(levelData.rooms[3].platforms[0]).toMatchObject({
      id: 'room4-moving', moveAxis: 'y', moveDistance: 114, moveDuration: 1900,
    });
    expect(levelData.rooms[3].ghosts[0]).toMatchObject({
      id: 'room4-ghost', x: 920, y: 520,
    });
  });

  it('keeps both stale published Level 1 Room 5 platforms permanently solid', () => {
    const rooms = Array.from({ length: 5 }, (_, index) => ({
      id: `room-${index + 1}`,
      platforms: [],
      coins: [],
      ghosts: [],
    }));
    rooms[4] = {
      id: 'room-5',
      platforms: [
        { id: 'room5-step-2', disappearEveryMs: 2200 },
        { id: 'room5-step-4', disappearEveryMs: 1800, collapseDelayMs: 500 },
      ],
      coins: [],
      ghosts: [],
    };

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 1, rooms });
    const fixedPlatforms = levelData.rooms[4].platforms;

    expect(fixedPlatforms).toHaveLength(2);
    expect(fixedPlatforms.every((platform) => (
      platform.disappearEveryMs === undefined && platform.collapseDelayMs === undefined
    ))).toBe(true);
  });

  it('corrects stale published Level 2 Room 3 to 5 platform behavior', () => {
    const rooms = Array.from({ length: 5 }, (_, index) => ({
      id: `room-${index + 1}`,
      platforms: [],
      coins: [],
      ghosts: [],
    }));
    rooms[2].platforms = [{ id: 'r3-c', moveAxis: 'x', moveDistance: 80, moveDuration: 1800 }];
    rooms[3].platforms = [
      { id: 'r4-b', moveAxis: 'x', moveDistance: -95, moveDuration: 1800 },
      { id: 'r4-d', disappearEveryMs: 2100 },
    ];
    rooms[4].platforms = [
      { id: 'r5-a', moveAxis: 'y', moveDistance: -55, moveDuration: 1650 },
      { id: 'r5-b', disappearEveryMs: 1900 },
      { id: 'r5-c', moveAxis: 'x', moveDistance: 75, moveDuration: 1700 },
      { id: 'r5-d', disappearEveryMs: 1650 },
    ];

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 2, rooms });

    expect(levelData.rooms[2].platforms[0].moveAxis).toBeUndefined();
    expect(levelData.rooms[3].platforms.find(({ id }) => id === 'r4-b').moveAxis).toBeUndefined();
    expect(levelData.rooms[3].platforms.find(({ id }) => id === 'r4-d').disappearEveryMs).toBeUndefined();
    expect(levelData.rooms[4].platforms.find(({ id }) => id === 'r5-a').moveAxis).toBeUndefined();
    expect(levelData.rooms[4].platforms.find(({ id }) => id === 'r5-c').moveAxis).toBeUndefined();
    expect(levelData.rooms[4].platforms.find(({ id }) => id === 'r5-b').disappearEveryMs).toBe(1900);
    expect(levelData.rooms[4].platforms.find(({ id }) => id === 'r5-d').disappearEveryMs).toBeUndefined();
  });

  it('corrects stale published Level 3 platform, poison, and Room 3 ghost data', () => {
    const rooms = Array.from({ length: 4 }, (_, index) => ({
      id: `room-${index + 1}`,
      platforms: [],
      coins: [{ id: `poison-${index + 1}`, collectibleType: 'poison', x: 300, y: 440 }],
      ghosts: [],
    }));
    rooms[1].platforms = [
      { id: 'r1-high-shuttle', moveAxis: 'x', moveDistance: 115, moveDuration: 1650 },
      { id: 'r1-scroll-shuttle', moveAxis: 'x', moveDistance: -70, moveDuration: 1800 },
    ];
    rooms[2].platforms = [
      { id: 'r3-center-shuttle', moveAxis: 'x', moveDistance: 75, moveDuration: 1950 },
    ];
    rooms[2].ghosts = [
      { id: 'r3-ghost', enemyType: 'ghost', x: 560, y: 565, chasePlayer: true },
    ];

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 3, rooms });

    expect(levelData.rooms.flatMap(({ coins }) => coins)
      .some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
    expect(levelData.rooms[1].platforms.every(({ moveAxis }) => !moveAxis)).toBe(true);
    expect(levelData.rooms[2].platforms[0].moveAxis).toBeUndefined();
    expect(levelData.rooms[2].ghosts[0]).toMatchObject({ x: 920, y: 565 });
  });

  it('corrects stale published Level 4 platform, ghost, and fire-shooter data', () => {
    const rooms = Array.from({ length: 5 }, (_, index) => ({
      id: `room-${index + 1}`, platforms: [], coins: [], ghosts: [], projectileEnemies: [],
    }));
    rooms[0].platforms = [{ id: 'r1-scroll-shuttle', x: 920, moveAxis: 'x', moveDistance: -70 }];
    rooms[0].ghosts = [{ id: 'r1-ghost', enemyType: 'ghost', x: 700, y: 570 }];
    rooms[1].platforms = [{ id: 'r2-shuttle', moveAxis: 'x', moveDistance: 60 }];
    rooms[2].platforms = [
      { id: 'r3-left-lift', moveAxis: 'y', moveDistance: -85 },
      { id: 'r3-right-lift', moveAxis: 'y', moveDistance: -85 },
    ];
    rooms[3].ghosts = [
      { id: 'r4-shadow-spirit', enemyType: 'shadowspirit', x: 470, y: 400 },
      { id: 'r4-ghost', enemyType: 'ghost', x: 600, y: 565 },
    ];
    rooms[3].projectileEnemies = [{ id: 'r4-elemental', enemyType: 'elemental', x: 940, y: 330 }];
    rooms[4].platforms = [
      { id: 'r5-lift', moveAxis: 'y', moveDistance: -95 },
      { id: 'r5-shuttle', moveAxis: 'x', moveDistance: 75 },
      { id: 'r5-final-lift', moveAxis: 'y', moveDistance: -85 },
    ];
    rooms[4].ghosts = [{ id: 'r5-ghost', enemyType: 'ghost', x: 540, y: 565 }];

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 4, rooms });

    expect(levelData.rooms[0].platforms[0]).toMatchObject({ x: 830 });
    expect(levelData.rooms[0].platforms[0].moveAxis).toBeUndefined();
    expect(levelData.rooms[0].ghosts).toContainEqual(expect.objectContaining({
      id: 'r1-shadow-spirit', enemyType: 'shadowspirit', x: 895,
    }));
    expect(levelData.rooms[0].ghosts).toContainEqual(expect.objectContaining({
      id: 'r1-ghost', visualOriginY: 0.44,
    }));
    expect(levelData.rooms[1].platforms[0].moveAxis).toBeUndefined();
    expect(levelData.rooms[2].platforms.every(({ moveAxis }) => !moveAxis)).toBe(true);
    expect(levelData.rooms[3].ghosts[0]).toMatchObject({ id: 'r4-ghost', x: 920 });
    expect(levelData.rooms[3].ghosts.some(({ id }) => id === 'r4-shadow-spirit')).toBe(false);
    expect(levelData.rooms[3].projectileEnemies[0]).toMatchObject({ y: 390 });
    expect(levelData.rooms[4].platforms.every(({ moveAxis }) => !moveAxis)).toBe(true);
    expect(levelData.rooms[4].ghosts[0]).toMatchObject({ x: 920 });
  });

  it('corrects stale published Level 5 platform and poison-replacement data', () => {
    const rooms = Array.from({ length: 5 }, (_, index) => ({
      id: `room-${index + 1}`, platforms: [], coins: [], ghosts: [], projectileEnemies: [],
    }));
    rooms[0].platforms = [
      { id: 'r1-high-shuttle', moveAxis: 'x', moveDistance: 115 },
      { id: 'r1-scroll-shuttle', x: 900, y: 535, moveAxis: 'x', moveDistance: -70 },
    ];
    rooms[0].coins = [{ id: 'old-poison-1', collectibleType: 'poison' }];
    rooms[1].platforms = [
      { id: 'r2-lower-one' },
      { id: 'r2-shuttle', moveAxis: 'x', moveDistance: 60 },
    ];
    rooms[4].platforms = [{ id: 'r5-shuttle', moveAxis: 'x', moveDistance: 85 }];
    rooms[4].coins = [{ id: 'old-poison-5', collectibleType: 'poison' }];

    const levelData = prepareGameOneRuntimeLevelData({ levelNumber: 5, rooms });

    expect(levelData.rooms[0].platforms.every(({ moveAxis }) => !moveAxis)).toBe(true);
    expect(levelData.rooms[0].platforms[1]).toMatchObject({ x: 815, y: 480 });
    expect(levelData.rooms[0].coins).toHaveLength(0);
    expect(levelData.rooms[0].ghosts).toContainEqual(expect.objectContaining({
      id: 'r1-shadow-spirit', enemyType: 'shadowspirit',
    }));
    expect(levelData.rooms[1].platforms[0]).toMatchObject({
      moveAxis: 'x', moveDistance: 60, moveDuration: 2050,
    });
    expect(levelData.rooms[1].platforms[1].moveAxis).toBeUndefined();
    expect(levelData.rooms[4].platforms[0].moveAxis).toBeUndefined();
    expect(levelData.rooms[4].coins).toHaveLength(0);
  });

  it('resolves background tile images without clamping multi-room world coordinates', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      version: 2,
      gameType: 'GAME_ONE',
      viewport: { width: 1280, height: 720 },
      grid: {
        cells: [
          { id: 'room-1', col: 0, row: 0, backgroundColor: '#F97316' },
          { id: 'room-2', col: 1, row: 0, backgroundColor: 'bad-color' },
        ],
      },
      worldObjects: {
        platforms: [],
        backgroundTiles: [
          {
            id: 'room-2-moss',
            tileKey: 'tile-moss',
            x: 1540,
            y: 320,
            size: 144,
            zIndex: 4,
          },
        ],
      },
    }, {
      platformTileByKey: {
        'tile-moss': {
          url: '/moss.png',
          blendMode: 'screen',
        },
      },
    });

    expect(levelData.grid.cells[0].backgroundColor).toBe('#f97316');
    expect(levelData.grid.cells[1].backgroundColor).toBe('#111827');
    expect(levelData.worldObjects.platforms).toEqual([]);
    expect(levelData.worldObjects.backgroundTiles).toEqual([
      expect.objectContaining({
        id: 'room-2-moss',
        tileKey: 'tile-moss',
        imageUrl: '/moss.png',
        textureKey: 'runtime-bg-room-2-moss',
        x: 1540,
        y: 320,
        size: 144,
        zIndex: 4,
        renderLayer: 'back',
        blendMode: 'screen',
      }),
    ]);
  });

  it('replaces legacy backend laser hazards with poison pickups at runtime', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      viewport: { width: 1280, height: 720 },
      worldObjects: {
        platforms: [{
          id: 'room-laser', x: 640, y: 672, width: 152, bodyHeight: 16,
          textureKey: 'stone', hazard: true, hazardType: 'laser',
          hazardSpriteFrame: 'laser', damage: 1,
        }],
        coins: [],
      },
    });

    expect(levelData.worldObjects.platforms[0]).toMatchObject({
      id: 'room-laser-poison-platform', x: 640, y: 672, textureKey: 'stone',
    });
    expect(levelData.worldObjects.platforms[0].hazard).toBeUndefined();
    expect(levelData.worldObjects.platforms[0].hazardType).toBeUndefined();
    expect(levelData.worldObjects.coins[0]).toEqual({
      id: 'room-laser-poison', collectibleType: 'poison',
      spriteFrame: 'poison-potion-black', x: 640, y: 610, size: 44,
    });
  });

  it('replaces lasers stored inside room-based level data with image pickups', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      viewport: { width: 1280, height: 720 },
      rooms: [{
        id: 'room-3',
        platforms: [{
          id: 'room-3-laser', x: 820, y: 672, width: 152, bodyHeight: 16,
          textureKey: 'stone', hazard: true, hazardType: 'laser',
          hazardSpriteFrame: 'laser', damage: 1,
        }],
        coins: [],
      }],
    });

    expect(levelData.rooms[0].platforms[0].hazardType).toBeUndefined();
    expect(levelData.rooms[0].coins[0]).toMatchObject({
      collectibleType: 'poison',
      spriteFrame: 'poison-potion-black',
      x: 820,
      y: 610,
      size: 44,
    });
  });

  it('removes Level 5 poison when its former fire platform is no longer present', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      levelNumber: 5,
      rooms: [{
        id: 'room-1',
        platforms: [
          { id: 'start', x: 120, y: 672, width: 190, bodyHeight: 34 },
          { id: 'fire-left', x: 380, y: 672, width: 76, bodyHeight: 16, hazard: true, hazardType: 'fire', hazardSpriteFrame: 'fireball' },
          { id: 'fire-right', x: 940, y: 672, width: 76, bodyHeight: 16, hazard: true, hazardType: 'fire', hazardSpriteFrame: 'fireball' },
        ],
        coins: [],
      }],
    });

    expect(levelData.rooms[0].platforms.some(({ hazardType }) => hazardType === 'fire')).toBe(false);
    expect(levelData.rooms[0].ghosts.some(({ id }) => id.endsWith('-patrol-ghost'))).toBe(false);
    expect(levelData.rooms[0].coins.some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
  });

  it('removes every slime variant from room-based and flattened runtime data', () => {
    const levelData = prepareGameOneRuntimeLevelData({
      worldObjects: {
        ghosts: [
          { id: 'green-world', enemyType: 'slimegreen' },
          { id: 'ghost-world', enemyType: 'ghost' },
        ],
      },
      rooms: [{
        platforms: [], coins: [],
        ghosts: [
          { id: 'green-room', enemyType: 'slime-green' },
          { id: 'orange-room', enemyType: 'slimeorange' },
          { id: 'purple-room', enemyType: 'slimepurple' },
          { id: 'normal-ghost', enemyType: 'ghost' },
        ],
      }],
    });

    expect(levelData.worldObjects.ghosts.map(({ id }) => id)).toEqual(['ghost-world']);
    expect(levelData.rooms[0].ghosts.map(({ id }) => id)).toEqual(['normal-ghost']);
  });

  it('removes Level 4 poison while preserving its platform-removal and ghost layout', () => {
    const levelData = prepareGameOneRuntimeLevelData(levelFour);
    const platformIds = levelData.rooms.flatMap((room) => room.platforms.map(({ id }) => id));
    expect(platformIds).not.toContain('r2-lower-two');
    expect(platformIds).not.toContain('r4-fire');
    expect(platformIds).not.toContain('r5-fire-left');
    expect(platformIds).not.toContain('r5-fire-right');

    expect(levelData.rooms.every((room) => (
      room.coins.every(({ collectibleType }) => collectibleType !== 'poison')
    ))).toBe(true);
    expect(levelData.rooms[1].ghosts.some(({ id }) => id === 'r2-marked-patrol-ghost')).toBe(false);
    expect(levelData.rooms[3].ghosts.some(({ id }) => id === 'r4-marked-patrol-ghost')).toBe(false);
    expect(levelData.rooms[3].ghosts.filter(({ enemyType }) => enemyType === 'ghost')).toEqual([
      expect.objectContaining({ id: 'r4-ghost', chasePlayer: true }),
    ]);
  });

  it('applies the marked Level 3 platform-removal and patrol-ghost layout', () => {
    const levelData = prepareGameOneRuntimeLevelData(levelThree);
    const platformIds = levelData.rooms.flatMap((room) => room.platforms.map(({ id }) => id));
    [
      'r1-right-lift', 'r3-fire', 'r4-rest',
      'r5-right-rest', 'r5-fire-left', 'r5-fire-right',
    ].forEach((id) => expect(platformIds).not.toContain(id));

    expect(levelData.rooms[1].ghosts.find(({ id }) => id === 'level3-r2-marked-patrol-ghost')).toMatchObject({
      x: 895, y: 600, chasePlayer: false,
    });
    expect(levelData.rooms[3].ghosts.some(({ id }) => id === 'level3-r4-marked-patrol-ghost')).toBe(false);
  });

  it('removes Level 2 poison while preserving its platform-removal and patrol-ghost layout', () => {
    const levelData = prepareGameOneRuntimeLevelData(levelTwo);
    const platformIds = levelData.rooms.flatMap((room) => room.platforms.map(({ id }) => id));
    expect(platformIds).not.toContain('r5-fire-1');
    expect(levelData.rooms[1].coins.some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
    expect(levelData.rooms[3].coins.some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
    expect(levelData.rooms[4].coins.some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
    expect(levelData.rooms[2].ghosts.some(({ id }) => id === 'level2-r3-marked-patrol-ghost')).toBe(false);
  });

  it('moves the Level 5 Room 3 poison allocation to Room 2 and removes the marked objects', () => {
    const levelData = prepareGameOneRuntimeLevelData(levelFive);
    const platformIds = levelData.rooms.flatMap((room) => room.platforms.map(({ id }) => id));
    ['r2-lift', 'r5-fire-left', 'r5-fire-right'].forEach((id) => {
      expect(platformIds).not.toContain(id);
    });
    expect(levelData.rooms[1].coins.filter(({ collectibleType }) => collectibleType === 'poison')).toHaveLength(0);
    expect(levelData.rooms[2].coins.some(({ collectibleType }) => collectibleType === 'poison')).toBe(false);
    expect(levelData.rooms[2].coins.some(({ id }) => id === 'r3-jump')).toBe(false);
  });

  it.each([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
    [5, [2, 4]],
  ])('adds poison only to the configured rooms for level %i', (levelNumber, expectedRooms) => {
    const rooms = Array.from({ length: 5 }, (_, index) => ({
      id: `room-${index + 1}`,
      platforms: Array.from({ length: 4 }, (_, platformIndex) => ({
        id: `room-${index + 1}-step-${platformIndex + 1}`,
        x: 300 + (platformIndex * 150),
        y: 560 - (platformIndex * 40),
        width: 152, bodyHeight: 34, textureKey: 'stone',
      })),
      coins: [],
    }));
    const levelData = prepareGameOneRuntimeLevelData({ levelNumber, rooms });
    const poisonRooms = levelData.rooms
      .map((room, index) => room.coins.some(({ collectibleType }) => collectibleType === 'poison') ? index + 1 : null)
      .filter(Boolean);

    expect(poisonRooms).toEqual(expectedRooms);
    levelData.rooms.forEach((room, index) => {
      expect(room.platforms).toEqual(rooms[index].platforms);
      const poison = room.coins.find(({ collectibleType }) => collectibleType === 'poison');
      if (poison) {
        expect(Number.isFinite(poison.x)).toBe(true);
      }
    });
    if (levelNumber === 1) {
      expect(levelData.rooms.every((room) => (
        room.coins.every(({ collectibleType }) => collectibleType !== 'poison')
      ))).toBe(true);
    }
  });

  it('replaces Level 1 floor fire with patrol ghosts but preserves the firing elemental', () => {
    const levelData = prepareGameOneRuntimeLevelData(levelOne);
    const roomThreePoison = levelData.rooms[2].coins
      .find(({ collectibleType }) => collectibleType === 'poison');
    const roomFiveShield = levelData.rooms[4].coins
      .find(({ collectibleType }) => collectibleType === 'shield');

    expect(roomThreePoison).toBeUndefined();
    expect(levelData.rooms.every((room) => (
      room.coins.every(({ collectibleType }) => collectibleType !== 'poison')
    ))).toBe(true);
    expect(roomFiveShield).toMatchObject({ x: 312, y: 507 });
    expect(levelData.rooms.flatMap((room) => room.platforms)
      .some(({ hazardType }) => hazardType === 'fire')).toBe(false);
    expect(levelData.rooms.flatMap((room) => room.projectileEnemies || [])
      .some(({ enemyType }) => enemyType === 'elemental')).toBe(true);
    expect(levelData.rooms[4].ghosts.some(({ id }) => id.endsWith('-patrol-ghost')))
      .toBe(false);
    expect(levelData.rooms[1].ghosts.find(({ id }) => id === 'room2-ghost'))
      .toMatchObject({ chasePlayer: true, chaseDelayMs: 1000 });
  });
});
