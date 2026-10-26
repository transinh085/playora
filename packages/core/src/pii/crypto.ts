import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/**
 * Application-level PII encryption (docs/engineering/security.md §3).
 *
 * - `encryptPii` → AES-256-GCM, random 96-bit IV per call. Output is
 *   `<keyId>:<iv>:<ciphertext>:<tag>` with each part base64url, e.g. `v1:…:…:…`.
 *   The key id lets a new key be added later: new writes use the current key, old rows still
 *   decrypt with the key their prefix names.
 * - `hashLookup` → HMAC-SHA256 (base64url) for equality lookups (players.phone_hash). It uses a
 *   separate key and has no version: rotating it means recomputing every hash.
 *
 * Pure: keys come from the caller (API env), nothing is read from process.env here.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const KEY_ID_REGEX = /^[a-z0-9]{1,16}$/;

export interface PiiKeyring {
  /** Key id written into new ciphertexts. */
  currentKeyId: string;
  /** Every key that may still appear in stored ciphertexts, by id (32 bytes each). */
  keys: Readonly<Record<string, Uint8Array>>;
}

/** Decodes a 32-byte AES key from base64 (standard or url-safe); throws on a wrong length. */
export function decodePiiKey(base64: string): Buffer {
  const key = Buffer.from(base64.trim(), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`PII encryption key must decode to ${KEY_BYTES} bytes, got ${key.length}`);
  }
  return key;
}

/**
 * Builds a keyring from the env values: the current key plus optional previous keys written as
 * `id:base64,id:base64`.
 */
export function buildPiiKeyring(
  currentKeyId: string,
  currentKey: string,
  previousKeys?: string,
): PiiKeyring {
  const keys: Record<string, Uint8Array> = {};
  for (const entry of (previousKeys ?? '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(':');
    if (sep <= 0) throw new Error('Previous PII keys must be written as id:base64');
    const id = trimmed.slice(0, sep);
    assertKeyId(id);
    keys[id] = decodePiiKey(trimmed.slice(sep + 1));
  }
  assertKeyId(currentKeyId);
  keys[currentKeyId] = decodePiiKey(currentKey);
  return { currentKeyId, keys };
}

function assertKeyId(id: string) {
  if (!KEY_ID_REGEX.test(id)) throw new Error(`Invalid PII key id "${id}"`);
}

export function encryptPii(plaintext: string, keyring: PiiKeyring): string {
  const key = keyring.keys[keyring.currentKeyId];
  if (!key) throw new Error(`PII key "${keyring.currentKeyId}" is not in the keyring`);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  // The key id is authenticated too, so a ciphertext cannot be relabelled to another key.
  cipher.setAAD(Buffer.from(keyring.currentKeyId));
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    keyring.currentKeyId,
    iv.toString('base64url'),
    ct.toString('base64url'),
    tag.toString('base64url'),
  ].join(':');
}

/** Decrypts a value from `encryptPii`; throws if it is malformed, tampered with or the key is unknown. */
export function decryptPii(payload: string, keyring: PiiKeyring): string {
  const parts = payload.split(':');
  if (parts.length !== 4) throw new Error('Malformed PII ciphertext');
  const [keyId, ivB64, ctB64, tagB64] = parts as [string, string, string, string];
  const key = keyring.keys[keyId];
  if (!key) throw new Error(`Unknown PII key id "${keyId}"`);
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Malformed PII ciphertext');
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(keyId));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** HMAC-SHA256 (base64url) of an already-normalised value, for equality lookups. */
export function hashLookup(normalized: string, hmacKey: string | Uint8Array): string {
  const key = typeof hmacKey === 'string' ? Buffer.from(hmacKey, 'base64') : hmacKey;
  if (key.length < 16) throw new Error('PII HMAC key must be at least 16 bytes');
  return createHmac('sha256', key).update(normalized, 'utf8').digest('base64url');
}
