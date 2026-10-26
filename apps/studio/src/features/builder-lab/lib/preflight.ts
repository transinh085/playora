import {
  ARTBOARD_WIDTH,
  type BrandPalette,
  type CanvasDoc,
  type CanvasElement,
  type ColorValue,
  resolveColor,
  SCREEN_KEYS,
  type ScreenDoc,
  type ScreenKey,
} from '@/features/canvas-editor/lib/model';
import type { Campaign } from '../api';
import { buildScreens, defaultPrizes } from './starter';

/**
 * Pre-flight before publish (docs/product/specs/builder.md §4.5): checks a campaign the way a careful reviewer
 * would and, where the fix is obvious, offers a one-click patch. Errors block publishing;
 * warnings only inform. Pure, so the publish dialog re-runs it on every draft change.
 */
export type IssueLevel = 'error' | 'warning';

export type IssueCode =
  | 'noPrizes'
  | 'zeroQuantity'
  | 'probabilitySum'
  | 'endInPast'
  | 'endBeforeStart'
  | 'lowStock'
  | 'smallText'
  | 'smallButton'
  | 'offCanvas'
  | 'lowContrast'
  | 'emptyTitle';

export interface PreflightIssue {
  /** Stable per problem, e.g. `smallText:cover:el_1`. */
  id: string;
  level: IssueLevel;
  /** i18n key under `builderLab.publish.issues`. */
  code: IssueCode;
  /** Values for the message (prize name, ratio, …). */
  params?: Record<string, string | number>;
  /** Which editing mode can fix it by hand, and where. */
  where: {
    area: 'prizes' | 'rules' | 'screens';
    screen?: ScreenKey;
    elementId?: string;
    elementName?: string;
    prizeId?: string;
  };
  /** One-click fix: a patch for the campaign as it is when the user clicks. */
  fix?: (campaign: Campaign) => Partial<Campaign>;
}

/** Below this much total stock the campaign runs dry within a day for most shops. */
export const LOW_STOCK_THRESHOLD = 10;
export const MIN_FONT_PX = 12;
export const FIXED_FONT_PX = 14;
export const MIN_TAP_PX = 44;
export const FIXED_TAP_PX = 48;
export const MIN_CONTRAST = 3;

const DAY_MS = 86_400_000;

// ── Colour maths (WCAG 2.x) ──────────────────────────────────────────────────────

/** Parses `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` (alpha ignored); null if not a hex colour. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3,8})$/i.exec(hex.trim());
  const body = m?.[1];
  if (!body || ![3, 4, 6, 8].includes(body.length)) return null;
  const full =
    body.length <= 4
      ? body
          .slice(0, 3)
          .split('')
          .map((c) => c + c)
          .join('')
      : body.slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colours (1…21); null if either is not a hex colour. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Worst-case contrast of `color` against a screen background (both gradient ends). */
function contrastOnScreen(color: ColorValue, screen: ScreenDoc, brand: BrandPalette) {
  const fg = resolveColor(color, brand);
  const ends = [screen.background.color, screen.background.gradientTo ?? screen.background.color];
  const ratios = ends
    .map((bg) => contrastRatio(fg, resolveColor(bg, brand)))
    .filter((r): r is number => r !== null);
  return ratios.length ? Math.min(...ratios) : null;
}

// ── Patch helpers ────────────────────────────────────────────────────────────────

function patchElement(
  campaign: Campaign,
  screen: ScreenKey,
  id: string,
  change: (element: CanvasElement, screenDoc: ScreenDoc) => Partial<CanvasElement>,
): Partial<Campaign> {
  const doc = campaign.screens[screen];
  const screens: CanvasDoc = {
    ...campaign.screens,
    [screen]: {
      ...doc,
      elements: doc.elements.map((e) =>
        e.id === id ? ({ ...e, ...change(e, doc) } as CanvasElement) : e,
      ),
    },
  };
  return { screens };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round1 = (v: number) => Math.round(v * 10) / 10;

// ── Checks ───────────────────────────────────────────────────────────────────────

function prizeIssues(c: Campaign): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  if (!c.prizes.length) {
    issues.push({
      id: 'noPrizes',
      level: 'error',
      code: 'noPrizes',
      where: { area: 'prizes' },
      fix: () => ({ prizes: defaultPrizes() }),
    });
    return issues;
  }
  for (const prize of c.prizes) {
    if (prize.quantity <= 0) {
      issues.push({
        id: `zeroQuantity:${prize.id}`,
        level: 'error',
        code: 'zeroQuantity',
        params: { name: prize.name },
        where: { area: 'prizes', prizeId: prize.id },
      });
    }
  }
  if (c.rules.mode === 'per_prize_probability') {
    const sum = c.prizes.reduce((total, p) => total + (p.probability ?? 0), 0);
    if (sum > 1 + 1e-9) {
      issues.push({
        id: 'probabilitySum',
        level: 'error',
        code: 'probabilitySum',
        params: { sum: round1(sum * 100) },
        where: { area: 'prizes' },
        // Keep the owner's proportions, scaled down so the chances add up to exactly 100%.
        fix: (current) => {
          const total = current.prizes.reduce((t, p) => t + (p.probability ?? 0), 0);
          if (total <= 1) return {};
          return {
            prizes: current.prizes.map((p) => ({
              ...p,
              probability: Math.floor(((p.probability ?? 0) / total) * 10_000) / 10_000,
            })),
          };
        },
      });
    }
  }
  const stock = c.prizes.reduce((total, p) => total + Math.max(0, p.quantity), 0);
  if (stock > 0 && stock < LOW_STOCK_THRESHOLD) {
    issues.push({
      id: 'lowStock',
      level: 'warning',
      code: 'lowStock',
      params: { total: stock },
      where: { area: 'prizes' },
    });
  }
  return issues;
}

function scheduleIssues(c: Campaign, now: Date): PreflightIssue[] {
  const starts = Date.parse(c.rules.startsAt);
  const ends = Date.parse(c.rules.endsAt);
  if (Number.isFinite(starts) && Number.isFinite(ends) && ends <= starts) {
    return [
      {
        id: 'endBeforeStart',
        level: 'error',
        code: 'endBeforeStart',
        where: { area: 'rules' },
        fix: (current) => ({
          rules: {
            ...current.rules,
            endsAt: new Date(Date.parse(current.rules.startsAt) + 14 * DAY_MS).toISOString(),
          },
        }),
      },
    ];
  }
  if (Number.isFinite(ends) && ends < now.getTime()) {
    return [
      {
        id: 'endInPast',
        level: 'error',
        code: 'endInPast',
        where: { area: 'rules' },
        fix: (current) => {
          const at = Date.now();
          const start = Date.parse(current.rules.startsAt);
          return {
            rules: {
              ...current.rules,
              startsAt: start < at ? new Date(at).toISOString() : current.rules.startsAt,
              endsAt: new Date(Math.max(at, start) + 14 * DAY_MS).toISOString(),
            },
          };
        },
      },
    ];
  }
  return [];
}

function elementIssues(c: Campaign, key: ScreenKey): PreflightIssue[] {
  const screen = c.screens[key];
  if (!screen) return [];
  const issues: PreflightIssue[] = [];
  const at = (e: CanvasElement) => ({
    area: 'screens' as const,
    screen: key,
    elementId: e.id,
    elementName: e.name,
  });

  for (const e of screen.elements) {
    if (e.hidden) continue;

    const outside =
      e.x + e.w <= 0 || e.x >= ARTBOARD_WIDTH || e.y + e.h <= 0 || e.y >= screen.height;
    if (outside) {
      issues.push({
        id: `offCanvas:${key}:${e.id}`,
        // Without a visible stage or form the screen cannot do its job.
        level: e.type === 'gameStage' || e.type === 'form' ? 'error' : 'warning',
        code: 'offCanvas',
        params: { name: e.name },
        where: at(e),
        fix: (current) =>
          patchElement(current, key, e.id, (el, doc) => ({
            x: Math.round(clamp(el.x, 0, Math.max(0, ARTBOARD_WIDTH - el.w))),
            y: Math.round(clamp(el.y, 0, Math.max(0, doc.height - el.h))),
          })),
      });
    }

    if (e.type === 'text') {
      if (e.slot === 'title' && !e.content.trim()) {
        issues.push({
          id: `emptyTitle:${key}:${e.id}`,
          level: 'error',
          code: 'emptyTitle',
          where: at(e),
          fix: (current) => {
            const defaults = buildScreens(current.templateKey, current.skinKey);
            const fallback = defaults[key].elements.find(
              (d) => d.type === 'text' && d.slot === 'title',
            );
            const content = fallback?.type === 'text' ? fallback.content : current.name;
            return patchElement(current, key, e.id, () => ({ content }));
          },
        });
      }
      if (e.fontSize < MIN_FONT_PX) {
        issues.push({
          id: `smallText:${key}:${e.id}`,
          level: 'warning',
          code: 'smallText',
          params: { name: e.name, size: e.fontSize },
          where: at(e),
          fix: (current) => patchElement(current, key, e.id, () => ({ fontSize: FIXED_FONT_PX })),
        });
      }
      const ratio = e.content.trim() ? contrastOnScreen(e.color, screen, c.brand) : null;
      if (ratio !== null && ratio < MIN_CONTRAST) {
        const textRatio = contrastOnScreen('brand.text', screen, c.brand);
        issues.push({
          id: `lowContrast:${key}:${e.id}`,
          level: 'warning',
          code: 'lowContrast',
          params: { name: e.name, ratio: round1(ratio) },
          where: at(e),
          // Only offer the brand text colour when it actually reads better.
          fix:
            e.color !== 'brand.text' && textRatio !== null && textRatio > ratio
              ? (current) => patchElement(current, key, e.id, () => ({ color: 'brand.text' }))
              : undefined,
        });
      }
    }

    if (e.type === 'button') {
      if (e.h < MIN_TAP_PX) {
        issues.push({
          id: `smallButton:${key}:${e.id}`,
          level: 'warning',
          code: 'smallButton',
          params: { name: e.name, size: e.h },
          where: at(e),
          // Grow around the centre so the button stays where the owner put it.
          fix: (current) =>
            patchElement(current, key, e.id, (el) => ({
              h: FIXED_TAP_PX,
              y: Math.round(el.y - (FIXED_TAP_PX - el.h) / 2),
            })),
        });
      }
      const ratio = contrastRatio(
        resolveColor(e.color, c.brand),
        resolveColor(e.background, c.brand),
      );
      if (ratio !== null && ratio < MIN_CONTRAST) {
        const bg = resolveColor(e.background, c.brand);
        const best = (['brand.text', 'brand.primary'] as const)
          .map((v) => ({ v, r: contrastRatio(resolveColor(v, c.brand), bg) ?? 0 }))
          .sort((a, b) => b.r - a.r)[0];
        issues.push({
          id: `lowContrast:${key}:${e.id}`,
          level: 'warning',
          code: 'lowContrast',
          params: { name: e.name, ratio: round1(ratio) },
          where: at(e),
          fix:
            best && best.r > ratio
              ? (current) => patchElement(current, key, e.id, () => ({ color: best.v }))
              : undefined,
        });
      }
    }
  }
  return issues;
}

/** All pre-flight issues, errors first. `now` is injectable for tests. */
export function preflight(campaign: Campaign, now = new Date()): PreflightIssue[] {
  const issues = [
    ...prizeIssues(campaign),
    ...scheduleIssues(campaign, now),
    ...SCREEN_KEYS.flatMap((key) =>
      key === 'form' && !campaign.rules.collectForm ? [] : elementIssues(campaign, key),
    ),
  ];
  return issues.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
}

export const hasBlockingIssues = (issues: PreflightIssue[]) =>
  issues.some((i) => i.level === 'error');
