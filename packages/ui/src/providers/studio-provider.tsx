'use client';

import { TooltipProvider } from '@playora/ui/components/tooltip';
import type { ReactNode } from 'react';

export type StudioThemeMode = 'light' | 'dark';

export interface StudioProviderProps {
  mode?: StudioThemeMode;
  theme?: unknown;
  children: ReactNode;
}

export function StudioProvider({ children }: StudioProviderProps) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
