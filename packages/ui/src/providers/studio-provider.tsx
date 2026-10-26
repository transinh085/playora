'use client';

import { StyleProvider } from '@ant-design/cssinjs';
import { App, ConfigProvider, type ThemeConfig } from 'antd';
import { type ReactNode, useMemo } from 'react';
import { getStudioTheme, type StudioThemeMode } from '../theme/studio-theme';

export interface StudioProviderProps {
  mode?: StudioThemeMode;
  theme?: ThemeConfig;
  children: ReactNode;
}

export function StudioProvider({ mode = 'light', theme, children }: StudioProviderProps) {
  const resolvedTheme = useMemo<ThemeConfig>(() => {
    const base = getStudioTheme(mode);
    if (!theme) return base;
    return {
      ...base,
      ...theme,
      token: { ...base.token, ...theme.token },
      components: { ...base.components, ...theme.components },
    };
  }, [mode, theme]);

  return (
    <StyleProvider layer>
      {/* Filled inputs everywhere, like the games-vt admin (docs/engineering/design-system.md §3). */}
      <ConfigProvider theme={resolvedTheme} variant="filled">
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
