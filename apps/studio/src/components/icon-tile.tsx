'use client';

import { cx } from '@playora/ui/utils/cx';
import type React from 'react';

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  success: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'bg-notification-error-background text-text-error-primary',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

/** Tinted icon tile: pale tone background, tone-coloured icon (BoardUI soft rounded geometry). */
export function IconTile({
  tone = 'primary',
  size = 44,
  children,
}: {
  tone?: Tone;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx('flex shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[tone])}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
