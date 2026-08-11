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
});
