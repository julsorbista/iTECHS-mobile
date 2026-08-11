import { describe, expect, it } from 'vitest';

import {
  applyArcadeBodySpec,
  getCenteredArcadeBodySpec,
  getScaledArcadeBodyRect,
  resolveArcadeBodySpec,
} from './arcadeBody';

describe('GAME_ONE arcade body helpers', () => {
  it('keeps manifest body values in source pixels so Phaser scales them once', () => {
    const bodySpec = resolveArcadeBodySpec({
      body: {
        width: 98,
        height: 192,
        offsetX: 31,
        offsetY: 80,
      },
    });

    expect(bodySpec).toEqual({
      width: 98,
      height: 192,
      offsetX: 31,
      offsetY: 80,
    });
  });

  it('applies source pixel body values even when the sprite is already resized', () => {
    const calls = {};
    const sprite = {
      scaleX: 0.48,
      scaleY: 0.48,
      body: {
        setSize(width, height, center) {
          calls.size = { width, height, center };
        },
        setOffset(offsetX, offsetY) {
          calls.offset = { offsetX, offsetY };
        },
        updateFromGameObject() {
          calls.updated = true;
        },
      },
    };

    const applied = applyArcadeBodySpec(sprite, {
      width: 98,
      height: 192,
      offsetX: 31,
      offsetY: 80,
    });

    expect(applied).toEqual({
      width: 98,
      height: 192,
      offsetX: 31,
      offsetY: 80,
    });
    expect(calls.size).toEqual({ width: 98, height: 192, center: false });
    expect(calls.offset).toEqual({ offsetX: 31, offsetY: 80 });
    expect(calls.updated).toBe(true);
  });

  it('places the player body bottom near the visual feet after scaling', () => {
    const bodySpec = resolveArcadeBodySpec({
      body: {
        width: 98,
        height: 192,
        offsetX: 31,
        offsetY: 80,
      },
    });
    const rect = getScaledArcadeBodyRect({
      x: 300,
      y: 480,
      scaleX: 0.48,
      scaleY: 0.48,
      displayOriginX: 80,
      displayOriginY: 140,
    }, bodySpec);
    const visualBottom = 480 + (280 * 0.48 * 0.5);

    expect(rect.bottom).toBeCloseTo(visualBottom - 3.84, 2);
  });

  it('documents the old double-scaled player body as visibly too high', () => {
    const doubleScaledBodySpec = {
      width: Math.round(98 * 0.48),
      height: Math.round(192 * 0.48),
      offsetX: Math.round(31 * 0.48),
      offsetY: Math.round(80 * 0.48),
    };
    const rect = getScaledArcadeBodyRect({
      x: 300,
      y: 480,
      scaleX: 0.48,
      scaleY: 0.48,
      displayOriginX: 80,
      displayOriginY: 140,
    }, doubleScaledBodySpec);
    const visualBottom = 480 + (280 * 0.48 * 0.5);

    expect(visualBottom - rect.bottom).toBeGreaterThan(65);
  });

  it('places the slime body bottom at the visual base after scaling', () => {
    const bodySpec = resolveArcadeBodySpec({
      body: {
        width: 28,
        height: 28,
        offsetX: 18,
        offsetY: 34,
      },
    });
    const rect = getScaledArcadeBodyRect({
      x: 300,
      y: 480,
      scaleX: 1.2,
      scaleY: 1.2,
      displayOriginX: 32,
      displayOriginY: 32,
    }, bodySpec);
    const visualBottom = 480 + (64 * 1.2 * 0.5);

    expect(visualBottom - rect.bottom).toBeCloseTo(2.4, 2);
  });

  it('builds a centered player-attack hitbox close to the visible effect', () => {
    const spec = getCenteredArcadeBodySpec({
      frame: { realWidth: 113, realHeight: 126 },
    }, 0.78);

    expect(spec).toEqual({
      width: 88,
      height: 98,
      offsetX: 13,
      offsetY: 14,
    });

    const rect = getScaledArcadeBodyRect({
      x: 500,
      y: 300,
      scaleX: 48 / 113,
      scaleY: 48 / 113,
      displayOriginX: 56.5,
      displayOriginY: 63,
    }, spec);

    expect(rect.width).toBeGreaterThan(37);
    expect(rect.centerX).toBeCloseTo(500, 0);
    expect(rect.centerY).toBeCloseTo(300, 0);
  });
});
