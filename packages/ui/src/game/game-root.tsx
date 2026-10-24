'use client';

import { cn } from '@playora/ui/lib/utils';
import { PlayProvider } from '@playora/ui/providers/play-provider';
import { type BrandKitTheme, resolveGameTheme, type Skin } from '@playora/ui/theme/game-theme';
import * as React from 'react';

export type GameRootProps = React.ComponentProps<'div'> & {
  skin?: Skin;
  brand?: BrandKitTheme;
  asChild?: boolean;
};

/**
 * Root of every player / kiosk surface. Wraps `PlayProvider` with the Ant Design theme resolved
 * from `skin` + `brand`, sets `--game-*` CSS variables, and paints the stage-lit backdrop.
 */
function GameRoot({
  skin = 'classic',
  brand,
  asChild = false,
  className,
  style,
  children,
  ...props
}: GameRootProps) {
  const resolved = React.useMemo(() => resolveGameTheme({ skin, brand }), [skin, brand]);
  const mergedClassName = cn('game-backdrop min-h-dvh font-sans antialiased', className);
  const mergedStyle = { ...resolved.vars, ...style } as React.CSSProperties;

  const content =
    asChild && React.isValidElement<React.HTMLAttributes<HTMLElement>>(children) ? (
      React.cloneElement(children, {
        ...props,
        'data-slot': 'game-root',
        'data-skin': resolved.skin,
        style: { ...mergedStyle, ...children.props.style },
        className: cn(mergedClassName, children.props.className),
      } as React.HTMLAttributes<HTMLElement>)
    ) : (
      <div
        data-slot="game-root"
        data-skin={resolved.skin}
        style={mergedStyle}
        className={mergedClassName}
        {...props}
      >
        {children}
      </div>
    );

  return (
    <PlayProvider skin={resolved.skin} brand={brand} theme={resolved.theme}>
      {content}
    </PlayProvider>
  );
}

export { GameRoot };
