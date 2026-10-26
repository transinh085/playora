/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import type { CanvasElement, ScreenKey } from '@/features/canvas-editor/lib/model';
import type { Campaign } from '../api';
import {
  contrastRatio,
  FIXED_FONT_PX,
  FIXED_TAP_PX,
  hasBlockingIssues,
  type PreflightIssue,
  parseHex,
  preflight,
} from './preflight';
import { buildScreens, defaultPrizes, defaultRules, skinBrand } from './starter';

const NOW = new Date('2026-10-25T03:00:00.000Z');

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    organizationId: 'org1',
    slug: 'ca-phe-moc',
    name: 'Cà phê Mộc',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: skinBrand('tet'),
    screens: buildScreens('spin-wheel', 'tet'),
    prizes: defaultPrizes(),
    rules: defaultRules(NOW),
    status: 'draft',
    phase: 'draft',
    paused: false,
    version: 0,
    publishedAt: null,
    hasUnpublishedChanges: false,
    playbook: null,
    updatedAt: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

/** Replaces one element (found by predicate) on a screen. */
function withElement(
  c: Campaign,
  screen: ScreenKey,
  find: (e: CanvasElement) => boolean,
  patch: Partial<CanvasElement>,
): { campaign: Campaign; element: CanvasElement } {
  const doc = c.screens[screen];
  const index = doc.elements.findIndex(find);
  const current = doc.elements[index];
  if (!current) throw new Error('fixture element missing');
  const element = { ...current, ...patch } as CanvasElement;
  const elements = [...doc.elements];
  elements[index] = element;
  return { campaign: { ...c, screens: { ...c.screens, [screen]: { ...doc, elements } } }, element };
}

const byCode = (issues: PreflightIssue[], code: PreflightIssue['code']) =>
  issues.filter((i) => i.code === code);

/** Applies an issue's one-click fix and re-runs pre-flight. */
function applyFix(c: Campaign, issue: PreflightIssue | undefined): Campaign {
  if (!issue?.fix) throw new Error('issue has no fix');
  return { ...c, ...issue.fix(c) };
}

describe('contrast', () => {
  test('parses short and long hex, rejects others', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#11223344')).toEqual([17, 34, 51]);
    expect(parseHex('red')).toBeNull();
  });

  test('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#abc', '#abc')).toBeCloseTo(1, 5);
  });
});

describe('preflight', () => {
  test('a fresh template campaign has no blocking issue in any skin', () => {
    for (const skinKey of ['tet', 'grand-opening', 'everyday'] as const) {
      for (const templateKey of ['spin-wheel', 'scratch-card', 'gift-box'] as const) {
        const c = campaign({
          templateKey,
          skinKey,
          brand: skinBrand(skinKey),
          screens: buildScreens(templateKey, skinKey),
        });
        expect(preflight(c, NOW)).toEqual([]);
      }
    }
  });

  test('no prizes is an error, fixed by restoring starter prizes', () => {
    const c = campaign({ prizes: [] });
    const issues = preflight(c, NOW);
    expect(hasBlockingIssues(issues)).toBe(true);
    const fixed = applyFix(c, byCode(issues, 'noPrizes')[0]);
    expect(byCode(preflight(fixed, NOW), 'noPrizes')).toEqual([]);
  });

  test('a prize with zero quantity blocks publishing', () => {
    const prizes = defaultPrizes().map((p, i) => (i === 1 ? { ...p, quantity: 0 } : p));
    const issues = byCode(preflight(campaign({ prizes }), NOW), 'zeroQuantity');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: 'error', params: { name: 'Voucher 50K' } });
  });

  test('per-prize chances above 100% are scaled down by the fix', () => {
    const prizes = defaultPrizes().map((p) => ({ ...p, probability: 0.5 }));
    const c = campaign({ prizes, rules: { ...defaultRules(NOW), mode: 'per_prize_probability' } });
    const issue = byCode(preflight(c, NOW), 'probabilitySum')[0];
    expect(issue).toMatchObject({ level: 'error', params: { sum: 150 } });
    const fixed = applyFix(c, issue);
    const sum = fixed.prizes.reduce((t, p) => t + (p.probability ?? 0), 0);
    expect(sum).toBeLessThanOrEqual(1);
    expect(sum).toBeGreaterThan(0.99);
    expect(byCode(preflight(fixed, NOW), 'probabilitySum')).toEqual([]);
  });

  test('the same chances are fine in overall win-rate mode', () => {
    const prizes = defaultPrizes().map((p) => ({ ...p, probability: 0.5 }));
    expect(byCode(preflight(campaign({ prizes }), NOW), 'probabilitySum')).toEqual([]);
  });

  test('an end date before the start is an error with a fix', () => {
    const rules = { ...defaultRules(NOW), endsAt: '2026-10-20T00:00:00.000Z' };
    const c = campaign({ rules });
    const issue = byCode(preflight(c, NOW), 'endBeforeStart')[0];
    expect(issue?.level).toBe('error');
    const fixed = applyFix(c, issue);
    expect(Date.parse(fixed.rules.endsAt)).toBeGreaterThan(Date.parse(fixed.rules.startsAt));
  });

  test('a campaign that already ended is an error with a fix', () => {
    const rules = {
      ...defaultRules(NOW),
      startsAt: '2026-09-01T00:00:00.000Z',
      endsAt: '2026-09-15T00:00:00.000Z',
    };
    const c = campaign({ rules });
    const issue = byCode(preflight(c, NOW), 'endInPast')[0];
    expect(issue?.level).toBe('error');
    const fixed = applyFix(c, issue);
    expect(byCode(preflight(fixed), 'endInPast')).toEqual([]);
  });

  test('tiny total stock is only a warning', () => {
    const prizes = defaultPrizes().map((p) => ({ ...p, quantity: 2 }));
    const issues = preflight(campaign({ prizes }), NOW);
    expect(byCode(issues, 'lowStock')[0]).toMatchObject({ level: 'warning', params: { total: 6 } });
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  test('small text is raised to 14px', () => {
    const { campaign: c, element } = withElement(
      campaign(),
      'cover',
      (e) => e.slot === 'promoText',
      { fontSize: 10 } as Partial<CanvasElement>,
    );
    const issue = byCode(preflight(c, NOW), 'smallText')[0];
    expect(issue?.where).toMatchObject({ screen: 'cover', elementId: element.id });
    const fixed = applyFix(c, issue);
    const after = fixed.screens.cover.elements.find((e) => e.id === element.id);
    expect(after?.type === 'text' && after.fontSize).toBe(FIXED_FONT_PX);
    expect(byCode(preflight(fixed, NOW), 'smallText')).toEqual([]);
  });

  test('a short button grows to 48px around its centre', () => {
    const { campaign: c, element } = withElement(campaign(), 'cover', (e) => e.slot === 'cta', {
      h: 30,
      y: 600,
    });
    const fixed = applyFix(c, byCode(preflight(c, NOW), 'smallButton')[0]);
    const after = fixed.screens.cover.elements.find((e) => e.id === element.id);
    expect(after?.h).toBe(FIXED_TAP_PX);
    expect((after?.y ?? 0) + FIXED_TAP_PX / 2).toBe(600 + 15);
  });

  test('an element outside the artboard is moved back inside', () => {
    const { campaign: c, element } = withElement(campaign(), 'cover', (e) => e.slot === 'logo', {
      x: 500,
      y: -300,
    });
    const issue = byCode(preflight(c, NOW), 'offCanvas')[0];
    expect(issue?.level).toBe('warning');
    const fixed = applyFix(c, issue);
    const after = fixed.screens.cover.elements.find((e) => e.id === element.id);
    expect(after?.x).toBe(375 - element.w);
    expect(after?.y).toBe(0);
  });

  test('a game stage outside the artboard blocks publishing', () => {
    const { campaign: c } = withElement(campaign(), 'game', (e) => e.type === 'gameStage', {
      y: 2000,
    });
    expect(byCode(preflight(c, NOW), 'offCanvas')[0]?.level).toBe('error');
  });

  test('hidden elements are ignored', () => {
    const { campaign: c } = withElement(campaign(), 'cover', (e) => e.slot === 'logo', {
      x: 500,
      hidden: true,
    });
    expect(byCode(preflight(c, NOW), 'offCanvas')).toEqual([]);
  });

  test('low-contrast text is switched to the brand text colour', () => {
    const { campaign: c, element } = withElement(
      campaign(),
      'cover',
      (e) => e.slot === 'promoText',
      { color: '#b0281f' } as Partial<CanvasElement>,
    );
    const issue = byCode(preflight(c, NOW), 'lowContrast')[0];
    expect(issue?.where.elementId).toBe(element.id);
    expect(Number(issue?.params?.ratio)).toBeLessThan(3);
    const fixed = applyFix(c, issue);
    const after = fixed.screens.cover.elements.find((e) => e.id === element.id);
    expect(after?.type === 'text' && after.color).toBe('brand.text');
  });

  test('a brand colour change that kills contrast is caught through brand references', () => {
    const c = campaign({ brand: { ...skinBrand('tet'), text: '#b3261e' } });
    expect(byCode(preflight(c, NOW), 'lowContrast').length).toBeGreaterThan(0);
  });

  test('an empty title is an error, fixed with the template title', () => {
    const { campaign: c } = withElement(campaign(), 'cover', (e) => e.slot === 'title', {
      content: '  ',
    } as Partial<CanvasElement>);
    const issue = byCode(preflight(c, NOW), 'emptyTitle')[0];
    expect(issue?.level).toBe('error');
    const fixed = applyFix(c, issue);
    const title = fixed.screens.cover.elements.find((e) => e.slot === 'title');
    expect(title?.type === 'text' && title.content).toContain('VÒNG QUAY');
  });

  test('errors are listed before warnings', () => {
    const prizes = defaultPrizes().map((p) => ({ ...p, quantity: 1 }));
    const c = campaign({ prizes: [...prizes, { ...prizes[0], id: 'p9', quantity: 0 } as never] });
    const levels = preflight(c, NOW).map((i) => i.level);
    expect(levels.indexOf('warning')).toBeGreaterThan(levels.lastIndexOf('error'));
  });
});
