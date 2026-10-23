import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  /** Secondary label, e.g. team or department. */
  meta?: string;
}

const MEDALS = ['bg-medal-gold', 'bg-medal-silver', 'bg-medal-bronze'];

/**
 * Ranked list for the screen (sizes follow the parent font size, so wrap it in `text-stage-lg` on a
 * Stage) and for the phone result view. `highlightId` marks the viewer's own row.
 */
function Leaderboard({
  entries,
  highlightId,
  className,
  ...props
}: React.ComponentProps<'ol'> & { entries: LeaderboardEntry[]; highlightId?: string }) {
  return (
    <ol data-slot="leaderboard" className={cn('grid gap-[0.35em]', className)} {...props}>
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          data-me={entry.id === highlightId || undefined}
          className="flex animate-rise-in items-center gap-[0.6em] rounded-game bg-game-surface px-[0.7em] py-[0.4em] data-me:ring-2 data-me:ring-game-primary"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span
            className={cn(
              'grid size-[1.6em] shrink-0 place-items-center rounded-full font-game text-[0.75em] font-bold tabular-nums',
              i < 3 ? `${MEDALS[i]} text-[oklch(0.2_0.04_290)]` : 'text-game-muted',
            )}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{entry.name}</span>
          {entry.meta && (
            <span className="hidden truncate text-[0.7em] text-game-muted sm:inline">
              {entry.meta}
            </span>
          )}
          <span className="font-game font-bold tabular-nums">
            {entry.score.toLocaleString('vi-VN')}
          </span>
        </li>
      ))}
    </ol>
  );
}

export { Leaderboard };
