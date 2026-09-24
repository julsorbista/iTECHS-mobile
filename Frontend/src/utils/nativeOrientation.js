import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

const waitForPortraitViewport = (timeoutMs = 1200) => new Promise((resolve) => {
  if (typeof window === 'undefined' || window.innerHeight >= window.innerWidth) {
    resolve();
    return;
  }

  let timeoutId;
  const finish = () => {
    if (window.innerHeight < window.innerWidth) return;
    window.removeEventListener('resize', finish);
    window.removeEventListener('orientationchange', finish);
    clearTimeout(timeoutId);
    resolve();
  };

  window.addEventListener('resize', finish);
  window.addEventListener('orientationchange', finish);
  timeoutId = window.setTimeout(() => {
    window.removeEventListener('resize', finish);
    window.removeEventListener('orientationchange', finish);
    resolve();
  }, timeoutMs);
});

export const restoreNativePortrait = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await ScreenOrientation.lock({ orientation: 'portrait-primary' }).catch(() => undefined);
  await waitForPortraitViewport();
};

