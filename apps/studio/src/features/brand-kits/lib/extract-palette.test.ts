import { describe, expect, it } from 'bun:test';
import {
  contrastRatio,
  extractPaletteFromImage,
  extractPaletteFromPixels,
} from './extract-palette';

function buildPixelBuffer(
  entries: Array<{ rgb: [number, number, number]; alpha?: number; count: number }>,
): Uint8ClampedArray {
  const totalPixels = entries.reduce((sum, entry) => sum + entry.count, 0);
  const data = new Uint8ClampedArray(totalPixels * 4);
  let offset = 0;
  for (const entry of entries) {
    const [r, g, b] = entry.rgb;
    const a = entry.alpha ?? 255;
    for (let i = 0; i < entry.count; i++) {
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = a;
      offset += 4;
    }
  }
  return data;
}

describe('extractPaletteFromImage', () => {
  it('extracts deterministic 5-color palette from dominant and secondary logo colors', async () => {
    const pixels = buildPixelBuffer([
      // Transparent background
      { rgb: [255, 255, 255], alpha: 0, count: 200 },
      // White padding
      { rgb: [250, 250, 250], count: 150 },
      // Dominant brand teal (#0f7c79 -> [15, 124, 121])
      { rgb: [15, 124, 121], count: 120 },
      // Secondary warm amber (#f59e0b -> [245, 158, 11])
      { rgb: [245, 158, 11], count: 50 },
    ]);

    const first = await extractPaletteFromImage({ data: pixels, width: 32, height: 16 });
    const second = await extractPaletteFromImage({ data: pixels, width: 32, height: 16 });

    expect(first).toEqual(second);
    expect(first.primary).toBe('#0f7c79');
    expect(first.accent).toBe('#f59e0b');
    expect(first.background).toMatch(/^#[0-9a-f]{6}$/);
    expect(first.surface).toMatch(/^#[0-9a-f]{6}$/);
    expect(first.text).toMatch(/^#[0-9a-f]{6}$/);

    // WCAG AA contrast guarantee (>= 4.5:1)
    expect(contrastRatio(first.text, first.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(first.text, first.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('derives a complementary accent and WCAG AA text when logo is monochromatic', () => {
    const pixels = buildPixelBuffer([
      // Single brand color: match green (#3f6212 -> [63, 98, 18])
      { rgb: [63, 98, 18], count: 100 },
    ]);

    const palette = extractPaletteFromPixels(pixels);
    expect(palette.primary).toBe('#3f6212');
    expect(palette.accent).not.toBe(palette.primary);
    expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('returns fallback F&B palette when image is completely transparent', () => {
    const pixels = buildPixelBuffer([{ rgb: [0, 0, 0], alpha: 0, count: 64 }]);
    const palette = extractPaletteFromPixels(pixels);

    expect(palette.primary).toBe('#0f7c79');
    expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
