'use client';

import { StyleProvider } from '@ant-design/cssinjs';
import { App, ConfigProvider, type ThemeConfig } from 'antd';
import { type ReactNode, useMemo } from 'react';
import { type BrandKitTheme, gameThemeConfig, type Skin } from '../theme/game-theme';

export interface PlayProviderProps {
  /** Pre-built Ant Design theme config (e.g. from `gameThemeConfig`). */
  theme?: ThemeConfig;
  /** Game skin (`classic`, `yep`, `tet`, `day`) used when `theme` is not passed directly. */
  skin?: Skin;
  /** Optional customer brand kit overrides. */
  brand?: BrandKitTheme;
  children: ReactNode;
}

export function PlayProvider({ theme, skin, brand, children }: PlayProviderProps) {
  const resolvedTheme = useMemo<ThemeConfig>(() => {
    const base = gameThemeConfig({ skin, brand });
    if (!theme) return base;
    return {
      ...base,
      ...theme,
      token: { ...base.token, ...theme.token },
      components: { ...base.components, ...theme.components },
    };
  }, [skin, brand, theme]);

  return (
    <StyleProvider layer>
      <ConfigProvider theme={resolvedTheme}>
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
