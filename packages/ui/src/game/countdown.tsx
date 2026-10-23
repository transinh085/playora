import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
}

/**
 * Round timer. Turns "on air" red and pops each tick for the last `urgentAt` seconds, the moment
 * the hall starts counting down out loud. Size comes from the parent font size.
 */
function Countdown({
  seconds,
  urgentAt = 5,
  className,
  ...props
}: React.ComponentProps<'span'> & { seconds: number; urgentAt?: number }) {
  const value = formatSeconds(seconds);
  const urgent = seconds > 0 && Math.ceil(seconds) <= urgentAt;

  return (
    <span
      data-slot="countdown"
      data-urgent={urgent || undefined}
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={cn(
        'inline-block font-game font-extrabold leading-none tabular-nums text-game-primary data-urgent:text-game-urgent',
        className,
      )}
      {...props}
    >
      <span
        key={urgent ? value : 'steady'}
        className={cn('inline-block', urgent && 'animate-score-pop')}
      >
        {value}
      </span>
    </span>
  );
}

export { Countdown };
