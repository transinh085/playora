'use client';

import type React from 'react';

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

/** Tinted icon tile: pale tone background, tone-coloured icon (luma look, soft rounded geometry). */
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
      className={`shrink-0 flex items-center justify-center rounded-2xl ${TONE_CLASSES[tone]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
