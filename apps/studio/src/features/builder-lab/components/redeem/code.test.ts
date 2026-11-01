import { describe, expect, test } from 'bun:test';
import { isValidReopenReason, normalizeCode, parseScannedRedeemPayload } from './code';

describe('normalizeCode', () => {
  test('uppercases and strips separators', () => {
    expect(normalizeCode(' k7m-2qx ')).toBe('K7M2QX');
    expect(normalizeCode('ab cd.ef')).toBe('ABCDEF');
  });

  test('caps the length', () => {
    expect(normalizeCode('a'.repeat(20))).toHaveLength(12);
  });
});

describe('parseScannedRedeemPayload', () => {
  test('parses raw voucher codes and URLs with ?code= or ?pair=', () => {
    expect(parseScannedRedeemPayload('k7m2qx')).toEqual({ type: 'code', code: 'K7M2QX' });
    expect(
      parseScannedRedeemPayload('https://studio.playora.vn/orgs/org_1/redeem?code=ab34cd'),
    ).toEqual({
      type: 'code',
      code: 'AB34CD',
    });
    expect(
      parseScannedRedeemPayload(
        'https://studio.playora.vn/orgs/org_1/redeem?pair=0123456789abcdef',
      ),
    ).toEqual({
      type: 'pair',
      pairingCode: '0123456789abcdef',
    });
    expect(parseScannedRedeemPayload('   ')).toBeNull();
  });
});

describe('isValidReopenReason', () => {
  test('requires 3..500 trimmed characters', () => {
    expect(isValidReopenReason('ab')).toBe(false);
    expect(isValidReopenReason('  ab  ')).toBe(false);
    expect(isValidReopenReason('Bấm nhầm mã')).toBe(true);
    expect(isValidReopenReason('x'.repeat(501))).toBe(false);
  });
});
