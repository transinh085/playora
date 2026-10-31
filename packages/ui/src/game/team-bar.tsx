'use client';

import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

export type TeamBarProps = React.ComponentProps<'div'> & {
  name: string;
  score: number;
  max: number;
  team: number;
  leading?: boolean;
};

/** One team's progress in a race. `team` (1–8) picks `--team-*`. */
function TeamBar({
  name,
  score,
  max,
  team,
  leading = false,
  className,
  style,
  ...props
}: TeamBarProps) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;

  return (
    <div
      data-slot="team-bar"
      data-leading={leading || undefined}
      className={cx('grid gap-[0.3em]', className)}
      style={{ '--tile': `var(--team-${((team - 1) % 8) + 1})`, ...style } as React.CSSProperties}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4 font-semibold">
        <span className="flex min-w-0 items-center gap-[0.4em]">
          <span aria-hidden className="size-[0.6em] shrink-0 rounded-full bg-(--tile)" />
          <span className="truncate">{name}</span>
        </span>
        <span className="font-game font-bold tabular-nums">{score.toLocaleString('vi-VN')}</span>
      </div>
      <div className="m-0 h-[0.7em] w-full overflow-hidden rounded-full bg-game-surface leading-none">
        <div
          className="h-full rounded-full bg-(--tile) transition-all duration-300"
          style={{
            width: `${pct}%`,
            boxShadow: leading ? '0 0 1.2em var(--tile)' : undefined,
          }}
        />
      </div>
    </div>
  );
}

export { TeamBar };
