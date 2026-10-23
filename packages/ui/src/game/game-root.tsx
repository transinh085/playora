import { type BrandKitTheme, brandKitVars, type Skin } from '@playora/ui/lib/game-theme';
import { cn } from '@playora/ui/lib/utils';
import { Slot } from 'radix-ui';
import * as React from 'react';

/**
 * Root of every player / kiosk surface. Applies the skin, then the brand kit on top, and paints the
 * stage-lit backdrop. Everything inside uses `--game-*` tokens only.
 */
function GameRoot({
  skin = 'classic',
  brand,
  asChild = false,
  className,
  style,
  ...props
}: React.ComponentProps<'div'> & { skin?: Skin; brand?: BrandKitTheme; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';
  const vars = React.useMemo(() => (brand ? brandKitVars(brand) : {}), [brand]);

  return (
    <Comp
      data-slot="game-root"
      data-skin={skin}
      style={{ ...vars, ...style } as React.CSSProperties}
      className={cn('game-backdrop min-h-dvh font-sans antialiased', className)}
      {...props}
    />
  );
}

export { GameRoot };
