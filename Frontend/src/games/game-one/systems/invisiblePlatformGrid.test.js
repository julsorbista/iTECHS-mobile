import { describe, expect, it } from 'vitest';

import {
  INVISIBLE_PLATFORM_DEFAULT_HEIGHT,
  INVISIBLE_PLATFORM_DEFAULT_WIDTH,
  normalizeInvisiblePlatformLocalFrame,
} from './invisiblePlatformGrid';

describe('GAME_ONE invisible platform grid helpers', () => {
  it('snaps size and placement so the platform edges sit on grid lines', () => {
    const frame = normalizeInvisiblePlatformLocalFrame({
      x: 300,
      y: 480,
      width: 220,
      height: 36,
    });

    expect(frame).toEqual({
      x: 320,
      y: 500,
      width: 240,
      height: 40,
    });
    expect(frame.x - (frame.width / 2)).toBe(200);
    expect(frame.y - (frame.height / 2)).toBe(480);
  });

  it('uses whole-cell defaults for new invisible platforms', () => {
    const frame = normalizeInvisiblePlatformLocalFrame({
      x: 100,
      y: 100,
    });

    expect(frame.width).toBe(INVISIBLE_PLATFORM_DEFAULT_WIDTH);
    expect(frame.height).toBe(INVISIBLE_PLATFORM_DEFAULT_HEIGHT);
  });
});
