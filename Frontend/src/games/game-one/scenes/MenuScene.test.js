import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('Game 1 pause menu touch targets', () => {
  it.each([[1280, 720], [2200, 720], [900, 480]])('centers the panel and backdrop at %i × %i', (width, height) => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/MenuScene.js'), 'utf8');
    const method = source.match(/  (alignMenuToViewport\(\) \{[\s\S]*?\n  \})\n/)[1];
    const align = new Function(`return ({${method}}).alignMenuToViewport;`)();
    const overlay = { setPosition: vi.fn().mockReturnThis(), setSize: vi.fn().mockReturnThis() };
    const panel = { width: 760, height: 680, setScale: vi.fn().mockReturnThis(), setPosition: vi.fn().mockReturnThis() };
    align.call({ scale: { width, height }, overlay, panel });
    expect(panel.setPosition).toHaveBeenCalledWith(width / 2, height / 2);
    expect(overlay.setSize).toHaveBeenCalledWith(width, height);
    const fit = panel.setScale.mock.calls[0][0];
    expect(panel.width * fit).toBeLessThanOrEqual(width - 32);
    expect(panel.height * fit).toBeLessThanOrEqual(height - 32);
  });
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
