/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { CreateCampaignBody } from '@playora/contracts';
import {
  addDays,
  daysBetween,
  defaultSetup,
  localDate,
  openDayCount,
  PLAYBOOK_KEYS,
  PLAYBOOKS,
  playbookRules,
  startOfLocalDay,
} from './playbooks';
import { buildScreens, skinBrand } from './starter';
import { suggestPlaybook } from './suggest';

const NOW = new Date('2026-10-27T03:00:00.000Z'); // Tuesday 10:00 in Vietnam

describe('playbook catalogue (docs/product/specs/playbooks.md §2)', () => {
  test('three M1 playbooks with their template, skin and mechanism', () => {
    expect(PLAYBOOK_KEYS).toEqual(['tet_traffic', 'second_visit', 'slow_days']);
    expect(PLAYBOOKS.tet_traffic).toMatchObject({ templateKey: 'spin-wheel', skinKey: 'tet' });
    expect(PLAYBOOKS.tet_traffic.rules).toMatchObject({ playsPerDay: 1, pacing: true });
    expect(PLAYBOOKS.second_visit).toMatchObject({
      templateKey: 'scratch-card',
      skinKey: 'everyday',
      days: 30,
    });
    expect(PLAYBOOKS.second_visit.rules).toMatchObject({
      requireRedeemBeforeReplay: true,
      collectForm: true,
    });
    expect(PLAYBOOKS.slow_days).toMatchObject({
      templateKey: 'gift-box',
      skinKey: 'everyday',
      openDays: [2, 3, 4],
    });
  });

  test('slow days spends more per prize than the other playbooks', () => {
    const avgCost = (k: keyof typeof PLAYBOOKS) =>
      PLAYBOOKS[k].prizes.reduce((s, p) => s + p.costVnd * p.weight, 0);
    expect(avgCost('slow_days')).toBeGreaterThan(avgCost('tet_traffic'));
    expect(avgCost('slow_days')).toBeGreaterThan(avgCost('second_visit'));
  });

  test('prize weights add up to 1', () => {
    for (const key of PLAYBOOK_KEYS) {
      const total = PLAYBOOKS[key].prizes.reduce((s, p) => s + p.weight, 0);
      expect(total).toBeCloseTo(1, 9);
    }
  });
});

describe('dates', () => {
  test('local day helpers use Vietnam time', () => {
    expect(localDate(new Date('2026-10-27T18:00:00Z'))).toBe('2026-10-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(startOfLocalDay('2027-01-20')).toBe('2027-01-19T17:00:00.000Z');
    expect(daysBetween('2027-01-20', '2027-02-08')).toBe(20);
    expect(daysBetween('2027-01-20', '2027-01-19')).toBe(0);
  });

  test('open days count only the chosen weekdays', () => {
    // 2026-10-27 is a Tuesday; four weeks hold 12 Tue–Thu days.
    expect(openDayCount('2026-10-27', '2026-11-23', [2, 3, 4])).toBe(12);
    expect(openDayCount('2026-10-27', '2026-11-23', null)).toBe(28);
  });
});

describe('playbook → campaign', () => {
  test('default setup spans the playbook length from today', () => {
    const setup = defaultSetup('tet_traffic', 'Tết', NOW);
    expect(setup.startDate).toBe('2026-10-27');
    expect(daysBetween(setup.startDate, setup.endDate)).toBe(20);
    expect(setup.budgetVnd).toBe(2_000_000);
  });

  test('rules run from local midnight to the end of the last day, with the budget', () => {
    const rules = playbookRules('slow_days', defaultSetup('slow_days', 'x', NOW), 0.3);
    expect(rules.startsAt).toBe('2026-10-26T17:00:00.000Z');
    expect(rules.endsAt).toBe('2026-11-23T17:00:00.000Z');
    expect(rules.openDays).toEqual([2, 3, 4]);
    expect(rules.budgetVnd).toBe(2_000_000);
    expect(rules.overallWinRate).toBe(0.3);
    // All seven weekdays is the same as "every day".
    expect(
      playbookRules('slow_days', {
        ...defaultSetup('slow_days', 'x', NOW),
        openDays: [0, 1, 2, 3, 4, 5, 6],
      }).openDays,
    ).toBeNull();
  });

  test('every playbook builds a body the create contract accepts', () => {
    for (const key of PLAYBOOK_KEYS) {
      const pb = PLAYBOOKS[key];
      const s = suggestPlaybook(key, defaultSetup(key, `Playbook ${key}`, NOW), { seeds: 4 });
      const parsed = CreateCampaignBody.safeParse({
        name: `Playbook ${key}`,
        templateKey: pb.templateKey,
        skinKey: pb.skinKey,
        playbook: key,
        brand: skinBrand(pb.skinKey),
        screens: buildScreens(pb.templateKey, pb.skinKey),
        prizes: s.prizes,
        rules: s.rules,
      });
      expect(parsed.success).toBe(true);
    }
  });
});
