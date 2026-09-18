import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Game 1 platform rendering', () => {
  it('renders authored platforms as discrete complete tile images', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'),
      'utf8',
    );
    const rendererStart = source.indexOf('  createSolidSurface(config');
    const renderer = source.slice(
      rendererStart,
      source.indexOf('  createTriggerPlatform(config', rendererStart),
    );

    expect(renderer).toContain('const tileCount = Math.max(1, Math.round');
    expect(renderer).toContain('for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1)');
    expect(renderer).toContain('.setDisplaySize(renderedTileWidth, visualRect.height)');
    expect(renderer).not.toContain('add.tileSprite');
  });
});
