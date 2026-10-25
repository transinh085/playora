/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  campaignDays,
  formatVnd,
  fromPercent,
  groupDigits,
  isoToLocalInput,
  localInputToIso,
  parseDigits,
  toPercent,
} from './rules-format';

describe('rules-format', () => {
  test('VND formatting and digit grouping', () => {
    expect(formatVnd(30_000)).toBe('30.000 đ');
    expect(formatVnd(30_000, 'en')).toBe('30,000 đ');
    expect(groupDigits(1_250_000)).toBe('1.250.000');
    expect(groupDigits('1250000', 'en')).toBe('1,250,000');
    expect(groupDigits(undefined)).toBe('');
    expect(parseDigits('1.250.000')).toBe(1_250_000);
    expect(parseDigits('')).toBe(0);
  });

  test('percent round-trips with one decimal and clamps', () => {
    expect(toPercent(0.355)).toBe(35.5);
    expect(fromPercent(35.5)).toBe(0.355);
    expect(fromPercent(140)).toBe(1);
    expect(fromPercent(-3)).toBe(0);
  });

  test('datetime-local round-trip', () => {
    const iso = '2027-01-20T08:30:00.000Z';
    expect(localInputToIso(isoToLocalInput(iso))).toBe(iso);
    expect(localInputToIso('')).toBeNull();
    expect(isoToLocalInput('nope')).toBe('');
  });

  test('campaign days rounds and has a floor of 1', () => {
    expect(campaignDays('2027-01-20T00:00:00Z', '2027-02-03T00:00:00Z')).toBe(14);
    expect(campaignDays('2027-01-20T00:00:00Z', '2027-01-20T02:00:00Z')).toBe(1);
  });
});
