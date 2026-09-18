import { useEffect, useLayoutEffect, useRef } from 'react';

// Hold real-game animation/preview timers during tutorial replay. Call restart
// before returning so students receive the full configured viewing time again.
export const createTutorialPauseTimer = () => {
  let handle = null;
  let callback = null;
  let remaining = 0;
  let duration = 0;
  let due = 0;
  let paused = false;
  const clear = () => { clearTimeout(handle); handle = null; };
  const arm = () => {
    if (paused || !callback) return;
    due = Date.now() + remaining;
    handle = setTimeout(() => {
      handle = null;
      const done = callback;
      callback = null;
      done?.();
    }, remaining);
  };
  return {
    schedule(done, ms) { clear(); callback = done; duration = ms; remaining = ms; arm(); },
    cancel() { clear(); callback = null; remaining = 0; },
    restart() {
      if (!callback) return;
      clear(); remaining = duration; arm();
    },
    pause(value) {
      if (paused === value) return;
      paused = value;
      if (paused && handle !== null) { remaining = Math.max(0, due - Date.now()); clear(); }
      else if (!paused) arm();
    },
  };
};

export default function useTutorialPauseTimer(paused) {
  const timerRef = useRef(null);
  if (!timerRef.current) timerRef.current = createTutorialPauseTimer();
  const timer = timerRef.current;
  useLayoutEffect(() => { timer.pause(paused); }, [timer, paused]);
  useEffect(() => () => timer.cancel(), [timer]);
  return timer;
}
