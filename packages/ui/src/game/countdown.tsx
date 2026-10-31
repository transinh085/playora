'use client';

import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
}

export type CountdownProps = React.ComponentProps<'span'> & {
  seconds: number;
  urgentAt?: number;
};

/**
 * Round timer. Turns `--game-urgent` and pops each tick for the last
 * `urgentAt` seconds. Size comes from the parent font size.
 */
function Countdown({ seconds, urgentAt = 5, className, style, ...props }: CountdownProps) {
  const value = formatSeconds(seconds);
  const urgent = seconds > 0 && Math.ceil(seconds) <= urgentAt;

  return (
    <span
      data-slot="countdown"
      data-urgent={urgent || undefined}
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={cx(
        'm-0 inline-block border-0 bg-transparent p-0 font-game text-[1em] font-extrabold leading-none tabular-nums text-game-primary data-urgent:text-game-urgent',
        className,
      )}
      style={{
        color: urgent ? 'var(--game-urgent)' : 'var(--game-primary)',
        ...style,
      }}
      {...props}
    >
      <span
        key={urgent ? value : 'steady'}
        className={cx('inline-block', urgent && 'animate-score-pop')}
      >
        {value}
      </span>
    </span>
  );
}

export { Countdown };
