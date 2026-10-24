'use client';

import { cn } from '@playora/ui/lib/utils';
import { Tag } from 'antd';
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
 * Round timer built on Ant Design `Tag`. Turns `--game-urgent` and pops each tick for the last
 * `urgentAt` seconds. Size comes from the parent font size.
 */
function Countdown({ seconds, urgentAt = 5, className, style, ...props }: CountdownProps) {
  const value = formatSeconds(seconds);
  const urgent = seconds > 0 && Math.ceil(seconds) <= urgentAt;

  return (
    <Tag
      data-slot="countdown"
      data-urgent={urgent || undefined}
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      variant="filled"
      className={cn(
        'm-0 inline-block border-0 bg-transparent p-0 font-game text-[1em] font-extrabold leading-none tabular-nums text-game-primary data-urgent:text-game-urgent',
        className,
      )}
      style={style}
      styles={{
        root: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          padding: 0,
          margin: 0,
          fontSize: 'inherit',
          lineHeight: 1,
          color: urgent ? 'var(--game-urgent)' : 'var(--game-primary)',
        },
      }}
      {...props}
    >
      <span
        key={urgent ? value : 'steady'}
        className={cn('inline-block', urgent && 'animate-score-pop')}
      >
        {value}
      </span>
    </Tag>
  );
}

export { Countdown };
