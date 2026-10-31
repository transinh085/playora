'use client';

import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  /** Secondary label, e.g. team or department. */
  meta?: string;
}

const MEDAL_CLASSES = ['bg-medal-gold', 'bg-medal-silver', 'bg-medal-bronze'] as const;

export type LeaderboardProps = React.ComponentProps<'ol'> & {
  entries: LeaderboardEntry[];
  highlightId?: string;
};

/**
 * Ranked list for the phone result view.
 * `highlightId` marks the viewer's own row.
 */
function Leaderboard({ entries, highlightId, className, ...props }: LeaderboardProps) {
  return (
    <ol data-slot="leaderboard" className={cx('grid gap-[0.35em]', className)} {...props}>
      {entries.map((entry, i) => {
        const isTop3 = i < 3;
        return (
          <li
            key={entry.id}
            data-me={entry.id === highlightId || undefined}
            className="flex animate-rise-in items-center gap-[0.6em] rounded-game bg-game-surface px-[0.7em] py-[0.4em] data-me:ring-2 data-me:ring-game-primary"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              className={cx(
                'm-0 grid size-[1.6em] shrink-0 place-items-center rounded-full border-0 p-0 font-game text-[0.75em] font-bold tabular-nums',
                isTop3 ? `${MEDAL_CLASSES[i]} text-stage` : 'bg-transparent text-game-muted',
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{entry.name}</span>
            {entry.meta && (
              <span className="m-0 hidden truncate border-0 bg-transparent px-[0.5em] py-0 text-[0.7em] text-game-muted sm:inline-block">
                {entry.meta}
              </span>
            )}
            <span className="font-game font-bold tabular-nums">
              {entry.score.toLocaleString('vi-VN')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { Leaderboard };
