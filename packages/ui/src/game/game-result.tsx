'use client';

import { cn } from '@playora/ui/lib/utils';
import type * as React from 'react';

export type GameOutcomeKind = 'win' | 'lose' | 'out_of_stock';

export type GameResultProps = React.ComponentProps<'div'> & {
  outcome: GameOutcomeKind;
  title: React.ReactNode;
  description?: React.ReactNode;
  styles?: {
    root?: React.CSSProperties;
    title?: React.CSSProperties;
    description?: React.CSSProperties;
  };
  [key: `data-${string}`]: string | undefined;
};

/**
 * Game result banner styled with `--game-*` tokens.
 */
function GameResult({
  outcome,
  title,
  description,
  className,
  style,
  styles,
  ...props
}: GameResultProps) {
  const isWin = outcome === 'win';

  return (
    <div
      data-slot="game-result"
      data-outcome={outcome}
      className={cn(
        'w-full rounded-game border border-game-border bg-game-surface px-4 py-3 text-center text-game-fg backdrop-blur-sm',
        className,
      )}
      style={{
        backgroundColor: 'var(--game-surface)',
        borderColor: isWin ? 'var(--game-primary)' : 'var(--game-border)',
        color: 'var(--game-fg)',
        ...styles?.root,
        ...style,
      }}
      {...props}
    >
      <div
        className="font-game text-base font-bold"
        style={{
          color: isWin ? 'var(--game-primary)' : 'var(--game-fg)',
          ...styles?.title,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          className="mt-1 text-xs opacity-80"
          style={{
            color: 'var(--game-muted)',
            ...styles?.description,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

export { GameResult };
