import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePreloadedComboSounds } from './usePreloadedComboSounds';

const prefs = vi.hoisted(() => ({ enabled: true, volume: 0.55 }));
vi.mock('../../utils/studentMenuAudio', () => ({
  getStudentSfxPreference: () => prefs.enabled,
  getStudentSfxVolume: () => prefs.volume,
}));
afterEach(() => { vi.unstubAllGlobals(); prefs.enabled = true; prefs.volume = 0.55; });

it('preloads Game 6 assets and plays the matching 3/5/10 sound', () => {
  const audios = [];
  vi.stubGlobal('Audio', class {
    constructor(src) {
      this.src = src;
      this.load = vi.fn(); this.pause = vi.fn(); this.play = vi.fn().mockResolvedValue();
      audios.push(this);
    }
  });
  const { result, unmount } = renderHook(() => usePreloadedComboSounds());
  expect(audios).toHaveLength(3);
  for (const [i, count] of [3, 5, 10].entries()) {
    expect(audios[i].src).toContain(`combo_${count}_x`);
    expect(audios[i].load).toHaveBeenCalledOnce();
    act(() => result.current(count));
    expect(audios[i].play).toHaveBeenCalledOnce();
  }
  act(() => result.current(4));
  prefs.enabled = false;
  act(() => result.current(3));
  expect(audios[0].play).toHaveBeenCalledOnce();
  prefs.enabled = true;
  prefs.volume = 0.8;
  act(() => result.current(3));
  expect(audios[0].volume).toBe(0.8);
  unmount();
  audios.forEach((audio) => expect(audio.pause).toHaveBeenCalled());
});

it('boosts Game 2 volume without exceeding the audio limit or bypassing mute', () => {
  const audios = [];
  vi.stubGlobal('Audio', class {
    constructor() { this.play = vi.fn().mockResolvedValue(); audios.push(this); }
    load() {} pause() {}
  });
  const { result, unmount } = renderHook(() => usePreloadedComboSounds(1.8));
  act(() => result.current(3));
  expect(audios[0].volume).toBeCloseTo(0.99);
  prefs.volume = 0.9;
  act(() => result.current(3));
  expect(audios[0].volume).toBe(1);
  prefs.enabled = false;
  act(() => result.current(3));
  expect(audios[0].play).toHaveBeenCalledTimes(2);
  unmount();
});
