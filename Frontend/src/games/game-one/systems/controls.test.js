import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Input: { Keyboard: { JustDown: () => false } } } }));
import { readMovementIntent, resetControls, wasInteractPressed } from './controls';

const makeControls = () => ({
  cursors: { left: {}, right: {}, up: {}, space: {} },
  wasd: { left: {}, right: {}, up: {}, jump: {}, dash: {}, attack: {}, interact: {} },
  mobileControls: { left: true, jumpQueued: true, dashQueued: true, attackQueued: true, interactQueued: true },
});

describe('Android touch input', () => {
  it('holds movement but consumes jump, dash, attack and interaction once per press', () => {
    const controls = makeControls();
    expect(readMovementIntent(controls)).toMatchObject({ left: true, jumpPressed: true, dashPressed: true, attackPressed: true });
    expect(readMovementIntent(controls)).toMatchObject({ left: true, jumpPressed: false, dashPressed: false, attackPressed: false });
    expect(wasInteractPressed(controls)).toBe(true);
    expect(wasInteractPressed(controls)).toBe(false);
  });

  it('clears held and queued actions when a tutorial pauses gameplay', () => {
    const controls = makeControls();
    resetControls(controls);
    expect(readMovementIntent(controls)).toMatchObject({ left: false, jumpPressed: false, dashPressed: false, attackPressed: false });
    expect(wasInteractPressed(controls)).toBe(false);
  });
});
