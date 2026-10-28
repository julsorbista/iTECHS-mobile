import { useCallback, useEffect, useRef } from 'react';
import combo3Sound from '../../assets/game-arcade/audio/combo_3_x2.mp3';
import combo5Sound from '../../assets/game-arcade/audio/combo_5_x3.mp3';
import combo10Sound from '../../assets/game-arcade/audio/combo_10_x5.mp3';
import { getStudentSfxPreference, getStudentSfxVolume } from '../../utils/studentMenuAudio';

// Match Game 6's working preloaded HTML audio and milestone-specific assets.
export const usePreloadedComboSounds = (volumeBoost = 1) => {
  const soundsRef = useRef(new Map());
  useEffect(() => {
    const sounds = new Map([
      [3, new Audio(combo3Sound)],
      [5, new Audio(combo5Sound)],
      [10, new Audio(combo10Sound)],
    ]);
    sounds.forEach((audio) => {
      audio.preload = 'auto';
      audio.volume = getStudentSfxVolume(1);
      audio.load();
    });
    soundsRef.current = sounds;
    return () => {
      sounds.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
      soundsRef.current = new Map();
    };
  }, []);
  return useCallback((count) => {
    if (!getStudentSfxPreference()) return;
    const audio = soundsRef.current.get(count);
    if (!audio) return;
    audio.volume = Math.min(1, getStudentSfxVolume(1) * volumeBoost);
    audio.muted = false;
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Leave a useful diagnostic instead of silently discarding playback failures.
      console.warn('Combo sound playback failed:', count, error?.name || error);
    });
  }, [volumeBoost]);
};
