/**
 * Primitive design tokens for Playora (sRGB hex equivalents of the OKLCH scales in `styles.css`).
 *
 * Ant Design's `@ant-design/fast-color` derives hover/active/background shades from hex/RGB strings
 * (`oklch(...)` is not parsed by fast-color), so `ThemeConfig` consumes these hex primitives while
 * `styles.css` exposes the corresponding CSS custom properties.
 */

export const violet = {
  50: '#f5f3ff',
  100: '#ece7ff',
  200: '#d9ceff',
  300: '#beaaff',
  400: '#9f7cff',
  500: '#854ff2',
  600: '#6d28d8',
  700: '#581cb1',
  800: '#431688',
  900: '#2f1061',
} as const;

export const ink = {
  50: '#fafafc',
  100: '#f3f3f8',
  200: '#e6e5ed',
  300: '#d4d3dd',
  400: '#a1a0ad',
  500: '#72717f',
  600: '#52515e',
  700: '#3f3e4a',
  800: '#26252f',
  900: '#17161e',
  950: '#0c0b12',
} as const;

export const spotlight = {
  300: '#ffdc8a',
  400: '#ffc237',
  500: '#f5a400',
  600: '#cf7b00',
} as const;

export const stage = {
  800: '#291852',
  900: '#180c34',
  950: '#0d0520',
} as const;

export const team = {
  1: '#fc5855',
  2: '#388cf0',
  3: '#f2c02a',
  4: '#37bb62',
  5: '#ac67ef',
  6: '#35c5db',
  7: '#f68622',
  8: '#f079b6',
} as const;

export const medal = {
  gold: '#f7c243',
  silver: '#cbd1db',
  bronze: '#d38b59',
} as const;

export const semantic = {
  light: {
    primary: violet[600],
    success: '#008c45',
    warning: '#ed990e',
    info: '#2474cf',
    error: '#e30019',
    live: '#ea1f2f',
    bgBase: '#ffffff',
    bgLayout: ink[50],
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    textBase: ink[950],
    textSecondary: ink[500],
    border: ink[200],
    borderSecondary: ink[100],
  },
  dark: {
    primary: violet[400],
    success: '#42c070',
    warning: '#f5ae39',
    info: '#5fa1f3',
    error: '#ff6468',
    live: '#fc4447',
    bgBase: ink[950],
    bgLayout: ink[950],
    bgContainer: ink[900],
    bgElevated: ink[900],
    textBase: ink[50],
    textSecondary: ink[400],
    border: ink[800],
    borderSecondary: ink[900],
  },
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  game: 20,
} as const;

export const font = {
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  display: 'var(--font-display), var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  game: 'var(--game-font), ui-sans-serif, system-ui, sans-serif',
} as const;

export const tokens = {
  violet,
  ink,
  spotlight,
  stage,
  team,
  medal,
  semantic,
  radius,
  font,
} as const;
