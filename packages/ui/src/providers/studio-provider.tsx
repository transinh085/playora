'use client';

import { DirectionProvider } from '@playora/ui/components/foundations/direction/direction';
import type { ReactNode } from 'react';

export type StudioThemeMode = 'light' | 'dark';

export interface StudioProviderProps {
  mode?: StudioThemeMode;
  theme?: unknown;
  children: ReactNode;
}

export function StudioProvider({ children }: StudioProviderProps) {
  return <DirectionProvider locale="vi-VN">{children}</DirectionProvider>;
}
