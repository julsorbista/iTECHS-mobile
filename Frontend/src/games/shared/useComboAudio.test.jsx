import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useComboAudio } from './useComboAudio';

const preferences = vi.hoisted(() => ({ enabled: true, volume: 0.55 }));
vi.mock('../../utils/studentMenuAudio', () => ({
  getStudentSfxPreference: () => preferences.enabled,
  getStudentSfxVolume: () => preferences.volume,
}));
const sources = { combo: '/combo.mp3' };

afterEach(() => { vi.unstubAllGlobals(); preferences.enabled = true; preferences.volume = 0.55; });

describe('combo playback', () => {
  it('preloads and reads current SFX preferences on each fallback playback', () => {
    const audio = { load: vi.fn(), pause: vi.fn(), play: vi.fn().mockResolvedValue(), currentTime: 0 };
    vi.stubGlobal('Audio', class { constructor() { return audio; } });
    vi.stubGlobal('AudioContext', undefined);
    const { result, unmount } = renderHook(() => useComboAudio(sources));
    expect(audio.load).toHaveBeenCalled();
    act(() => result.current('combo'));
    expect(audio.volume).toBe(0.55);
    preferences.volume = 0.9;
    act(() => result.current('combo'));
    expect(audio.volume).toBe(0.9);
    preferences.enabled = false;
    act(() => result.current('combo'));
    expect(audio.play).toHaveBeenCalledTimes(2);
    unmount();
    expect(audio.pause).toHaveBeenCalled();
  });

  it('unlocks decoded audio on a gesture and supports later timer-triggered playback', async () => {
    const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const context = {
      state: 'suspended', destination: {},
      resume: vi.fn(() => { context.state = 'running'; return Promise.resolve(); }),
      close: vi.fn().mockResolvedValue(), decodeAudioData: vi.fn().mockResolvedValue({}),
      createBufferSource: () => source,
      createGain: () => ({ gain: {}, connect: vi.fn(), disconnect: vi.fn() }),
    };
    vi.stubGlobal('AudioContext', class { constructor() { return context; } });
    vi.stubGlobal('Audio', class { load() {} pause() {} });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    const { result, rerender, unmount } = renderHook(({ active }) => useComboAudio(sources, active), { initialProps: { active: true } });
    await waitFor(() => expect(context.decodeAudioData).toHaveBeenCalled());
    act(() => window.dispatchEvent(new Event('pointerdown')));
    await act(async () => {});
    act(() => result.current('combo'));
    expect(source.start).toHaveBeenCalledOnce();
    rerender({ active: false });
    expect(source.stop).toHaveBeenCalled();
    act(() => result.current('combo'));
    expect(source.start).toHaveBeenCalledOnce();
    unmount();
    expect(context.close).toHaveBeenCalled();
  });
});
