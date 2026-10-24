'use client';

import { cn } from '@playora/ui/lib/utils';
import { Alert, type AlertProps } from 'antd';
import type * as React from 'react';

export type GameOutcomeKind = 'win' | 'lose' | 'out_of_stock';

export type GameResultProps = Omit<AlertProps, 'type' | 'title' | 'description' | 'message'> & {
  outcome: GameOutcomeKind;
  title: React.ReactNode;
  description?: React.ReactNode;
  [key: `data-${string}`]: string | undefined;
};

const OUTCOME_ALERT_TYPE: Record<GameOutcomeKind, NonNullable<AlertProps['type']>> = {
  win: 'success',
  out_of_stock: 'warning',
  lose: 'info',
};

/**
 * Game result banner built on Ant Design `Alert` and styled with `--game-*` tokens.
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
  const resolvedStyles =
    typeof styles === 'function'
      ? styles
      : {
          ...styles,
          root: {
            backgroundColor: 'var(--game-surface)',
            borderColor: isWin ? 'var(--game-primary)' : 'var(--game-border)',
            color: 'var(--game-fg)',
            ...styles?.root,
          },
          title: {
            color: isWin ? 'var(--game-primary)' : 'var(--game-fg)',
            fontFamily: 'var(--game-font), ui-sans-serif, system-ui, sans-serif',
            fontWeight: 700,
            ...styles?.title,
          },
          description: {
            color: 'var(--game-muted)',
            ...styles?.description,
          },
        };

  return (
    <Alert
      data-slot="game-result"
      data-outcome={outcome}
      type={OUTCOME_ALERT_TYPE[outcome]}
      variant="outlined"
      showIcon={false}
      title={<span className="font-game text-base font-bold">{title}</span>}
      description={
        description ? <span className="mt-1 block text-xs opacity-80">{description}</span> : null
      }
      className={cn(
        'w-full rounded-game border border-game-border bg-game-surface px-4 py-3 text-center text-game-fg backdrop-blur-sm',
        className,
      )}
      style={style}
      styles={resolvedStyles}
      {...props}
    />
  );
}

export { GameResult };
