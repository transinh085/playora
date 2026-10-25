/** Share of the foil that must be scratched off before the card reveals itself. */
export const REVEAL_THRESHOLD = 0.45;

/** Fraction of transparent pixels in RGBA `data`, sampling every `step`-th pixel. */
export function clearedRatio(data: Uint8ClampedArray, step = 8): number {
  let total = 0;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4 * step) {
    total += 1;
    if ((data[i] ?? 255) < 128) clear += 1;
  }
  return total ? clear / total : 0;
}
