import { cn } from '@playora/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

/**
 * Chunky, tactile button for players. The darker bottom edge is derived from the colour itself, so
 * it keeps working when a brand kit replaces `--game-primary`. Pressing sinks the face onto it.
 */
const gameButtonVariants = cva(
  "relative inline-flex shrink-0 touch-manipulation items-center justify-center gap-2 rounded-game font-game font-bold tracking-tight whitespace-nowrap select-none transition-[translate,box-shadow,opacity] duration-(--duration-fast) ease-out outline-none focus-visible:ring-4 focus-visible:ring-game-fg/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        primary:
          '[--edge:color-mix(in_oklch,var(--game-primary)_58%,black)] bg-game-primary text-game-primary-fg shadow-[0_0.375rem_0_var(--edge)] active:translate-y-1 active:shadow-[0_0.125rem_0_var(--edge)]',
        accent:
          '[--edge:color-mix(in_oklch,var(--game-accent)_58%,black)] bg-game-accent text-game-accent-fg shadow-[0_0.375rem_0_var(--edge)] active:translate-y-1 active:shadow-[0_0.125rem_0_var(--edge)]',
        surface:
          'border border-game-border bg-game-surface text-game-fg backdrop-blur-sm active:translate-y-0.5',
      },
      size: {
        md: 'h-14 px-6 text-lg',
        lg: 'h-16 px-8 text-xl',
        /** Single giant target for tap/shake games: thumb-sized from any grip. */
        tap: 'size-48 rounded-full text-2xl',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

function GameButton({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof gameButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="game-button"
      data-variant={variant}
      className={cn(gameButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { GameButton, gameButtonVariants };
