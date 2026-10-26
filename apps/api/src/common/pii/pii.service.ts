import { Inject, Injectable } from '@nestjs/common';
import {
  buildPiiKeyring,
  decryptPii,
  encryptPii,
  hashLookup,
  normalizePhone,
  type PiiKeyring,
} from '@playora/core/pii';
import type { ApiEnv } from '@playora/env';
import { ENV } from '../../infra/tokens';

export interface ProtectedPhone {
  /** AES-GCM ciphertext (`v1:<iv>:<ct>:<tag>`) of the normalised phone → players.phone_enc */
  phoneEnc: string;
  /** HMAC-SHA256 of the normalised phone → players.phone_hash */
  phoneHash: string;
}

/** Keys player PII with `PII_*` env (docs/engineering/security.md §3). */
export function piiKeysFromEnv(
  env: Pick<
    ApiEnv,
    'PII_ENCRYPTION_KEY' | 'PII_ENCRYPTION_KEY_ID' | 'PII_ENCRYPTION_PREVIOUS_KEYS' | 'PII_HMAC_KEY'
  >,
): { keyring: PiiKeyring; hmacKey: Buffer } {
  return {
    keyring: buildPiiKeyring(
      env.PII_ENCRYPTION_KEY_ID,
      env.PII_ENCRYPTION_KEY,
      env.PII_ENCRYPTION_PREVIOUS_KEYS,
    ),
    hmacKey: Buffer.from(env.PII_HMAC_KEY, 'base64'),
  };
}

/** Encrypts and hashes player PII. Only server code that is allowed to see the phone decrypts. */
@Injectable()
export class PiiService {
  private readonly keyring: PiiKeyring;
  private readonly hmacKey: Buffer;

  constructor(@Inject(ENV) env: ApiEnv) {
    const keys = piiKeysFromEnv(env);
    this.keyring = keys.keyring;
    this.hmacKey = keys.hmacKey;
  }

  /** Normalises, encrypts and hashes a phone; null when it has no digits. */
  protectPhone(raw: string): ProtectedPhone | null {
    const normalized = normalizePhone(raw);
    if (!normalized) return null;
    return {
      phoneEnc: encryptPii(normalized, this.keyring),
      phoneHash: hashLookup(normalized, this.hmacKey),
    };
  }

  /** Decrypts players.phone_enc (normalised, e.g. `84901234567`). */
  decrypt(phoneEnc: string): string {
    return decryptPii(phoneEnc, this.keyring);
  }
}
