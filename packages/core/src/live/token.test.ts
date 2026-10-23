import { describe, expect, test } from 'bun:test';
import { hashScreenKey, type LiveTokenClaims, signLiveToken, verifyLiveToken } from './token';

const secret = 'test-secret-0123456789';
const claims: LiveTokenClaims = {
  kind: 'player',
  organizationId: 'org_1',
  eventId: '0192d0c4-0000-7000-8000-000000000001',
  sub: '0192d0c4-0000-7000-8000-000000000002',
  displayName: 'Lan',
  team: null,
  env: 'live',
  exp: 2_000_000_000,
};

describe('live tokens', () => {
  test('round-trips claims', () => {
    expect(verifyLiveToken(signLiveToken(claims, secret), secret, 1_000)).toEqual(claims);
  });

  test('rejects a wrong secret, tampering and expiry', () => {
    const token = signLiveToken(claims, secret);
    expect(verifyLiveToken(token, 'other-secret-0123456789', 1_000)).toBeNull();
    const [body, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: claims.eventId })).toString(
      'base64url',
    );
    expect(verifyLiveToken(`${forged}.${mac}`, secret, 1_000)).toBeNull();
    expect(verifyLiveToken(`${body}.${mac}.x`, secret, 1_000)).toBeNull();
    expect(verifyLiveToken(token, secret, claims.exp)).toBeNull();
  });

  test('hashes screen keys deterministically', () => {
    expect(hashScreenKey('abc')).toBe(hashScreenKey('abc'));
    expect(hashScreenKey('abc')).not.toBe(hashScreenKey('abd'));
  });
});
