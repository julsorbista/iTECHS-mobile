import { resetControls } from './controls';

// Preserve replay state as well as first-play state; pause scene clocks/tweens
// and input instead of trying to undo individual gameplay side effects.
export const pauseForTutorial = (source, manager, now = Date.now) => {
  const startedAt = now();
  const records = ['LevelScene', 'HudScene', 'QuestionScene'].map((key) => {
    const scene = manager.keys[key];
    const active = manager.isActive(key);
    const inputEnabled = scene?.input?.enabled;
    const keyboardEnabled = scene?.input?.keyboard?.enabled;
    if (scene?.input) scene.input.enabled = false;
    if (scene?.input?.keyboard) scene.input.keyboard.enabled = false;
    if (active) manager.pause(key);
    return { key, scene, active, inputEnabled, keyboardEnabled };
  });
  const wasMusicPlaying = source.backgroundMusic?.isPlaying;
  if (wasMusicPlaying) source.backgroundMusic.pause();
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    resetControls(source.controls);
    if (source.hasGameplayStarted) source.levelStartedAt += now() - startedAt;
    records.forEach(({ key, scene, active, inputEnabled, keyboardEnabled }) => {
      if (scene?.input) scene.input.enabled = inputEnabled;
      if (scene?.input?.keyboard) scene.input.keyboard.enabled = keyboardEnabled;
      if (active) manager.resume(key);
    });
    if (wasMusicPlaying) source.backgroundMusic?.resume();
  };
};
