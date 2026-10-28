import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Game 1 HUD controls reminder', () => {
  it('shows the compact movement, jump, and attack controls below the counters', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/HudScene.js'), 'utf8');

    expect(source).toContain('this.controlsPanel.fillRoundedRect(20, 54, 324, 36, 8)');
    expect(source).toContain("createKeycap(37, 'A')");
    expect(source).toContain("createKeycap(64, 'D')");
    expect(source).toContain("createKeycap(151, 'W')");
    expect(source).toContain("createKeycap(247, 'J')");
    expect(source).toContain("createControlLabel(264, 'ATTACK')");
    expect(source).toContain('setResolution(2)');
    expect(source).not.toContain("setShadow(1, 1, '#020617', 2, true, true)");
  });
});
