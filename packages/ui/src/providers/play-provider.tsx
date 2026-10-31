'use client';

import { TooltipProvider } from '@playora/ui/components/tooltip';
import type { ReactNode } from 'react';
import type { BrandKitTheme, Skin } from '../theme/game-theme';
import type { ThemeConfig } from '../theme/studio-theme';

export interface PlayProviderProps {
  /** Pre-built theme config (e.g. from `gameThemeConfig`). */
  theme?: ThemeConfig;
  /** Game skin (`classic`, `yep`, `tet`, `day`) used when `theme` is not passed directly. */
  skin?: Skin;
  /** Optional customer brand kit overrides. */
  brand?: BrandKitTheme;
  children: ReactNode;
}

export function PlayProvider({ children }: PlayProviderProps) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
