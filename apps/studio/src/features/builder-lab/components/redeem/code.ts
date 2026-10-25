/** Voucher codes as staff type them: uppercase letters and digits only, at most 12 chars. */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}
