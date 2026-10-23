/**
 * Runtime theming for game surfaces (player, screen, kiosk).
 *
 * Order of application (docs/12-builder-spec.md §5): template default → skin (`data-skin`) →
 * brand kit (`brandKitVars`) → per-slot override. Skins live in styles.css; this module turns a
 * customer's brand kit into `--game-*` custom properties and guarantees readable text on top of
 * whatever colours the customer picks.
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

const RADIUS: Record<NonNullable<BrandKitTheme['radius']>, string> = {
  square: '0.25rem',
  soft: '0.75rem',
  round: '1.5rem',
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

/**
 * Maps a brand kit onto `--game-*` vars. Invalid colours are skipped so the skin shows through;
 * a `text` colour that would be unreadable on `background` is replaced by a safe one.
 */
export function brandKitVars(kit: BrandKitTheme): GameThemeVars {
  const vars: GameThemeVars = {};
  const valid = (c?: string): c is string => !!c && parseHex(c) !== null;

  if (valid(kit.primary)) {
    vars['--game-primary'] = kit.primary;
    vars['--game-primary-fg'] = readableOn(kit.primary);
  }
  if (valid(kit.accent)) {
    vars['--game-accent'] = kit.accent;
    vars['--game-accent-fg'] = readableOn(kit.accent);
  }
  if (valid(kit.background)) {
    const bg = kit.background;
    const dark = isDark(bg);
    const fg =
      valid(kit.text) && contrastRatio(kit.text, bg) >= MIN_CONTRAST ? kit.text : readableOn(bg);
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
