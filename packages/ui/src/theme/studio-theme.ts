import { theme as antdTheme, type ThemeConfig } from 'antd';
import { font, ink, semantic, teal } from './tokens';

export type StudioThemeMode = 'light' | 'dark';

/**
 * Studio follows the games-vt admin look (docs/13 §3): antd's own neutrals and type scale, radius 8,
 * borderless cards at radius 12, 36px buttons at weight 500, filled inputs (set on the provider).
 * Only the brand colour is Playora's.
 */
const shared: ThemeConfig['token'] = {
  colorSuccess: '#10b981',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  borderRadius: 8,
  fontFamily: font.sans,
  wireframe: false,
};

const components: ThemeConfig['components'] = {
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
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...shared,
    colorPrimary: semantic.light.primary,
    colorInfo: semantic.light.primary,
    // antd derives a greyish tint from this teal; pin the pale fills (menu selection, icon tiles).
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
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...shared,
    colorPrimary: semantic.dark.primary,
    colorInfo: semantic.dark.primary,
    colorPrimaryBg: teal[900],
    colorPrimaryBgHover: teal[800],
    colorInfoBg: teal[900],
    colorLink: teal[300],
    // Dark primary is a light teal, so text on solid buttons must be dark to stay above 4.5:1.
    colorTextLightSolid: ink[950],
  },
  components: {
    ...components,
    Layout: { headerHeight: 64, headerPadding: '0 24px', headerBg: '#141414', siderBg: '#141414' },
  },
};

/** Returns the Ant Design `ThemeConfig` for Studio (`light` or `dark`). */
export function getStudioTheme(mode: StudioThemeMode = 'light'): ThemeConfig {
  return mode === 'dark' ? studioDarkTheme : studioLightTheme;
}

export { getStudioTheme as studioTheme };
