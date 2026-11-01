'use client';

import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'heroui:theme';
export const THEME_CHANGE_EVENT = 'heroui:theme-change';

const THEME_TRANSITION_DURATION = 820;
const THEME_TRANSITION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const THEME_TRANSITION_STYLE_ID = 'heroui-theme-transition-style';

export type ThemeTransitionOrigin = { x: number; y: number };

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

let themeTransitionRunning = false;

function createBlurCircleMask() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">',
    '<feGaussianBlur stdDeviation="2" /></filter></defs>',
    '<circle cx="50" cy="50" r="42" fill="white" filter="url(#blur)" />',
    '</svg>',
  ].join('');

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function installThemeTransitionStyle(
  { x, y }: ThemeTransitionOrigin,
  radius: number,
  duration: number,
) {
  document.getElementById(THEME_TRANSITION_STYLE_ID)?.remove();

  const mask = createBlurCircleMask();
  const finalMaskSize = radius * 2.5;
  const finalMaskX = x - finalMaskSize / 2;
  const finalMaskY = y - finalMaskSize / 2;
  const style = document.createElement('style');
  style.id = THEME_TRANSITION_STYLE_ID;
  style.textContent = `
    ::view-transition-new(root) {
      -webkit-mask-image: ${mask};
      mask-image: ${mask};
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      animation: heroui-theme-mask-reveal ${duration}ms ${THEME_TRANSITION_EASING} both;
      transform-origin: ${x}px ${y}px;
      will-change: -webkit-mask-size, -webkit-mask-position, mask-size, mask-position;
    }

    @keyframes heroui-theme-mask-reveal {
      from {
        -webkit-mask-position: ${x}px ${y}px;
        mask-position: ${x}px ${y}px;
        -webkit-mask-size: 0px 0px;
        mask-size: 0px 0px;
      }
      to {
        -webkit-mask-position: ${finalMaskX}px ${finalMaskY}px;
        mask-position: ${finalMaskX}px ${finalMaskY}px;
        -webkit-mask-size: ${finalMaskSize}px ${finalMaskSize}px;
        mask-size: ${finalMaskSize}px ${finalMaskSize}px;
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}

export function storedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const val =
      window.localStorage.getItem(THEME_STORAGE_KEY) || window.localStorage.getItem('theme');
    if (val === 'dark') return 'dark';
    if (val === 'light') return 'light';
    return currentTheme();
  } catch {
    return currentTheme();
  }
}

export function applyTheme(theme: ThemeMode, { persist = true }: { persist?: boolean } = {}) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      window.localStorage.setItem('theme', theme);
    } catch {
      // Storage may be unavailable
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

function elementCenter(element: HTMLElement | null): ThemeTransitionOrigin {
  if (!element) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function normalizedOrigin(
  origin: ThemeTransitionOrigin | null,
  element: HTMLElement | null,
): ThemeTransitionOrigin {
  const fallback = elementCenter(element);
  const x = origin?.x ?? fallback.x;
  const y = origin?.y ?? fallback.y;
  return {
    x: Math.min(Math.max(x, 0), window.innerWidth),
    y: Math.min(Math.max(y, 0), window.innerHeight),
  };
}

export async function applyThemeWithTransition(
  theme: ThemeMode,
  {
    origin = null,
    element = null,
    duration = THEME_TRANSITION_DURATION,
    onApply,
  }: {
    origin?: ThemeTransitionOrigin | null;
    element?: HTMLElement | null;
    duration?: number;
    onApply?: () => void;
  } = {},
) {
  if (typeof document === 'undefined' || currentTheme() === theme) return;

  const transitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!transitionDocument.startViewTransition || reduceMotion) {
    applyTheme(theme);
    onApply?.();
    return;
  }
  if (themeTransitionRunning) return;

  const { x, y } = normalizedOrigin(origin, element);
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  themeTransitionRunning = true;
  document.documentElement.classList.add('theme-transitioning');
  const transitionStyle = installThemeTransitionStyle({ x, y }, radius, duration);
  try {
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => {
        applyTheme(theme);
        onApply?.();
      });
    });

    await transition.ready;
    await transition.finished;
  } catch {
    if (currentTheme() !== theme) {
      applyTheme(theme);
      onApply?.();
    }
  } finally {
    transitionStyle.remove();
    document.documentElement.classList.remove('theme-transitioning');
    themeTransitionRunning = false;
  }
}

export function currentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(onStoreChange: () => void) {
  const onThemeChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(event.newValue === 'dark' ? 'dark' : 'light', { persist: false });
  };
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light');
}
