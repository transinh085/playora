import { theme as antdTheme, type ThemeConfig } from 'antd';
import { font, ink, radius, spotlight, stage, teal, violet } from './tokens';

/**
 * Runtime theming for game surfaces (player, kiosk).
 *
 * Order of application (docs/12-builder-spec.md §5): template default → skin (`data-skin`) →
 * brand kit (`brandKitVars`) → per-slot override. Skins live in styles.css; this module turns a
 * skin + customer's brand kit into both an Ant Design `ThemeConfig` and `--game-*` custom
 * properties, guaranteeing readable text on top of whatever colours the customer picks.
 */

/** Theme packs shipped with the platform. Keys match `[data-skin]` blocks in styles.css. */
export const skins = ['classic', 'yep', 'tet', 'day'] as const;
export type Skin = (typeof skins)[number];

/** Number of team/answer colours (`--team-1` … `--team-8`). */
export const TEAM_COLORS = 8;

export interface BrandKitTheme {
  /** Main action colour: buttons, progress, the player's own highlight. Hex. */
  primary?: string;
  /** Secondary highlight: badges, accents, timers. Hex. */
  accent?: string;
  /** Page ground behind the game. Hex. */
  background?: string;
  /** Body text colour. Derived from `background` when omitted. Hex. */
  text?: string;
  /** Corner style for buttons and panels. */
  radius?: 'square' | 'soft' | 'round';
  /** CSS font-family for headings, e.g. a self-hosted brand face. */
  fontDisplay?: string;
}

export type GameThemeVars = Partial<Record<`--game-${string}`, string>>;

export interface SkinPalette {
  bg: string;
  fg: string;
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  urgent: string;
}

export const skinPalettes: Record<Skin, SkinPalette> = {
  classic: {
    bg: stage[950],
    fg: '#f8f7ff',
    primary: spotlight[400],
    primaryFg: stage[950],
    accent: violet[400],
    accentFg: '#fcfcfc',
    urgent: '#ff5453',
  },
  yep: {
    bg: '#040e25',
    fg: '#faf5ea',
    primary: '#efcc83',
    primaryFg: '#09152c',
    accent: '#66abe5',
    accentFg: '#040e25',
    urgent: '#ff6661',
  },
  tet: {
    bg: '#6f000b',
    fg: '#fef5df',
    primary: '#facf4e',
    primaryFg: '#5c0109',
    accent: '#f8a9c7',
    accentFg: '#5c0109',
    urgent: '#fefcf4',
  },
  day: {
    bg: ink[50],
    fg: ink[950],
    primary: teal[600],
    primaryFg: '#fcfcfc',
    accent: spotlight[400],
    accentFg: ink[950],
    urgent: '#e31029',
  },
};

const RADIUS: Record<NonNullable<BrandKitTheme['radius']>, string> = {
  square: '0.25rem',
  soft: '0.75rem',
  round: '1.5rem',
};

const RADIUS_PX: Record<NonNullable<BrandKitTheme['radius']>, number> = {
  square: 4,
  soft: 12,
  round: 24,
};

const LIGHT_TEXT = '#ffffff';
const DARK_TEXT = '#140b26';
/** WCAG AA for large text; game labels are always ≥ 18px bold. */
const MIN_CONTRAST = 3;

type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function normalizeHex(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) throw new Error(`Invalid hex colour: ${ca ? b : a}`);
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrastRatio(bg, LIGHT_TEXT) >= contrastRatio(bg, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
}

export function isDark(hex: string): boolean {
  return readableOn(hex) === LIGHT_TEXT;
}

function isValidHex(c?: string): c is string {
  return !!c && parseHex(c) !== null;
}

/**
 * Maps a brand kit onto `--game-*` vars. Invalid colours are skipped so the skin shows through;
 * a `text` colour that would be unreadable on `background` is replaced by a safe one.
 */
export function brandKitVars(kit: BrandKitTheme): GameThemeVars {
  const vars: GameThemeVars = {};

  if (isValidHex(kit.primary)) {
    vars['--game-primary'] = kit.primary;
    vars['--game-primary-fg'] = readableOn(kit.primary);
  }
  if (isValidHex(kit.accent)) {
    vars['--game-accent'] = kit.accent;
    vars['--game-accent-fg'] = readableOn(kit.accent);
  }
  if (isValidHex(kit.background)) {
    const bg = kit.background;
    const dark = isDark(bg);
    const fg =
      isValidHex(kit.text) && contrastRatio(kit.text, bg) >= MIN_CONTRAST
        ? kit.text
        : readableOn(bg);
    vars['--game-bg'] = bg;
    vars['--game-fg'] = fg;
    vars['--game-muted'] = `color-mix(in oklch, ${fg} ${dark ? 66 : 62}%, ${bg})`;
    vars['--game-surface'] = dark ? 'oklch(1 0 0 / 8%)' : 'oklch(0 0 0 / 4%)';
    vars['--game-border'] = dark ? 'oklch(1 0 0 / 14%)' : 'oklch(0 0 0 / 10%)';
    vars['--game-glow'] =
      `color-mix(in oklch, ${vars['--game-primary'] ?? 'white'} 28%, transparent)`;
  }
  if (kit.radius) vars['--game-radius'] = RADIUS[kit.radius];
  if (kit.fontDisplay) vars['--game-font'] = kit.fontDisplay;
  return vars;
}

export interface GameThemeOptions {
  skin?: Skin;
  brand?: BrandKitTheme;
}

/**
 * Builds an Ant Design `ThemeConfig` from a game `skin` and optional customer `brand` kit,
 * preserving WCAG contrast rules for primary actions and ground text.
 */
export function gameThemeConfig(options: GameThemeOptions = {}): ThemeConfig {
  const skinKey: Skin = options.skin && skins.includes(options.skin) ? options.skin : 'classic';
  const base = skinPalettes[skinKey];
  const kit = options.brand ?? {};

  const primary = isValidHex(kit.primary) ? normalizeHex(kit.primary) : base.primary;
  const primaryFg = isValidHex(kit.primary) ? readableOn(primary) : base.primaryFg;
  const accent = isValidHex(kit.accent) ? normalizeHex(kit.accent) : base.accent;
  const bg = isValidHex(kit.background) ? normalizeHex(kit.background) : base.bg;
  const dark = isDark(bg);
  const fg = isValidHex(kit.background)
    ? isValidHex(kit.text) && contrastRatio(kit.text, bg) >= MIN_CONTRAST
      ? normalizeHex(kit.text)
      : readableOn(bg)
    : base.fg;
  const borderRadius = kit.radius ? RADIUS_PX[kit.radius] : radius.game;
  const fontFamily = kit.fontDisplay
    ? `${kit.fontDisplay}, var(--font-sans), ui-sans-serif, system-ui, sans-serif`
    : font.sans;

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: primary,
      colorInfo: accent,
      colorError: base.urgent,
      colorBgBase: bg,
      colorTextBase: fg,
      colorTextLightSolid: primaryFg,
      borderRadius,
      fontFamily,
      controlHeight: 44,
      controlHeightLG: 56,
      wireframe: false,
    },
    components: {
      Button: {
        primaryColor: primaryFg,
      },
    },
  };
}

/**
 * Resolves both the Ant Design `ThemeConfig` and `--game-*` CSS custom properties
 * for a given `skin` + `brand` kit.
 */
export function resolveGameTheme(options: GameThemeOptions = {}): {
  skin: Skin;
  theme: ThemeConfig;
  vars: GameThemeVars;
} {
  const skin: Skin = options.skin && skins.includes(options.skin) ? options.skin : 'classic';
  return {
    skin,
    theme: gameThemeConfig(options),
    vars: brandKitVars(options.brand ?? {}),
  };
}
