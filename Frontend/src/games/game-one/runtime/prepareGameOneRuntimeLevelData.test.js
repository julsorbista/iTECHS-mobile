import { describe, expect, it } from 'vitest';

import { prepareGameOneRuntimeLevelData } from './prepareGameOneRuntimeLevelData';

describe('prepareGameOneRuntimeLevelData', () => {
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
});
