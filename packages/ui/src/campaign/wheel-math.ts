import type { CampaignPrize, PlayResult } from '@playora/contracts';

/** What the wheel needs from a prize. */
export type WheelPrize = Pick<CampaignPrize, 'id' | 'name' | 'image'>;

/**
 * Pure spin-wheel geometry. The wheel only *shows* the server's result: these helpers pick a
 * slice that matches the returned prize (or a "good luck" slice on a loss) and the rotation that
 * lands it under the pointer. Nothing here can change what was won.
 */
export type WheelSlice = { kind: 'prize'; prize: WheelPrize } | { kind: 'luck' };

export const MIN_SLICES = 6;

/** Prizes interleaved with "good luck" slices; prizes repeat until the wheel has `MIN_SLICES`. */
export function buildSlices(prizes: readonly WheelPrize[]): WheelSlice[] {
  if (prizes.length === 0) return Array.from({ length: MIN_SLICES }, () => ({ kind: 'luck' }));
  const count = Math.max(prizes.length * 2, MIN_SLICES);
  return Array.from({ length: count }, (_, i): WheelSlice => {
    const prize = prizes[Math.floor(i / 2) % prizes.length];
    return i % 2 === 0 && prize ? { kind: 'prize', prize } : { kind: 'luck' };
  });
}

/** Index of a slice showing `result` (random among matches, so repeats don't look scripted). */
export function targetSliceIndex(
  slices: WheelSlice[],
  result: Pick<PlayResult, 'outcome' | 'prize'>,
  rng: () => number = Math.random,
): number {
  const prizeId = result.outcome === 'win' ? result.prize?.id : undefined;
  const matches = slices
    .map((slice, i) => ({ slice, i }))
    .filter(({ slice }) =>
      prizeId ? slice.kind === 'prize' && slice.prize.id === prizeId : slice.kind === 'luck',
    )
    .map(({ i }) => i);
  if (matches.length === 0) return 0;
  return matches[Math.min(matches.length - 1, Math.floor(rng() * matches.length))] ?? 0;
}

/** Centre of slice `index`, in degrees clockwise from the top (where the pointer sits). */
export function sliceCenter(index: number, count: number): number {
  return ((index + 0.5) * 360) / count;
}

const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Absolute clockwise rotation that lands slice `index` under the top pointer after at least
 * `turns` full turns from `current`. `jitter` (-0.5..0.5, kept inside the slice) offsets the
 * landing point within the slice so it doesn't always stop dead centre.
 */
export function targetRotation(
  current: number,
  index: number,
  count: number,
  turns: number,
  jitter = 0,
): number {
  const sliceDeg = 360 / count;
  const landing = sliceCenter(index, count) + Math.max(-0.4, Math.min(0.4, jitter)) * sliceDeg;
  const extra = mod360(-landing - current);
  return current + turns * 360 + extra;
}

/** The slice under the top pointer for a given wheel rotation (inverse of `targetRotation`). */
export function sliceAtPointer(rotation: number, count: number): number {
  return Math.floor(mod360(-rotation) / (360 / count)) % count;
}
