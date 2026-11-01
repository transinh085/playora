/** Voucher codes as staff type them: uppercase letters and digits only, at most 12 chars. */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export type ScannedRedeemPayload =
  | { type: 'code'; code: string }
  | { type: 'pair'; pairingCode: string };

/**
 * Parses a QR scan payload from the counter camera:
 * - Full URL containing `?pair=<token>` -> `{ type: 'pair', pairingCode }`
 * - Full URL containing `?code=<code >` -> `{ type: 'code', code }`
 * - Raw 4..12 character voucher code -> `{ type: 'code', code }`
 */
export function parseScannedRedeemPayload(raw: string): ScannedRedeemPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    ) {
      const url = new URL(trimmed, 'http://localhost');
      const pair = url.searchParams.get('pair')?.trim();
      if (pair && pair.length >= 8) {
        return { type: 'pair', pairingCode: pair };
      }
      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        const clean = normalizeCode(codeParam);
        if (clean.length >= 4) return { type: 'code', code: clean };
      }
      return null;
    }
  } catch {
    // Fall through to raw code parsing
  }

  const clean = normalizeCode(trimmed);
  if (clean.length >= 4 && clean.length <= 12) {
    return { type: 'code', code: clean };
  }
  return null;
}

/** Validates an owner reopen reason against `ReopenVoucherBody` (`3..500` trimmed chars). */
export function isValidReopenReason(reason: string): boolean {
  const len = reason.trim().length;
  return len >= 3 && len <= 500;
}
