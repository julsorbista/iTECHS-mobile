import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../assets/manifest/assetManifest.json';
import { ensureNumericTextureFrames, registerGameOneAnimations } from './animations';

describe('Game 1 animation registration', () => {
  it('loads independent player frame files so production cannot expose the whole sheet', () => {
    const runtimeSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/assets/manifest/runtimeAssets.js'), 'utf8');

    expect(runtimeSource).toContain("import.meta.glob('../processed/player/frames/idle/*.png'");
    expect(runtimeSource).toContain('...playerIdleFrameImages');
    expect(runtimeSource).toContain('...playerRunFrameImages');
    expect(runtimeSource).toContain('...playerJumpFrameImages');
    expect(runtimeSource).not.toContain('playerIdleSheet');
  });

  it('creates and selects a real player frame before production scaling', () => {
    const playerSource = readFileSync(resolve(process.cwd(), 'src/games/game-one/entities/Player.js'), 'utf8');

    expect(playerSource).toContain("const staticFrameKey = `${manifest.key}-frame-00`");
    expect(playerSource).toContain('this.setTexture(staticFrameKey)');
    expect(playerSource).not.toContain('this.setCrop(0, 0, frameWidth, frameHeight)');
  });

  it('rebuilds player frames when production exposes only the base sprite-sheet texture', () => {
    const addedFrames = [];
    const texture = {
      getFrameNames: () => ['__BASE', ...addedFrames.map(({ name }) => name)],
      get: () => ({ realWidth: 3200, realHeight: 280 }),
      add: vi.fn((name, sourceIndex, x, y, width, height) => {
        addedFrames.push({ name, sourceIndex, x, y, width, height });
      }),
    };
    const scene = {
      textures: {
        exists: () => true,
        get: () => texture,
      },
    };

    expect(ensureNumericTextureFrames(scene, manifest.player)).toBe(true);
    expect(addedFrames).toHaveLength(20);
    expect(addedFrames[0]).toEqual({ name: 0, sourceIndex: 0, x: 0, y: 0, width: 160, height: 280 });
    expect(addedFrames[19]).toEqual({ name: 19, sourceIndex: 0, x: 3040, y: 0, width: 160, height: 280 });
  });

  it('rebuilds horizontal player frames when production reports no base dimensions', () => {
    const addedFrames = [];
    const texture = {
      getFrameNames: () => ['__BASE'],
      get: () => ({ realWidth: 0, realHeight: 0 }),
      source: [{ width: 0, height: 0 }],
      add: vi.fn((name, sourceIndex, x, y, width, height) => {
        addedFrames.push({ name, sourceIndex, x, y, width, height });
      }),
    };
    const scene = {
      textures: {
        exists: () => true,
        get: () => texture,
      },
    };

    expect(ensureNumericTextureFrames(scene, manifest.player)).toBe(true);
    expect(addedFrames).toHaveLength(20);
    expect(addedFrames[19].x).toBe(3040);
  });

  it('registers player animations from the independent frame textures', () => {
    const created = [];
    const playerKeys = [manifest.player, manifest.playerRun, manifest.playerJump]
      .flatMap((entry) => Array.from({ length: entry.frameCount }, (_, index) => `${entry.key}-frame-${String(index).padStart(2, '0')}`));
    const scene = {
      textures: {
        exists: (key) => playerKeys.includes(key),
        get: () => ({ getFrameNames: () => [] }),
      },
      anims: {
        exists: (key) => !key.startsWith('game-one-player-') || created.some((entry) => entry.key === key),
        create: vi.fn((config) => {
          created.push(config);
          return config;
        }),
      },
    };

    registerGameOneAnimations(scene, structuredClone(manifest));

    expect(created.find(({ key }) => key === 'game-one-player-idle')?.frames).toHaveLength(20);
    expect(created.find(({ key }) => key === 'game-one-player-run')?.frames).toHaveLength(20);
    expect(created.find(({ key }) => key === 'game-one-player-jump')?.frames).toHaveLength(8);
  });
});
