import { describe, expect, it } from 'vitest';

import {
  getGameOneSurfaceGeometry,
  shouldProcessSurfaceCollision,
} from './surfaceGeometry';

const manifest = {
  platforms: {
    grass: {
      key: 'grass',
      visualHeight: 60,
    },
  },
};

const createPlayerBody = ({
  x = 100,
  y = 400,
  width = 28,
  height = 40,
  prevX = x,
  prevY = y - 10,
  velocityX = 0,
  velocityY = 240,
} = {}) => ({
  x,
  y,
  width,
  height,
  prev: {
    x: prevX,
    y: prevY,
  },
  velocity: {
    x: velocityX,
    y: velocityY,
  },
});

const createPlatformBody = (bodyRect) => ({
  top: bodyRect.top,
  bottom: bodyRect.bottom,
  left: bodyRect.left,
  right: bodyRect.right,
});

describe('GAME_ONE surface geometry', () => {
  it('uses the same top edge for invisible editor guides and runtime collision bodies', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 480,
      width: 220,
      height: 36,
      invisible: true,
    });

    expect(geometry.visualRect.top).toBe(462);
    expect(geometry.bodyRect.top).toBe(geometry.visualRect.top);
    expect(geometry.bodyRect.centerY).toBe(480);
    expect(geometry.collisionMode).toBe('SOLID');
  });

  it('derives visible platform body rects from the shared visual and body height contract', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 520,
      width: 220,
      bodyHeight: 24,
      textureKey: 'grass',
    });

    expect(geometry.visualRect.height).toBe(60);
    expect(geometry.bodyRect.height).toBe(24);
    expect(geometry.bodyOffsetY).toBe(18);
    expect(geometry.bodyRect.top).toBe(526);
    expect(geometry.bodyRect.bottom).toBe(550);
  });

  it('processes one-way visible platforms only for top landings', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 520,
      width: 220,
      bodyHeight: 24,
      textureKey: 'grass',
    });
    const platformBody = createPlatformBody(geometry.bodyRect);

    expect(shouldProcessSurfaceCollision(
      createPlayerBody({ x: 300, y: 490, prevX: 300, prevY: 480, velocityY: 240 }),
      platformBody,
      geometry,
    )).toBe(true);
    expect(shouldProcessSurfaceCollision(
      createPlayerBody({ x: 300, y: 552, prevX: 300, prevY: 560, velocityY: -240 }),
      platformBody,
      geometry,
    )).toBe(false);
  });

  it('blocks landing on an invisible platform by default', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 480,
      width: 220,
      height: 36,
      invisible: true,
    });

    expect(shouldProcessSurfaceCollision(
      createPlayerBody({ x: 300, y: 420, prevX: 300, prevY: 410, velocityY: 240 }),
      createPlatformBody(geometry.bodyRect),
      geometry,
    )).toBe(true);
  });

  it('lets the player fall through from above when TOP is ignored', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 480,
      width: 220,
      height: 36,
      invisible: true,
      passThroughSides: ['TOP'],
    });

    expect(shouldProcessSurfaceCollision(
      createPlayerBody({ y: 420, prevY: 410, velocityY: 240 }),
      createPlatformBody(geometry.bodyRect),
      geometry,
    )).toBe(false);
  });

  it('keeps normal top landing when only a side is ignored', () => {
    const geometry = getGameOneSurfaceGeometry(manifest, {
      x: 300,
      y: 480,
      width: 220,
      height: 36,
      invisible: true,
      passThroughSides: ['LEFT'],
    });

    expect(shouldProcessSurfaceCollision(
      createPlayerBody({ x: 300, y: 420, prevX: 300, prevY: 410, velocityY: 240 }),
      createPlatformBody(geometry.bodyRect),
      geometry,
    )).toBe(true);
  });
});
