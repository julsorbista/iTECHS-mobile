import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  capturedCanvasProps: null,
}));

vi.mock('./GameCanvas', () => ({
  default: (props) => {
    testState.capturedCanvasProps = props;
    return <div data-testid="game-one-canvas" />;
  },
}));

import GameOnePlayMode from './GameOnePlayMode';

describe('GameOnePlayMode', () => {
  it('prepares teacher and student level data before entering the shared Phaser canvas', () => {
    testState.capturedCanvasProps = null;

    render(
      <GameOnePlayMode
        levelData={{
          version: 2,
          gameType: 'GAME_ONE',
          viewport: { width: 1280, height: 720 },
          grid: {
            cells: [
              { id: 'room-1', col: 0, row: 0 },
              { id: 'room-2', col: 1, row: 0 },
            ],
          },
          worldObjects: {
            platforms: [],
            backgroundTiles: [
              {
                id: 'room-2-tile',
                tileKey: 'tile-room-2',
                x: 1504,
                y: 300,
              },
            ],
          },
        }}
        platformTileByKey={{
          'tile-room-2': {
            url: '/room-2.png',
          },
        }}
      />,
    );

    expect(screen.getByTestId('game-one-canvas')).toBeTruthy();
    expect(testState.capturedCanvasProps.levelData.worldObjects.platforms).toEqual([]);
    expect(testState.capturedCanvasProps.levelData.worldObjects.backgroundTiles[0]).toMatchObject({
      id: 'room-2-tile',
      imageUrl: '/room-2.png',
      x: 1504,
      y: 300,
    });
  });
});
