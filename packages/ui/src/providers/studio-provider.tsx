'use client';

import type { ReactNode } from 'react';
import { DirectionProvider } from '../components/foundations/direction/direction';

export type StudioThemeMode = 'light' | 'dark';

export interface StudioProviderProps {
  mode?: StudioThemeMode;
  theme?: unknown;
  children: ReactNode;
}

export function StudioProvider({ children }: StudioProviderProps) {
  return <DirectionProvider locale="vi-VN">{children}</DirectionProvider>;
}
