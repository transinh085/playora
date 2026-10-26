import { describe, expect, test } from 'bun:test';
import { planLimits } from '@playora/core/billing';
import { addMonths, dayToIso, isoToDay } from './dates';
import { redemptionsLeft, usageLevel, usagePercent } from './usage';

describe('usageLevel (D-21)', () => {
  const free = planLimits('free'); // 100 per month, refused from 110

  test('warns at 80% and at 100%, blocks only after the grace', () => {
    const level = (used: number) =>
      usageLevel(used, free.redemptionsPerMonth, free.redemptionsHardLimit);
    expect(level(0)).toBe('ok');
    expect(level(79)).toBe('ok');
    expect(level(80)).toBe('warning');
    expect(level(99)).toBe('warning');
    expect(level(100)).toBe('limit');
    expect(level(109)).toBe('limit');
    expect(level(110)).toBe('blocked');
  });

  test('running campaigns have no grace: full means limit, never blocked', () => {
    expect(usageLevel(0, 1)).toBe('ok');
    expect(usageLevel(1, 1)).toBe('limit');
    expect(usageLevel(2, 3)).toBe('ok');
    expect(usageLevel(3, 3)).toBe('limit');
  });

  test('unlimited is always ok', () => {
    expect(usageLevel(500, null)).toBe('ok');
    expect(usagePercent(500, null)).toBe(0);
  });

  test('percent is capped at 100 and redemptions left include the grace', () => {
    expect(usagePercent(50, 100)).toBe(50);
    expect(usagePercent(105, 100)).toBe(100);
    expect(redemptionsLeft(104, 110)).toBe(6);
    expect(redemptionsLeft(120, 110)).toBe(0);
  });
});

describe('billing dates (Vietnam calendar days)', () => {
  test('day edges are midnight and end of day in UTC+7', () => {
    expect(dayToIso('2026-11-01', 'start')).toBe('2026-10-31T17:00:00.000Z');
    expect(dayToIso('2026-11-30', 'end')).toBe('2026-11-30T16:59:59.999Z');
    expect(dayToIso('', 'start')).toBeNull();
    expect(dayToIso('30/11/2026', 'end')).toBeNull();
  });

  test('round-trips through the Vietnamese calendar day', () => {
    expect(isoToDay('2026-10-31T17:00:00.000Z')).toBe('2026-11-01');
    expect(isoToDay(dayToIso('2026-11-30', 'end'))).toBe('2026-11-30');
    expect(isoToDay(null)).toBe('');
  });

  test('addMonths clamps to the end of shorter months', () => {
    expect(addMonths('2026-10-27', 1)).toBe('2026-11-27');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 12)).toBe('2027-12-15');
  });
});
