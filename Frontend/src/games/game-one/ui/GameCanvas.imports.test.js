import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Game 1 canvas React hooks', () => {
  it('imports useMemo when building the level-specific guide', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/games/game-one/ui/GameCanvas.jsx'),
      'utf8',
    );
    const reactImport = source.match(/import React,\s*\{([\s\S]*?)\}\s*from 'react';/)?.[1] || '';

    expect(source).toContain('useMemo(');
    expect(reactImport).toMatch(/\buseMemo\b/);
  });

  it('uses the loaded app stylesheet and a native click for the mobile HUD menu', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/games/game-one/ui/GameCanvas.jsx'),
      'utf8',
    );
    const appStyles = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    expect(source).toContain('className="game-one-mobile-hud-menu"');
    expect(source).toContain('onClick={(event) => {');
    expect(appStyles).toContain('.student-game-overlay-game-one .game-one-mobile-hud-menu');
    expect(appStyles).toContain('pointer-events: auto !important;');
  });
});
