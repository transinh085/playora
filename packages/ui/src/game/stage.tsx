import { type BrandKitTheme, brandKitVars, type Skin } from '@playora/ui/lib/game-theme';
import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

/**
 * Big-screen frame for LED walls and projectors. Letterboxes a fixed aspect ratio into the window
 * and makes it a size container, so `text-stage-*` (cqh units) scale with the wall instead of the
 * browser. Content sits inside a safe area: LED cabinets and projector keystone often crop edges.
 * `fit="container"` renders the same frame inline at the parent's width (builder preview, docs).
 */
function Stage({
  skin = 'classic',
  brand,
  ratio = 16 / 9,
  fit = 'viewport',
  className,
  children,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  skin?: Skin;
  brand?: BrandKitTheme;
  ratio?: number;
  fit?: 'viewport' | 'container';
}) {
  const vars = React.useMemo(() => (brand ? brandKitVars(brand) : {}), [brand]);

  return (
    <div
      data-slot="stage"
      data-skin={skin}
      style={{ ...vars, ...style } as React.CSSProperties}
      className={cn(
        'game-backdrop grid place-items-center overflow-hidden font-sans antialiased',
        fit === 'viewport' ? 'fixed inset-0' : 'w-full rounded-xl',
      )}
      {...props}
    >
      <div
        className="@container relative overflow-hidden"
        style={{
          aspectRatio: ratio,
          width: fit === 'viewport' ? `min(100vw, calc(100dvh * ${ratio}))` : '100%',
          containerType: 'size',
        }}
      >
        <div
          data-slot="stage-safe-area"
          className={cn('h-full px-[5cqw] py-[5cqh] text-stage-base', className)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export { Stage };
