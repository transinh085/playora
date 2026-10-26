/** Same limits as `StartPlayBody.channel` in `@playora/contracts`. */
const MAX_CHANNEL_LENGTH = 64;

type SearchParamValue = string | string[] | undefined;

/**
 * Turns a raw `?ch=` value into a channel key the play contract accepts (`^[a-z0-9_-]*$`, ≤ 64):
 * lower-cased, diacritics stripped (`Bàn 1` → `ban-1`), spaces to `-`, anything else dropped.
 * Returns `undefined` when nothing usable is left, so the play is simply not attributed.
 */
export function sanitizeChannel(raw: SearchParamValue | null): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const key = value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, MAX_CHANNEL_LENGTH);
  return key.length > 0 ? key : undefined;
}

/** Channel from the link (docs/product/specs/participation.md §5): `?ch=` first, then the short `?c=`. */
export function channelFromSearchParams(
  params: Record<string, SearchParamValue>,
): string | undefined {
  return sanitizeChannel(params.ch) ?? sanitizeChannel(params.c);
}
