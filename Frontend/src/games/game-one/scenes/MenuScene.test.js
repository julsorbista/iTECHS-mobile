import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Game 1 pause menu touch targets', () => {
  it('binds each action to its complete visible button instead of the inner background', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/games/game-one/scenes/MenuScene.js'),
      'utf8',
    );

    expect(source).toContain("button.setInteractive({ useHandCursor: true })");
    expect(source).toContain("button.on('pointerdown'");
    expect(source).not.toContain("background.on('pointerup'");
    expect(source).toContain("label: 'Exit Level'");
    expect(source).toContain('onExit?.();');
  });
});
