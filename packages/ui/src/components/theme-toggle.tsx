'use client';

import { Button, Switch } from '@heroui/react';
import { cx } from '@playora/ui/utils/cx';
import { RiMoonLine, RiSunLine } from '@remixicon/react';
import { useEffect, useRef } from 'react';
import {
  applyTheme,
  applyThemeWithTransition,
  storedTheme,
  type ThemeMode,
  type ThemeTransitionOrigin,
  useThemeMode,
} from '../theme/theme-transition';

export {
  applyTheme,
  applyThemeWithTransition,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemeMode,
  useThemeMode,
} from '../theme/theme-transition';

export interface ThemeToggleProps {
  collapsed?: boolean;
  appearance?: 'sidebar' | 'segmented' | 'sidebar-segmented' | 'glass-segmented';
  className?: string;
  size?: 'small' | 'medium';
  transitionDuration?: number;
  onChange?: (mode: ThemeMode) => void;
}

export function ThemeToggle({
  collapsed = false,
  appearance = 'sidebar',
  className,
  size = 'medium',
  transitionDuration = 820,
  onChange,
}: ThemeToggleProps) {
  const theme = useThemeMode();
  const dark = theme === 'dark';
  const pointerOriginRef = useRef<ThemeTransitionOrigin | null>(null);

  useEffect(() => {
    applyTheme(storedTheme(), { persist: false });
  }, []);

  if (
    appearance === 'segmented' ||
    appearance === 'sidebar-segmented' ||
    appearance === 'glass-segmented'
  ) {
    const small = size === 'small';
    const options = [
      { mode: 'light' as const, label: 'Use light mode', Icon: RiSunLine },
      { mode: 'dark' as const, label: 'Use dark mode', Icon: RiMoonLine },
    ];

    return (
      <div
        role="group"
        aria-label="Theme"
        className={cx(
          'relative inline-flex w-fit items-center gap-1 rounded-full bg-surface-secondary p-1',
          small && 'gap-0.5 p-0.5',
          className,
        )}
      >
        {options.map(({ mode, label, Icon }) => {
          const selected = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              title={mode === 'light' ? 'Light mode' : 'Dark mode'}
              onClick={(event) => {
                if (selected) return;
                const pointerOrigin =
                  event.clientX === 0 && event.clientY === 0
                    ? null
                    : { x: event.clientX, y: event.clientY };
                void applyThemeWithTransition(mode, {
                  origin: pointerOrigin,
                  element: event.currentTarget,
                  duration: transitionDuration,
                  onApply: () => onChange?.(mode),
                });
              }}
              className={cx(
                'relative z-10 grid size-8 cursor-pointer place-items-center rounded-full transition-colors duration-150 outline-none',
                small && 'size-6',
                selected
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Icon className={small ? 'size-3.5' : 'size-4'} aria-hidden />
            </button>
          );
        })}
      </div>
    );
  }

  if (collapsed) {
    const Icon = dark ? RiSunLine : RiMoonLine;
    return (
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label={dark ? 'Use light mode' : 'Use dark mode'}
        className={className}
        onPress={() => {
          const nextMode = dark ? 'light' : 'dark';
          void applyThemeWithTransition(nextMode, {
            duration: transitionDuration,
            onApply: () => onChange?.(nextMode),
          });
        }}
      >
        <Icon className="size-5" aria-hidden />
      </Button>
    );
  }

  return (
    <Switch
      isSelected={dark}
      size="sm"
      aria-label="Dark mode"
      className={cx(
        'flex w-full cursor-pointer items-center justify-between rounded-xl p-2 transition-colors hover:bg-surface-secondary',
        className,
      )}
      onPointerDown={(event) => {
        pointerOriginRef.current = { x: event.clientX, y: event.clientY };
      }}
      onChange={(selected) => {
        const origin = pointerOriginRef.current;
        pointerOriginRef.current = null;
        const nextMode = selected ? 'dark' : 'light';
        void applyThemeWithTransition(nextMode, {
          origin,
          duration: transitionDuration,
          onApply: () => onChange?.(nextMode),
        });
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <RiMoonLine className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="text-body-medium text-muted">Dark mode</span>
      </span>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}
