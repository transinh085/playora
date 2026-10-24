import { describe, expect, test } from 'bun:test';
import { type PlayerSessionClaims, signPlayerSession, verifyPlayerSession } from './token';

const secret = 'test-secret-0123456789abcdef0123456789';
const claims: PlayerSessionClaims = {
  kind: 'player',
  organizationId: 'org_1',
  eventId: '0192d0c4-0000-7000-8000-000000000001',
  sub: '0192d0c4-0000-7000-8000-000000000002',
  displayName: 'Lan',
  ver: 1,
  exp: 2_000_000_000,
};

describe('player session tokens', () => {
  test('round-trips claims', () => {
    expect(verifyPlayerSession(signPlayerSession(claims, secret), secret, 1_000)).toEqual(claims);
  });

  test('rejects a wrong secret, tampering and expiry', () => {
    const token = signPlayerSession(claims, secret);
    expect(verifyPlayerSession(token, 'other-secret-0123456789abcdef012345', 1_000)).toBeNull();
    const [body, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: claims.eventId })).toString(
      'base64url',
    );
    expect(verifyPlayerSession(`${forged}.${mac}`, secret, 1_000)).toBeNull();
    expect(verifyPlayerSession(`${body}.${mac}.x`, secret, 1_000)).toBeNull();
    expect(verifyPlayerSession(token, secret, claims.exp)).toBeNull();
  });
});
