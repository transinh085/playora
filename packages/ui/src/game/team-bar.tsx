'use client';

import { cn } from '@playora/ui/lib/utils';
import { Progress } from 'antd';
import type * as React from 'react';

export type TeamBarProps = React.ComponentProps<'div'> & {
  name: string;
  score: number;
  max: number;
  team: number;
  leading?: boolean;
};

/** One team's progress in a race, built on Ant Design `Progress`. `team` (1–8) picks `--team-*`. */
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
      className={cn('grid gap-[0.3em]', className)}
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
      <Progress
        percent={pct}
        showInfo={false}
        strokeColor="var(--tile)"
        railColor="var(--game-surface)"
        className="m-0 leading-none"
        styles={{
          root: { margin: 0 },
          rail: {
            height: '0.7em',
            borderRadius: '9999px',
            backgroundColor: 'var(--game-surface)',
            overflow: 'hidden',
          },
          track: {
            height: '0.7em',
            borderRadius: '9999px',
            backgroundColor: 'var(--tile)',
            boxShadow: leading ? '0 0 1.2em var(--tile)' : undefined,
          },
        }}
      />
    </div>
  );
}

export { TeamBar };
