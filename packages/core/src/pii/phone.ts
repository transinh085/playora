/**
 * Normalises a Vietnamese-style phone number for hashing and storage: digits only, country code
 * 84 without `+` (E.164 without the plus). `0901 234 567`, `+84 90 123 4567`, `84901234567` and
 * `(090) 123-4567` all become `84901234567`. Numbers with another country code keep their digits.
 * Returns null when nothing usable is left.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2) || null;
  if (digits.startsWith('0')) digits = `84${digits.slice(1)}`;
  return digits;
}
