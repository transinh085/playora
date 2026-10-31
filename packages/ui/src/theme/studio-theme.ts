import { font, ink, semantic, teal } from './tokens';

export type StudioThemeMode = 'light' | 'dark';

export interface ThemeToken {
  colorSuccess?: string;
  colorWarning?: string;
  colorError?: string;
  borderRadius?: number;
  fontFamily?: string;
  wireframe?: boolean;
  colorPrimary?: string;
  colorInfo?: string;
  colorPrimaryBg?: string;
  colorPrimaryBgHover?: string;
  colorInfoBg?: string;
  colorLink?: string;
  colorTextLightSolid?: string;
  [key: string]: unknown;
}

export interface ThemeConfig {
  algorithm?: unknown;
  token?: ThemeToken;
  components?: Record<string, unknown>;
}

/**
 * Studio theme tokens (docs/engineering/design-system.md §3).
 */
const shared: ThemeToken = {
  colorSuccess: '#10b981',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  borderRadius: 8,
  fontFamily: font.sans,
  wireframe: false,
};

const components: Record<string, unknown> = {
  Button: { controlHeight: 36, fontWeight: 500 },
  Card: {
    borderRadiusLG: 12,
    boxShadow: 'none',
    boxShadowSecondary: 'none',
    boxShadowTertiary: 'none',
  },
  Menu: { itemBg: 'transparent', activeBarBorderWidth: 0 },
};

export const studioLightTheme: ThemeConfig = {
  algorithm: 'default',
  token: {
    ...shared,
    colorPrimary: semantic.light.primary,
    colorInfo: semantic.light.primary,
    colorPrimaryBg: teal[50],
    colorPrimaryBgHover: teal[100],
    colorInfoBg: teal[50],
  },
  components: {
    ...components,
    Layout: { headerHeight: 64, headerPadding: '0 24px', headerBg: '#ffffff', siderBg: '#ffffff' },
  },
};

export const studioDarkTheme: ThemeConfig = {
  algorithm: 'dark',
  token: {
    ...shared,
    colorPrimary: semantic.dark.primary,
    colorInfo: semantic.dark.primary,
    colorPrimaryBg: teal[900],
    colorPrimaryBgHover: teal[800],
    colorInfoBg: teal[900],
    colorLink: teal[300],
    colorTextLightSolid: ink[950],
  },
  components: {
    ...components,
    Layout: { headerHeight: 64, headerPadding: '0 24px', headerBg: '#141414', siderBg: '#141414' },
  },
};

/** Returns the ThemeConfig for Studio (`light` or `dark`). */
export function getStudioTheme(mode: StudioThemeMode = 'light'): ThemeConfig {
  return mode === 'dark' ? studioDarkTheme : studioLightTheme;
}

export { getStudioTheme as studioTheme };
