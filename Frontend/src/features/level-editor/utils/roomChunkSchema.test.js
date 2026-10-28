import { describe, expect, it } from 'vitest';

import { normalizeRoomChunkData } from './roomChunkSchema';

describe('roomChunkSchema portal normalization', () => {
  it('normalizes level settings with defaults', () => {
    const normalized = normalizeRoomChunkData({
      settings: {
        playerHealth: 12,
        timerEnabled: true,
        timerSeconds: 5,
        sharedGridSnap: 999,
      },
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
        },
      ],
    });

    expect(normalized.settings).toEqual({
      backgroundKey: 'tutorialGrove',
      playerHealth: 10,
      timerEnabled: true,
      timerSeconds: 10,
      allowMidairDash: true,
      allowProjectile: true,
      allowDoubleJump: true,
      sharedGridSnap: 48,
    });
  });

  it('falls back from snap sizes that would leave partial canvas cells', () => {
    const normalized = normalizeRoomChunkData({
      settings: {
        sharedGridSnap: 40,
      },
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
        },
      ],
    });

    expect(normalized.settings.sharedGridSnap).toBe(48);
  });

  it('preserves spawn health and ability toggles', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            {
              id: 'spawn-1',
              type: 'spawn',
              x: 160,
              y: 560,
              health: 8,
              allowMidairDash: true,
              allowProjectile: false,
              allowDoubleJump: false,
            },
          ],
        },
      ],
    });

    expect(normalized.rooms[0].components[0]).toMatchObject({
      type: 'spawn',
      health: 8,
      allowMidairDash: true,
      allowProjectile: false,
      allowDoubleJump: false,
    });
  });

  it('keeps legacy portal targets as non-rendered room metadata', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          portal: {
            targetRoomId: 'room-b',
            endsLevel: true,
          },
        },
        {
          id: 'room-b',
          row: 0,
          col: 1,
          links: [],
        },
      ],
    });

    expect(normalized.rooms[0].portal).toBeNull();
    expect(normalized.rooms[0].components.filter((component) => component.type === 'portal')).toHaveLength(0);
  });

  it('drops invalid legacy room portal metadata without creating a portal component', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          portal: {
            targetRoomId: 'room-missing',
            endsLevel: false,
          },
        },
      ],
    });

    expect(normalized.rooms[0].portal).toBeNull();
    expect(normalized.rooms[0].components.filter((component) => component.type === 'portal')).toHaveLength(0);
  });

  it('migrates explicit legacy ending portals into editable portal components', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          portal: {
            targetRoomId: null,
            endsLevel: true,
          },
        },
      ],
    });

    expect(normalized.rooms[0].portal).toBeNull();
    expect(normalized.rooms[0].components).toContainEqual(expect.objectContaining({
      id: 'legacy-portal',
      type: 'portal',
      x: 1135,
      y: 556,
      endsLevel: true,
    }));
  });

  it('keeps at most two portal components for a shared link name', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          components: [
            { id: 'p-1', type: 'portal', x: 120, y: 500, linkName: 'alpha' },
            { id: 'p-2', type: 'portal', x: 220, y: 500, linkName: 'alpha' },
            { id: 'p-3', type: 'portal', x: 320, y: 500, linkName: 'alpha' },
          ],
        },
      ],
    });

    const portals = normalized.rooms[0].components.filter((component) => component.type === 'portal');
    expect(portals).toHaveLength(3);
    expect(portals.map((component) => component.linkName)).toEqual(['alpha', 'alpha', '']);
  });

  it('caps shared portal names across different rooms', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          components: [
            { id: 'p-a1', type: 'portal', x: 100, y: 520, linkName: 'bridge' },
          ],
        },
        {
          id: 'room-b',
          row: 0,
          col: 1,
          links: [],
          components: [
            { id: 'p-b1', type: 'portal', x: 180, y: 520, linkName: 'bridge' },
          ],
        },
        {
          id: 'room-c',
          row: 0,
          col: 2,
          links: [],
          components: [
            { id: 'p-c1', type: 'portal', x: 260, y: 520, linkName: 'bridge' },
          ],
        },
      ],
    });

    const portals = normalized.rooms.flatMap((room) => room.components.filter((component) => component.type === 'portal'));
    expect(portals.map((component) => component.linkName)).toEqual(['bridge', 'bridge', '']);
  });

  it('normalizes portal3 and projectile enemy variants', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            {
              id: 'portal-3-a',
              type: 'portal3',
              x: 960,
              y: 520,
              linkName: 'warp-a',
            },
            {
              id: 'villain-one',
              type: 'villain1',
              x: 720,
              y: 500,
              fireDirection: 'RIGHT',
            },
            {
              id: 'spirit-boss',
              type: 'boss',
              x: 840,
              y: 500,
              hitPoints: 30,
            },
          ],
        },
      ],
    });

    const roomComponents = normalized.rooms[0].components;
    const portal3 = roomComponents.find((component) => component.id === 'portal-3-a');
    const villain1 = roomComponents.find((component) => component.id === 'villain-one');
    const boss = roomComponents.find((component) => component.id === 'spirit-boss');

    expect(portal3).toMatchObject({
      type: 'portal3',
      variant: 'portal3',
      linkName: 'warp-a',
    });

    expect(villain1).toMatchObject({
      type: 'villain1',
      enemyType: 'villain1',
      fireDirection: 'RIGHT',
      fireIntervalMs: 1650,
      projectileSpeed: 300,
      projectileLifetimeMs: 2400,
      initialDelayMs: 700,
      hitPoints: 2,
    });

    expect(boss).toMatchObject({
      type: 'boss',
      enemyType: 'spiritboss',
      hitPoints: 30,
      fireIntervalMs: 1250,
      projectileSpeed: 360,
      projectileLifetimeMs: 3200,
      initialDelayMs: 900,
    });
  });

  it('normalizes slime variants with ghost movement constraints', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            {
              id: 'slime-green',
              type: 'slimeGreen',
              x: 460,
              y: 520,
              speed: 74,
              movementDirection: 'down',
            },
            {
              id: 'slime-orange',
              type: 'slimeOrange',
              x: 560,
              y: 540,
              patrolDistance: 1800,
              movementDirection: 'spin',
            },
          ],
        },
      ],
    });

    const roomComponents = normalized.rooms[0].components;
    const slimeGreen = roomComponents.find((component) => component.id === 'slime-green');
    const slimeOrange = roomComponents.find((component) => component.id === 'slime-orange');

    expect(slimeGreen).toMatchObject({
      type: 'slimeGreen',
      speed: 74,
      movementDirection: 'DOWN',
      patrolDistance: 220,
    });

    expect(slimeOrange).toMatchObject({
      type: 'slimeOrange',
      movementDirection: 'LEFT',
      patrolDistance: 1200,
    });
  });

  it('drops removed platform and barrier components', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          components: [
            { id: 'p-1', type: 'platform', x: 200, y: 400 },
            { id: 'b-1', type: 'barrier', x: 360, y: 420 },
            { id: 'coin-1', type: 'coin', x: 420, y: 380 },
          ],
        },
      ],
    });

    expect(normalized.rooms[0].components.map((component) => component.type)).toEqual(['coin']);
  });

  it('normalizes invisiblePlatform and statue components', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          components: [
            {
              id: 'invis-1',
              type: 'invisiblePlatform',
              x: 120,
              y: 480,
              width: 360,
              height: 42,
              passThroughSides: ['left', 'TOP', 'invalid'],
            },
            {
              id: 'statue-1',
              type: 'statue',
              x: 640,
              y: 520,
              questionTopic: '  Binary search basics  ',
              aiChoicesCount: 6,
              aiDifficulty: 'HARD',
              aiLanguage: '  Filipino  ',
              aiGradeLevel: '  Grade 8  ',
              aiInstructions: '  Keep it practical and use simple words.  ',
              prompt: '  What is 2 + 2? ',
              choices: ['3', '4', '5'],
              correctAnswerIndex: 1,
            },
          ],
        },
      ],
    });

    const invisible = normalized.rooms[0].components.find((component) => component.type === 'invisiblePlatform');
    const statue = normalized.rooms[0].components.find((component) => component.type === 'statue');

    expect(invisible).toMatchObject({
      width: 360,
      height: 42,
      passThroughSides: ['LEFT', 'TOP'],
    });

    expect(statue).toMatchObject({
      textureKey: 'teacher-statue-elem12',
      questionTopic: '  Binary search basics  ',
      aiChoicesCount: 6,
      aiDifficulty: 'hard',
      aiLanguage: 'Filipino',
      aiGradeLevel: 'Grade 8',
      aiInstructions: 'Keep it practical and use simple words.',
      prompt: 'What is 2 + 2?',
      choices: ['3', '4', '5'],
      correctAnswerIndex: 1,
    });
  });

  it('normalizes room background tiles for map editing', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          components: [],
          backgroundTiles: [
            {
              id: 'tile-1',
              tileKey: 'tile-portal-portal-1',
              x: 144,
              y: 288,
              size: 120,
            },
            {
              id: 'tile-2',
              tileKey: ' ',
              x: -50,
              y: 900,
              size: 9,
            },
          ],
        },
      ],
    });

    expect(normalized.rooms[0].backgroundTiles).toEqual([
      {
        id: 'tile-1',
        tileKey: 'tile-portal-portal-1',
        x: 144,
        y: 288,
        size: 120,
        zIndex: 0,
        rotationDeg: 0,
        flipX: false,
        flipY: false,
        renderLayer: 'back',
        snapToGrid: true,
      },
    ]);
  });

  it('localizes legacy invisible platform y values into the matching room row', () => {
    const normalized = normalizeRoomChunkData({
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

    expect(normalized.rooms[0].components).toHaveLength(0);
    expect(normalized.rooms[1].components[0]).toMatchObject({
      id: 'legacy-invisible',
      type: 'invisiblePlatform',
      y: 480,
    });
  });

  it('normalizes room background color for tile editing', () => {
    const normalized = normalizeRoomChunkData({
      rooms: [
        {
          id: 'room-a',
          row: 0,
          col: 0,
          links: [],
          components: [],
          backgroundColor: '#F97316',
        },
      ],
    });

    expect(normalized.rooms[0].backgroundColor).toBe('#f97316');
  });
});
