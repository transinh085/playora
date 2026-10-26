/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { isPlayerTokenValid } from './session';

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

describe('isPlayerTokenValid', () => {
  test('accepts a valid unexpired player token', () => {
    const token = `${encodePayload({ kind: 'player', sub: 'player-1', exp: 2_000 })}.sig`;
    expect(isPlayerTokenValid(token, 1_500)).toBe(true);
  });

  test('rejects expired or malformed tokens', () => {
    const expired = `${encodePayload({ kind: 'player', sub: 'player-1', exp: 1_000 })}.sig`;
    expect(isPlayerTokenValid(expired, 1_500)).toBe(false);
    expect(isPlayerTokenValid('invalid-token', 1_500)).toBe(false);
    expect(isPlayerTokenValid('', 1_500)).toBe(false);
  });
});
