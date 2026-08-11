import { describe, expect, it } from 'vitest';

import { buildGameOneLevelDataFromRoomChunk } from './gameOneRoomChunkRuntime';
import { normalizeRoomChunkData } from './roomChunkSchema';

describe('buildGameOneLevelDataFromRoomChunk', () => {
  it('converts room-local invisible platform coordinates into runtime world coordinates', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-b',
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

    expect(levelData.worldObjects.invisiblePlatforms[0]).toMatchObject({
      id: 'room-b-invisible-1',
      x: 320,
      y: 1220,
      width: 240,
      height: 40,
      invisible: true,
      collisionMode: 'SOLID',
    });
  });

  it('keeps selected-room editor data local while preview uses world-space runtime data', () => {
    const normalized = normalizeRoomChunkData({
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
    });

    const editorComponent = normalized.rooms[0].components[0];
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-b',
      roomChunkData: normalized,
    });

    expect(editorComponent.y).toBe(480);
    expect(levelData.worldObjects.invisiblePlatforms[0].y).toBe(1220);
  });

  it('does not double-offset legacy invisible platforms after normalization moves them to the matching room', () => {
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

    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-b',
      roomChunkData: normalized,
    });

    expect(normalized.rooms[0].components).toHaveLength(0);
    expect(normalized.rooms[1].components[0]).toMatchObject({
      id: 'legacy-invisible',
      y: 480,
    });
    expect(levelData.worldObjects.invisiblePlatforms[0]).toMatchObject({
      id: 'room-b-legacy-invisible',
      y: 1220,
    });
  });

  it('offsets decorative background tiles into full-level world coordinates without creating platforms', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-b',
      platformTileByKey: {
        'tile-moss': {
          url: '/moss.png',
          blendMode: 'screen',
        },
      },
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

    expect(levelData.worldObjects.platforms).toEqual([]);
    expect(levelData.worldObjects.backgroundTiles).toContainEqual(expect.objectContaining({
      id: 'room-b-moss-1',
      tileKey: 'tile-moss',
      imageUrl: '/moss.png',
      x: 1476,
      y: 320,
      size: 144,
      blendMode: 'screen',
    }));
  });

  it('does not synthesize portals for rooms without explicit portal components', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-a',
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

    expect(levelData.worldObjects.portal).toEqual([]);
  });

  it('exports question statues with the editor statue texture for play mode', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-a',
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

    expect(levelData.worldObjects.villain[0]).toMatchObject({
      id: 'room-a-statue-1',
      appearance: 'STATUE',
      textureKey: 'teacher-statue-elem12',
      size: 212,
    });
  });

  it('preserves spawn ability values for play mode', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-a',
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

    expect(levelData.worldObjects.spawn).toMatchObject({
      jumpHeight: 220,
      dashMode: 'BOTH',
      dashDistance: 300,
      projectileDamage: 4,
      projectileBurstCount: 3,
    });
  });

  it('adds a legacy room portal in preview runtime when no explicit portal component exists', () => {
    const levelData = buildGameOneLevelDataFromRoomChunk({
      selectedRoomId: 'room-a',
      roomChunkData: {
        rooms: [
          {
            id: 'room-a',
            row: 0,
            col: 0,
            portal: {
              targetRoomId: null,
              endsLevel: true,
            },
            components: [],
          },
        ],
      },
    });

    expect(levelData.worldObjects.portal).toContainEqual(expect.objectContaining({
      id: 'room-a-legacy-portal',
      x: 1135,
      y: 556,
      locked: false,
      endsLevel: true,
      linkName: '',
      variant: 'portal3',
    }));
  });
});
