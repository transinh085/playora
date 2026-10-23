import {
  type AspectFitResult,
  computeAspectFit,
  parseScreenKeyFragment,
  resolveScreenDimensions,
  type ScreenLayout,
} from '@playora/contracts';

export {
  type AspectFitResult,
  computeAspectFit,
  parseScreenKeyFragment,
  resolveScreenDimensions,
  type ScreenLayout,
};

export const SCREEN_KEY_STORAGE_KEY = 'playora.screenKey';

/**
 * Reads the screen key from `window.location.hash` (`#k=<key>`), persists it in `sessionStorage`,
 * and strips the fragment from the address bar so the raw key is not left visible.
 */
export function consumeScreenKeyFromWindow(): string | null {
  if (typeof window === 'undefined') return null;
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(SCREEN_KEY_STORAGE_KEY);
  } catch {
    stored = null;
  }

  const { key, fromFragment } = parseScreenKeyFragment(window.location.hash, stored);
  if (fromFragment && key) {
    try {
      window.sessionStorage.setItem(SCREEN_KEY_STORAGE_KEY, key);
    } catch {}
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', cleanUrl);
  }
  return key;
}
