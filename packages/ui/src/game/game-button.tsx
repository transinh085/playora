'use client';

import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

export type GameButtonVariant = 'primary' | 'accent' | 'surface';
export type GameButtonSize = 'md' | 'lg' | 'tap';

export interface GameButtonVariantOptions {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  className?: string;
}

const BASE_CLASSES =
  "relative inline-flex shrink-0 touch-manipulation items-center justify-center gap-2 rounded-game font-game font-bold tracking-tight whitespace-nowrap select-none transition-[translate,box-shadow,opacity] duration-(--duration-fast) ease-out outline-none focus-visible:ring-4 focus-visible:ring-game-fg/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6";

const VARIANT_CLASSES: Record<GameButtonVariant, string> = {
  primary:
    'border-0 bg-game-primary text-game-primary-fg shadow-[0_0.375rem_0_var(--edge)] active:translate-y-1 active:shadow-[0_0.125rem_0_var(--edge)]',
  accent:
    'border-0 bg-game-accent text-game-accent-fg shadow-[0_0.375rem_0_var(--edge)] active:translate-y-1 active:shadow-[0_0.125rem_0_var(--edge)]',
  surface:
    'border border-game-border bg-game-surface text-game-fg backdrop-blur-sm active:translate-y-0.5',
};

const SIZE_CLASSES: Record<GameButtonSize, string> = {
  md: 'h-14 px-6 text-lg',
  lg: 'h-16 px-8 text-xl',
  /** Single giant target for tap/shake games: thumb-sized from any grip. */
  tap: 'size-48 rounded-full text-2xl',
};

const VARIANT_ROOT_STYLES: Record<GameButtonVariant, React.CSSProperties> = {
  primary: {
    '--edge': 'color-mix(in oklch, var(--game-primary) 58%, black)',
    backgroundColor: 'var(--game-primary)',
    color: 'var(--game-primary-fg)',
    borderColor: 'transparent',
    boxShadow: '0 0.375rem 0 var(--edge)',
  } as React.CSSProperties,
  accent: {
    '--edge': 'color-mix(in oklch, var(--game-accent) 58%, black)',
    backgroundColor: 'var(--game-accent)',
    color: 'var(--game-accent-fg)',
    borderColor: 'transparent',
    boxShadow: '0 0.375rem 0 var(--edge)',
  } as React.CSSProperties,
  surface: {
    backgroundColor: 'var(--game-surface)',
    color: 'var(--game-fg)',
    borderColor: 'var(--game-border)',
    boxShadow: 'none',
  },
};

export function gameButtonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: GameButtonVariantOptions = {}): string {
  return cx(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

export type GameButtonProps = React.ComponentProps<'button'> & {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  styles?: { root?: React.CSSProperties };
};

/**
 * Chunky, tactile 3D button for players.
 * The darker bottom edge is derived from `--game-primary` / `--game-accent` via `color-mix()`,
 * so it keeps working when a brand kit replaces `--game-primary`. Pressing sinks the face onto it.
 */
function GameButton({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  style,
  styles,
  ...props
}: GameButtonProps) {
  return (
    <button
      data-slot="game-button"
      data-variant={variant}
      data-size={size}
      type={type}
      className={gameButtonVariants({ variant, size, className })}
      style={{
        ...VARIANT_ROOT_STYLES[variant],
        ...styles?.root,
        ...style,
      }}
      {...props}
    />
  );
}

export { GameButton };
