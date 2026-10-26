import { describe, expect, test } from 'bun:test';
import {
  buildPiiKeyring,
  decodePiiKey,
  decryptPii,
  encryptPii,
  hashLookup,
  normalizePhone,
} from './index';

const KEY_A = Buffer.alloc(32, 1).toString('base64');
const KEY_B = Buffer.alloc(32, 2).toString('base64');
const HMAC_KEY = Buffer.alloc(32, 3).toString('base64');

describe('core/pii crypto', () => {
  const keyring = buildPiiKeyring('v1', KEY_A);

  test('round trips and writes the key id prefix', () => {
    const enc = encryptPii('84901234567', keyring);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(enc.split(':')).toHaveLength(4);
    expect(enc).not.toContain('84901234567');
    expect(decryptPii(enc, keyring)).toBe('84901234567');
  });

  test('uses a fresh IV each time', () => {
    const a = encryptPii('84901234567', keyring);
    const b = encryptPii('84901234567', keyring);
    expect(a).not.toBe(b);
    expect(a.split(':')[1]).not.toBe(b.split(':')[1]);
  });

  test('detects tampering with the ciphertext, tag or key id', () => {
    const enc = encryptPii('84901234567', keyring);
    const [id, iv, ct, tag] = enc.split(':') as [string, string, string, string];
    const flip = (s: string) => {
      const buf = Buffer.from(s, 'base64url');
      buf[0] = (buf[0] ?? 0) ^ 1;
      return buf.toString('base64url');
    };
    expect(() => decryptPii([id, iv, flip(ct), tag].join(':'), keyring)).toThrow();
    expect(() => decryptPii([id, iv, ct, flip(tag)].join(':'), keyring)).toThrow();
    expect(() => decryptPii([id, flip(iv), ct, tag].join(':'), keyring)).toThrow();
    // Relabelling to another key id fails (unknown id, or AAD mismatch when the id exists).
    const both = buildPiiKeyring('v2', KEY_B, `v1:${KEY_A}`);
    expect(() => decryptPii(['v2', iv, ct, tag].join(':'), both)).toThrow();
    expect(() => decryptPii('garbage', keyring)).toThrow();
  });

  test('a wrong key cannot decrypt', () => {
    const enc = encryptPii('84901234567', keyring);
    expect(() => decryptPii(enc, buildPiiKeyring('v1', KEY_B))).toThrow();
  });

  test('supports adding a new key while old ciphertexts still decrypt', () => {
    const old = encryptPii('84901234567', keyring);
    const rotated = buildPiiKeyring('v2', KEY_B, `v1:${KEY_A}`);
    const fresh = encryptPii('84909999999', rotated);
    expect(fresh.startsWith('v2:')).toBe(true);
    expect(decryptPii(old, rotated)).toBe('84901234567');
    expect(decryptPii(fresh, rotated)).toBe('84909999999');
  });

  test('rejects keys that are not 32 bytes and bad key ids', () => {
    expect(() => decodePiiKey(Buffer.alloc(16).toString('base64'))).toThrow();
    expect(() => buildPiiKeyring('V 1', KEY_A)).toThrow();
    expect(() => buildPiiKeyring('v2', KEY_B, 'nocolon')).toThrow();
  });

  test('hashLookup is stable, keyed and does not reveal the input', () => {
    const h1 = hashLookup('84901234567', HMAC_KEY);
    expect(hashLookup('84901234567', HMAC_KEY)).toBe(h1);
    expect(hashLookup('84901234568', HMAC_KEY)).not.toBe(h1);
    expect(hashLookup('84901234567', Buffer.alloc(32, 4).toString('base64'))).not.toBe(h1);
    expect(h1).not.toContain('84901234567');
    expect(() => hashLookup('x', Buffer.alloc(8).toString('base64'))).toThrow();
  });
});

describe('core/pii normalizePhone', () => {
  test('maps the common Vietnamese spellings to 84…', () => {
    for (const raw of [
      '0901234567',
      '  090 123 4567 ',
      '+84 90 123 4567',
      '+84 (90) 123-4567',
      '84901234567',
      '(090) 123-4567',
      '0084901234567',
    ]) {
      expect(normalizePhone(raw)).toBe('84901234567');
    }
  });

  test('keeps other country codes and rejects empty input', () => {
    expect(normalizePhone('+1 (415) 555-0100')).toBe('14155550100');
    expect(normalizePhone(' - ')).toBeNull();
  });
});
