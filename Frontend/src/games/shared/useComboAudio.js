import { useCallback, useEffect, useRef } from 'react';
import { getStudentSfxPreference, getStudentSfxVolume } from '../../utils/studentMenuAudio';

// A decoded buffer can play from animation/timer callbacks after a user gesture,
// including catches that occur long after the last touch on iOS/Android.
export const useComboAudio = (sources, active = true) => {
  const bankRef = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = AudioContextClass ? new AudioContextClass() : null;
    const bank = { context, buffers: new Map(), audio: new Map(), playing: new Set(), disposed: false };
    bankRef.current = bank;
    const abort = new AbortController();
    Object.entries(sources).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.load();
      bank.audio.set(key, audio);
      if (context) {
        fetch(src, { signal: abort.signal })
          .then((response) => {
            if (!response.ok) throw new Error('Combo audio unavailable');
            return response.arrayBuffer();
          })
          .then((data) => context.decodeAudioData(data))
          .then((buffer) => { if (!bank.disposed) bank.buffers.set(key, buffer); })
          .catch(() => {}); // The preloaded HTML audio remains a fallback.
      }
    });
    const unlock = () => {
      if (context?.state === 'suspended') context.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      bank.disposed = true;
      abort.abort();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      bank.playing.forEach((source) => source.stop());
      bank.audio.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
      context?.close().catch(() => {});
      if (bankRef.current === bank) bankRef.current = null;
    };
  }, [sources]);

  useEffect(() => {
    if (active) return;
    const bank = bankRef.current;
    bank?.playing.forEach((source) => source.stop());
    bank?.playing.clear();
    bank?.audio.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  }, [active]);

  return useCallback((key) => {
    const bank = bankRef.current;
    if (!bank || !activeRef.current || !getStudentSfxPreference()) return;
    const volume = getStudentSfxVolume(1);
    const buffer = bank.buffers.get(String(key));
    if (buffer && bank.context?.state === 'running') {
      const source = bank.context.createBufferSource();
      const gain = bank.context.createGain();
      gain.gain.value = volume;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(bank.context.destination);
      source.onended = () => { bank.playing.delete(source); source.disconnect(); gain.disconnect(); };
      bank.playing.add(source);
      source.start();
      return;
    }
    const audio = bank.audio.get(String(key));
    if (!audio) return;
    audio.muted = false;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);
};
