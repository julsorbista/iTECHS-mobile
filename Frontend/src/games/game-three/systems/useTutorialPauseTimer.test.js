import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTutorialPauseTimer } from './useTutorialPauseTimer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
describe('Game 3 replay timer safety', () => {
  it('preserves the normal delay and calls once', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.schedule(done, 900);
    vi.advanceTimersByTime(899); expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(done).toHaveBeenCalledTimes(1);
    timer.pause(true); timer.pause(false); vi.advanceTimersByTime(900);
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('pauses and resumes only the remaining time across multiple replays', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.schedule(done, 2000); vi.advanceTimersByTime(500);
    timer.pause(true); vi.advanceTimersByTime(10000); expect(done).not.toHaveBeenCalled();
    timer.pause(false); vi.advanceTimersByTime(1000);
    timer.pause(true); vi.advanceTimersByTime(10000); expect(done).not.toHaveBeenCalled();
    timer.pause(false); vi.advanceTimersByTime(499); expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(done).toHaveBeenCalledTimes(1);
  });
  it('supports scheduling while paused without starting the clock', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.pause(true); timer.schedule(done, 440); vi.advanceTimersByTime(1000);
    expect(done).not.toHaveBeenCalled();
    timer.pause(false); vi.advanceTimersByTime(440); expect(done).toHaveBeenCalledTimes(1);
  });
  it('cancels paused work on level reset or unmount', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.schedule(done, 440); timer.pause(true); timer.cancel(); timer.pause(false);
    vi.advanceTimersByTime(10000); expect(done).not.toHaveBeenCalled();
  });
  it('replacing pending work cannot run the old callback', () => {
    const timer = createTutorialPauseTimer(); const old = vi.fn(); const done = vi.fn();
    timer.schedule(old, 440); timer.schedule(done, 900); vi.advanceTimersByTime(1000);
    expect(old).not.toHaveBeenCalled(); expect(done).toHaveBeenCalledTimes(1);
  });
  it('restarts a nearly expired timer with its full duration only after resume', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.schedule(done, 1400); vi.advanceTimersByTime(1390);
    timer.pause(true); timer.restart(); vi.advanceTimersByTime(10000);
    expect(done).not.toHaveBeenCalled();
    timer.pause(false); vi.advanceTimersByTime(1399); expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(done).toHaveBeenCalledTimes(1);
  });
  it('restart never resurrects completed or cancelled work', () => {
    const timer = createTutorialPauseTimer(); const done = vi.fn();
    timer.schedule(done, 440); vi.advanceTimersByTime(440);
    timer.restart(); vi.advanceTimersByTime(1000); expect(done).toHaveBeenCalledTimes(1);
    timer.schedule(done, 900); timer.pause(true); timer.cancel(); timer.restart(); timer.pause(false);
    vi.advanceTimersByTime(1000); expect(done).toHaveBeenCalledTimes(1);
  });
});
