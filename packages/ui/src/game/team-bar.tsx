import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

/** One team's progress in a race. `team` (1–8) picks the `--team-*` colour. */
function TeamBar({
  name,
  score,
  max,
  team,
  leading = false,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  name: string;
  score: number;
  max: number;
  team: number;
  leading?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;

  return (
    <div
      data-slot="team-bar"
      data-leading={leading || undefined}
      className={cn('grid gap-[0.3em]', className)}
      style={{ '--tile': `var(--team-${((team - 1) % 8) + 1})` } as React.CSSProperties}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4 font-semibold">
        <span className="flex min-w-0 items-center gap-[0.4em]">
          <span aria-hidden className="size-[0.6em] shrink-0 rounded-full bg-(--tile)" />
          <span className="truncate">{name}</span>
        </span>
        <span className="font-game font-bold tabular-nums">{score.toLocaleString('vi-VN')}</span>
      </div>
      <div className="h-[0.7em] overflow-hidden rounded-full bg-game-surface">
        <div
          className={cn(
            'h-full rounded-full bg-(--tile) transition-[width] duration-(--duration-base) ease-out',
            leading && 'shadow-[0_0_1.2em_var(--tile)]',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export { TeamBar };
