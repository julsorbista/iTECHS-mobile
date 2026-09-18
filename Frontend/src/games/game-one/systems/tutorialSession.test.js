import { describe, expect, it, vi } from 'vitest';
vi.mock('./controls', () => ({ resetControls: vi.fn() }));
import { pauseForTutorial } from './tutorialSession';

describe('tutorial replay isolation', () => {
  it('pauses all active gameplay scenes, restores input and excludes tutorial wall time once', () => {
    const keys = Object.fromEntries(['LevelScene', 'HudScene', 'QuestionScene'].map((key) => [key, { input: { enabled: true, keyboard: { enabled: true } } }]));
    const manager = { keys, isActive: (key) => key !== 'QuestionScene', pause: vi.fn(), resume: vi.fn() };
    const source = { hasGameplayStarted: true, levelStartedAt: 100, currentHealth: 2, coinsCollected: 4, player: { x: 123, y: 400, airDashUsed: true } };
    let time = 1000;
    const restore = pauseForTutorial(source, manager, () => time);
    expect(manager.pause.mock.calls).toEqual([['LevelScene'], ['HudScene']]);
    expect(keys.LevelScene.input.keyboard.enabled).toBe(false);
    time = 6000;
    restore(); restore();
    expect(source).toMatchObject({ currentHealth: 2, coinsCollected: 4, player: { x: 123, y: 400, airDashUsed: true }, levelStartedAt: 5100 });
    expect(manager.resume.mock.calls).toEqual([['LevelScene'], ['HudScene']]);
    expect(keys.LevelScene.input.keyboard.enabled).toBe(true);
  });
  it('does not start gameplay or resume pre-paused scenes on the first tutorial', () => {
    const manager = { keys: {}, isActive: () => false, pause: vi.fn(), resume: vi.fn() };
    const source = { hasGameplayStarted: false, levelStartedAt: 42 };
    pauseForTutorial(source, manager, () => 100)();
    expect(source).toEqual({ hasGameplayStarted: false, levelStartedAt: 42 });
    expect(manager.resume).not.toHaveBeenCalled();
  });
});
