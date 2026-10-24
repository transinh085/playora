import { theme as antdTheme, type ThemeConfig } from 'antd';
import { font, ink, radius, semantic, violet } from './tokens';

export type StudioThemeMode = 'light' | 'dark';

export const studioLightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: semantic.light.primary,
    colorInfo: semantic.light.info,
    colorSuccess: semantic.light.success,
    colorWarning: semantic.light.warning,
    colorError: semantic.light.error,
    colorLink: violet[600],
    colorBgBase: semantic.light.bgBase,
    colorBgLayout: semantic.light.bgLayout,
    colorBgContainer: semantic.light.bgContainer,
    colorBgElevated: semantic.light.bgElevated,
    colorTextBase: semantic.light.textBase,
    colorText: semantic.light.textBase,
    colorTextSecondary: semantic.light.textSecondary,
    colorBorder: semantic.light.border,
    colorBorderSecondary: semantic.light.borderSecondary,
    borderRadius: radius.lg,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.xl,
    fontFamily: font.sans,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: semantic.light.bgContainer,
      siderBg: ink[50],
      bodyBg: semantic.light.bgLayout,
    },
  },
};

export const studioDarkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: semantic.dark.primary,
    colorInfo: semantic.dark.info,
    colorSuccess: semantic.dark.success,
    colorWarning: semantic.dark.warning,
    colorError: semantic.dark.error,
    colorLink: violet[300],
    colorBgBase: semantic.dark.bgBase,
    colorBgLayout: semantic.dark.bgLayout,
    colorBgContainer: semantic.dark.bgContainer,
    colorBgElevated: semantic.dark.bgElevated,
    colorTextBase: semantic.dark.textBase,
    colorText: semantic.dark.textBase,
    colorTextSecondary: semantic.dark.textSecondary,
    colorBorder: semantic.dark.border,
    colorBorderSecondary: semantic.dark.borderSecondary,
    borderRadius: radius.lg,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.xl,
    fontFamily: font.sans,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: ink[900],
      siderBg: ink[900],
      bodyBg: semantic.dark.bgLayout,
    },
  },
};

/** Returns the Ant Design `ThemeConfig` for Studio (`light` or `dark`). */
export function getStudioTheme(mode: StudioThemeMode = 'light'): ThemeConfig {
  return mode === 'dark' ? studioDarkTheme : studioLightTheme;
}

export { getStudioTheme as studioTheme };
