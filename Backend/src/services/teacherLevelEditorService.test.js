const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { __test__ } = require('./teacherLevelEditorService');

describe('teacherLevelEditorService GAME_ONE room conversion', () => {
  it('converts room-local invisible platform coordinates into runtime world coordinates', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-b',
            name: 'Lower room',
            row: 1,
            col: 0,
            components: [
              {
                id: 'invisible-1',
                type: 'invisiblePlatform',
                x: 300,
                y: 480,
                width: 220,
                height: 36,
              },
            ],
          },
        ],
      },
    });

    assert.deepEqual(
      {
        id: levelData.worldObjects.invisiblePlatforms[0].id,
        x: levelData.worldObjects.invisiblePlatforms[0].x,
        y: levelData.worldObjects.invisiblePlatforms[0].y,
        width: levelData.worldObjects.invisiblePlatforms[0].width,
        height: levelData.worldObjects.invisiblePlatforms[0].height,
        invisible: levelData.worldObjects.invisiblePlatforms[0].invisible,
      },
      {
        id: 'room-b-invisible-1',
        x: 312,
        y: 1224,
        width: 240,
        height: 48,
        invisible: true,
      },
    );
  });

  it('does not double-offset legacy invisible platforms after normalization moves them to the matching room', () => {
    const normalized = __test__.normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            {
              id: 'legacy-invisible',
              type: 'invisiblePlatform',
              x: 300,
              y: 1200,
              width: 220,
              height: 36,
            },
          ],
        },
        {
          id: 'room-b',
          row: 1,
          col: 0,
          components: [],
        },
      ],
    });
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: normalized,
    });

    assert.equal(normalized.rooms[0].components.length, 0);
    assert.equal(normalized.rooms[1].components[0].y, 504);
    assert.equal(levelData.worldObjects.invisiblePlatforms[0].id, 'room-b-legacy-invisible');
    assert.equal(levelData.worldObjects.invisiblePlatforms[0].y, 1224);
  });

  it('offsets decorative background tiles into playable world coordinates without creating platforms', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            components: [],
          },
          {
            id: 'room-b',
            row: 0,
            col: 1,
            components: [],
            backgroundTiles: [
              {
                id: 'moss-1',
                tileKey: 'tile-moss',
                x: 180,
                y: 320,
                size: 144,
              },
            ],
          },
        ],
      },
    });

    assert.deepEqual(levelData.worldObjects.platforms, []);
    assert.deepEqual(levelData.worldObjects.backgroundTiles[0], {
      id: 'room-b-moss-1',
      tileKey: 'tile-moss',
      x: 1476,
      y: 320,
      renderLayer: 'back',
      size: 144,
      zIndex: 0,
      rotationDeg: 0,
      flipX: false,
      flipY: false,
    });
  });

  it('drops removed platform and barrier components during normalization', () => {
    const normalized = __test__.normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            { id: 'platform-1', type: 'platform', x: 200, y: 400, width: 220 },
            { id: 'barrier-1', type: 'barrier', x: 240, y: 420, width: 72, height: 176 },
            { id: 'coin-1', type: 'coin', x: 320, y: 360 },
          ],
        },
      ],
    });

    assert.deepEqual(
      normalized.rooms[0].components.map((component) => component.type),
      ['coin'],
    );
  });

  it('does not synthesize portals for rooms without explicit portal components', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            components: [
              { id: 'coin-1', type: 'coin', x: 320, y: 360 },
            ],
          },
          {
            id: 'room-b',
            row: 0,
            col: 1,
            components: [],
          },
        ],
      },
    });

    assert.deepEqual(levelData.worldObjects.portal, []);
  });

  it('exports question statues with the editor statue texture and size', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            components: [
              {
                id: 'statue-1',
                type: 'statue',
                x: 640,
                y: 520,
                prompt: 'What is a CPU?',
                choices: ['Processor', 'Storage'],
                correctAnswerIndex: 0,
              },
            ],
          },
        ],
      },
    });

    assert.deepEqual(
      {
        id: levelData.worldObjects.villain[0].id,
        appearance: levelData.worldObjects.villain[0].appearance,
        textureKey: levelData.worldObjects.villain[0].textureKey,
        size: levelData.worldObjects.villain[0].size,
      },
      {
        id: 'room-a-statue-1',
        appearance: 'STATUE',
        textureKey: 'teacher-statue-elem12',
        size: 212,
      },
    );
  });

  it('maps portal3 and enemy variants into playable world objects', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            components: [
              {
                id: 'portal-3-a',
                type: 'portal3',
                x: 1000,
                y: 540,
                linkName: 'gate-a',
                locked: true,
              },
              {
                id: 'villain-one',
                type: 'villain1',
                x: 760,
                y: 560,
                fireDirection: 'RIGHT',
              },
              {
                id: 'slime-green',
                type: 'slimeGreen',
                x: 620,
                y: 560,
                movementDirection: 'UP',
              },
              {
                id: 'slime-orange',
                type: 'slimeOrange',
                x: 680,
                y: 560,
                speed: 95,
              },
              {
                id: 'spirit-boss',
                type: 'boss',
                x: 900,
                y: 560,
                hitPoints: 20,
              },
            ],
          },
        ],
      },
    });

    const portal = levelData.worldObjects.portal.find((entry) => entry.id === 'room-a-portal-3-a');
    const villain1 = levelData.worldObjects.projectileEnemies.find((entry) => entry.id === 'room-a-villain-one');
    const slimeGreen = levelData.worldObjects.ghosts.find((entry) => entry.id === 'room-a-slime-green');
    const slimeOrange = levelData.worldObjects.ghosts.find((entry) => entry.id === 'room-a-slime-orange');
    const boss = levelData.worldObjects.projectileEnemies.find((entry) => entry.id === 'room-a-spirit-boss');

    assert.equal(portal.variant, 'portal3');
    assert.equal(portal.linkName, 'gate-a');
    assert.equal(portal.locked, true);

    assert.equal(villain1.enemyType, 'villain1');
    assert.equal(villain1.fireDirection, 'RIGHT');
    assert.equal(villain1.hitPoints, 2);

    assert.equal(slimeGreen.enemyType, 'slimegreen');
    assert.equal(slimeGreen.movementDirection, 'UP');

    assert.equal(slimeOrange.enemyType, 'slimeorange');
    assert.equal(slimeOrange.speed, 95);

    assert.equal(boss.enemyType, 'spiritboss');
    assert.equal(boss.hitPoints, 20);
  });

  it('preserves target-room portals for multi-room teacher levels', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 2,
      roomChunkData: {
        rooms: [
          {
            id: 'room-1',
            row: 0,
            col: 0,
            components: [
              {
                id: 'portal-next',
                type: 'portal',
                x: 1000,
                y: 540,
                targetRoomId: 'room-2',
                endsLevel: false,
              },
            ],
          },
          {
            id: 'room-2',
            row: 0,
            col: 1,
            components: [],
          },
        ],
      },
    });

    const portal = levelData.worldObjects.portal.find((entry) => entry.id === 'room-1-portal-next');

    assert.equal(portal.targetRoomId, 'room-2');
    assert.equal(portal.endsLevel, false);
  });

  it('propagates spawn health and ability toggles into playable settings', () => {
    const levelData = __test__.buildPlayableLevelDataFromRoomChunk({
      teacherId: 'teacher-1',
      levelNumber: 1,
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            components: [
              {
                id: 'spawn-a',
                type: 'spawn',
                x: 160,
                y: 560,
                health: 7,
                allowMidairDash: true,
                allowProjectile: false,
                allowDoubleJump: false,
                jumpHeight: 220,
                dashMode: 'BOTH',
                dashDistance: 300,
                projectileDamage: 4,
                projectileBurstCount: 3,
              },
            ],
          },
        ],
      },
    });

    assert.equal(levelData.worldObjects.spawn.health, 7);
    assert.equal(levelData.worldObjects.spawn.allowMidairDash, true);
    assert.equal(levelData.worldObjects.spawn.allowProjectile, false);
    assert.equal(levelData.worldObjects.spawn.allowDoubleJump, false);
    assert.equal(levelData.worldObjects.spawn.jumpHeight, 220);
    assert.equal(levelData.worldObjects.spawn.dashMode, 'BOTH');
    assert.equal(levelData.worldObjects.spawn.dashDistance, 300);
    assert.equal(levelData.worldObjects.spawn.projectileDamage, 4);
    assert.equal(levelData.worldObjects.spawn.projectileBurstCount, 3);
    assert.equal(levelData.settings.playerHealth, 7);
    assert.equal(levelData.settings.allowMidairDash, true);
    assert.equal(levelData.settings.allowProjectile, false);
    assert.equal(levelData.settings.allowDoubleJump, false);
  });
});
