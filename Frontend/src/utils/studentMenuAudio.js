const MENU_AUDIO_SRC = new URL(
  '../../assets/Game/game_one/Music & Sound Effects/bg_sound/menu_Sound.mp3',
  import.meta.url,
).href;
const STUDENT_CLICK_SOUND_SRC = new URL(
  '../../assets/Game/game_one/Music & Sound Effects/student_click.mp3',
  import.meta.url,
).href;

const PREFERENCES_KEY = 'studentMenuPreferences';
const PRIME_KEY = 'studentMenuAudioPrime';
const DEFAULT_VOLUME_PERCENT = 55;

let audioInstance = null;
let pendingPlayPromise = null;
const CLICK_AUDIO_POOL_SIZE = 4;
let clickAudioPool = [];
let clickAudioPoolIndex = 0;
let clickAudioContext = null;
let clickAudioBuffer = null;
let clickAudioBufferPromise = null;

const getClickAudioContext = () => {
  if (clickAudioContext || typeof window === 'undefined') {
    return clickAudioContext;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) {
    clickAudioContext = new AudioContextClass({ latencyHint: 'interactive' });
  }

  return clickAudioContext;
};

const preloadClickAudioBuffer = () => {
  const context = getClickAudioContext();
  if (!context || clickAudioBuffer) {
    return Promise.resolve(clickAudioBuffer);
  }

  if (!clickAudioBufferPromise) {
    clickAudioBufferPromise = fetch(STUDENT_CLICK_SOUND_SRC)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load click sound (${response.status})`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        clickAudioBuffer = buffer;
        return buffer;
      })
      .catch(() => null);
  }

  return clickAudioBufferPromise;
};

const ensureClickAudioPool = () => {
  if (!canUseAudio()) {
    return [];
  }

  if (!clickAudioPool.length) {
    clickAudioPool = Array.from({ length: CLICK_AUDIO_POOL_SIZE }, () => {
      const clickAudio = new Audio(STUDENT_CLICK_SOUND_SRC);
      clickAudio.preload = 'auto';
      clickAudio.load();
      return clickAudio;
    });
  }

  return clickAudioPool;
};

const restartMenuAudio = () => {
  if (!audioInstance || !getStudentMusicPreference()) {
    return;
  }

  audioInstance.currentTime = 0;
  const playPromise = audioInstance.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      // Ignore browser gesture restrictions.
    });
  }
};

const canUseAudio = () => (
  typeof window !== 'undefined'
  && typeof window.Audio !== 'undefined'
);

const ensureAudio = () => {
  if (!canUseAudio()) {
    return null;
  }

  if (!audioInstance) {
    audioInstance = new Audio(MENU_AUDIO_SRC);
    audioInstance.loop = true;
    audioInstance.preload = 'auto';
    audioInstance.volume = DEFAULT_VOLUME_PERCENT / 100;
    audioInstance.addEventListener('ended', restartMenuAudio);
  }

  audioInstance.loop = true;
  ensureClickAudioPool();
  preloadClickAudioBuffer();

  return audioInstance;
};

const clampVolumePercent = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_VOLUME_PERCENT;
  }

  return Math.max(0, Math.min(100, Math.round(parsedValue)));
};

export const getStudentAudioVolumePreference = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_VOLUME_PERCENT;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_VOLUME_PERCENT;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed?.musicVolume === 'number') {
      return clampVolumePercent(parsed.musicVolume);
    }

    if (typeof parsed?.volume === 'number') {
      return clampVolumePercent(parsed.volume);
    }

    if (parsed?.music === false && parsed?.sfx === false) {
      return 0;
    }

    return DEFAULT_VOLUME_PERCENT;
  } catch (error) {
    return DEFAULT_VOLUME_PERCENT;
  }
};

export const getStudentSfxVolumePreference = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_VOLUME_PERCENT;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_VOLUME_PERCENT;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed?.sfxVolume === 'number') {
      return clampVolumePercent(parsed.sfxVolume);
    }

    if (typeof parsed?.volume === 'number') {
      return clampVolumePercent(parsed.volume);
    }

    if (parsed?.sfx === false) {
      return 0;
    }

    return DEFAULT_VOLUME_PERCENT;
  } catch (error) {
    return DEFAULT_VOLUME_PERCENT;
  }
};

const scaleStudentVolume = (baseVolume, preferencePercent) => {
  const normalizedBase = Math.max(0, Math.min(1, Number(baseVolume) || 0));
  return normalizedBase * (clampVolumePercent(preferencePercent) / 100);
};

export const getStudentMusicVolume = (baseVolume = 1) => (
  scaleStudentVolume(baseVolume, getStudentAudioVolumePreference())
);

export const getStudentSfxVolume = (baseVolume = 1) => (
  scaleStudentVolume(baseVolume, getStudentSfxVolumePreference())
);

export const getStudentMusicPreference = () => {
  return getStudentAudioVolumePreference() > 0;
};

export const getStudentSfxPreference = () => {
  return getStudentSfxVolumePreference() > 0;
};

export const setStudentMenuVolume = (volumePercent) => {
  const normalizedVolume = clampVolumePercent(volumePercent) / 100;
  const audio = ensureAudio();
  if (audio) {
    audio.volume = normalizedVolume;
  }
};

export const playStudentClickSound = () => {
  if (!canUseAudio() || !getStudentSfxPreference()) {
    return;
  }

  const context = getClickAudioContext();
  const playDecodedClick = () => {
    if (!context || !clickAudioBuffer) return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = 0.45 * (getStudentSfxVolumePreference() / 100);
    source.buffer = clickAudioBuffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
    return true;
  };

  if (context && clickAudioBuffer) {
    if (context.state === 'suspended') {
      context.resume().then(playDecodedClick).catch(() => undefined);
    } else {
      playDecodedClick();
    }
    return;
  }

  preloadClickAudioBuffer();
  const pool = ensureClickAudioPool();
  const clickSound = pool.find((sound) => sound.paused || sound.ended)
    || pool[clickAudioPoolIndex];
  clickAudioPoolIndex = (clickAudioPoolIndex + 1) % pool.length;

  clickSound.pause();
  clickSound.currentTime = 0;
  clickSound.volume = 0.45 * (getStudentSfxVolumePreference() / 100);

  const playPromise = clickSound.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      // Ignore browser gesture restrictions.
    });
  }
};

export const markStudentMenuAudioPrimed = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(PRIME_KEY, '1');
  } catch (error) {
    // Ignore storage failures in restricted contexts.
  }
};

export const consumeStudentMenuAudioPrimed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const value = window.sessionStorage.getItem(PRIME_KEY);
    if (value !== '1') {
      return false;
    }

    window.sessionStorage.removeItem(PRIME_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

export const startStudentMenuLoop = async ({ ignorePreference = false } = {}) => {
  const audio = ensureAudio();
  if (!audio) {
    return { started: false, blocked: false };
  }

  audio.loop = true;

  setStudentMenuVolume(getStudentAudioVolumePreference());

  if (!ignorePreference && !getStudentMusicPreference()) {
    stopStudentMenuLoop({ rewind: false });
    return { started: false, blocked: false };
  }

  if (!audio.paused) {
    return { started: true, blocked: false };
  }

  try {
    pendingPlayPromise = pendingPlayPromise || audio.play();
    await pendingPlayPromise;
    return { started: true, blocked: false };
  } catch (error) {
    return { started: false, blocked: true };
  } finally {
    pendingPlayPromise = null;
  }
};

export const stopStudentMenuLoop = ({ rewind = false } = {}) => {
  if (!audioInstance) {
    return;
  }

  audioInstance.pause();
  if (rewind) {
    audioInstance.currentTime = 0;
  }
};

export const syncStudentMenuLoopToPreference = async () => {
  if (getStudentMusicPreference()) {
    return startStudentMenuLoop();
  }

  stopStudentMenuLoop({ rewind: false });
  return { started: false, blocked: false };
};
