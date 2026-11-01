export interface ExtractedBrandPalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

export interface PixelBufferInput {
  data: Uint8ClampedArray | number[];
  width?: number;
  height?: number;
}

type Rgb = [number, number, number];

const FALLBACK_PALETTE: ExtractedBrandPalette = {
  primary: '#0f7c79',
  accent: '#facf4e',
  background: '#fffdf9',
  surface: '#f5efe6',
  text: '#1c1917',
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex([r, g, b]: Rgb): string {
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = Number.parseInt((clean[0] ?? '0') + (clean[0] ?? '0'), 16);
    const g = Number.parseInt((clean[1] ?? '0') + (clean[1] ?? '0'), 16);
    const b = Number.parseInt((clean[2] ?? '0') + (clean[2] ?? '0'), 16);
    return [Number.isNaN(r) ? 0 : r, Number.isNaN(g) ? 0 : g, Number.isNaN(b) ? 0 : b];
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [Number.isNaN(r) ? 0 : r, Number.isNaN(g) ? 0 : g, Number.isNaN(b) ? 0 : b];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const hn = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  return [clampByte((r1 + m) * 255), clampByte((g1 + m) * 255), clampByte((b1 + m) * 255)];
}

function mixRgb(a: Rgb, b: Rgb, weightB: number): Rgb {
  const wA = 1 - weightB;
  return [
    clampByte(a[0] * wA + b[0] * weightB),
    clampByte(a[1] * wA + b[1] * weightB),
    clampByte(a[2] * wA + b[2] * weightB),
  ];
}

function colorDistance(a: Rgb, b: Rgb): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Relative luminance per WCAG 2.1. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const transform = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/** WCAG 2.1 contrast ratio between two hex colors (1 to 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ColorBucket {
  count: number;
  rSum: number;
  gSum: number;
  bSum: number;
}

/**
 * Deterministically extracts a 5-color semantic Brand Kit palette from raw RGBA pixels.
 * Guarantees WCAG AA contrast (>= 4.5:1) for `text` against both `background` and `surface`.
 */
export function extractPaletteFromPixels(
  pixels: Uint8ClampedArray | number[],
): ExtractedBrandPalette {
  const buckets = new Map<number, ColorBucket>();
  const fallbackBuckets = new Map<number, ColorBucket>();

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const a = pixels[i + 3] ?? 255;

    if (a < 128) continue;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const fb = fallbackBuckets.get(key);
    if (fb) {
      fb.count += 1;
      fb.rSum += r;
      fb.gSum += g;
      fb.bSum += b;
    } else {
      fallbackBuckets.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }

    // Ignore near-white and near-black background/border pixels when looking for brand hues
    const isNearWhite = r > 242 && g > 242 && b > 242;
    const isNearBlack = r < 18 && g < 18 && b < 18;
    if (isNearWhite || isNearBlack) continue;

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
    } else {
      buckets.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  const activeBuckets = buckets.size > 0 ? buckets : fallbackBuckets;
  if (activeBuckets.size === 0) {
    return { ...FALLBACK_PALETTE };
  }

  const scored = Array.from(activeBuckets.entries())
    .map(([key, bucket]) => {
      const avg: Rgb = [
        Math.round(bucket.rSum / bucket.count),
        Math.round(bucket.gSum / bucket.count),
        Math.round(bucket.bSum / bucket.count),
      ];
      const [, sat, light] = rgbToHsl(avg);
      // Favor saturated, mid-tone brand colors while still respecting pixel dominance
      const midToneBoost = 1 - Math.abs(light - 0.5) * 0.6;
      const score = bucket.count * (1 + sat * 1.8) * Math.max(0.4, midToneBoost);
      return { key, avg, sat, light, count: bucket.count, score };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count || a.key - b.key);

  const primaryCandidate = scored[0]?.avg ?? hexToRgb(FALLBACK_PALETTE.primary);
  const secondaryCandidate = scored.find(
    (entry) => colorDistance(entry.avg, primaryCandidate) >= 65,
  );

  let accentRgb: Rgb;
  if (secondaryCandidate) {
    accentRgb = secondaryCandidate.avg;
  } else {
    const [h, s, l] = rgbToHsl(primaryCandidate);
    const nextHue = (h + 42) % 360;
    const nextSat = Math.max(0.65, Math.min(0.9, s + 0.2));
    const nextLight = l > 0.55 ? Math.max(0.38, l - 0.18) : Math.min(0.62, l + 0.2);
    accentRgb = hslToRgb([nextHue, nextSat, nextLight]);
  }

  const backgroundRgb = mixRgb(primaryCandidate, [255, 253, 249], 0.93);
  const surfaceRgb = mixRgb(primaryCandidate, [245, 239, 230], 0.85);
  let textRgb = mixRgb(primaryCandidate, [24, 24, 27], 0.86);

  const background = rgbToHex(backgroundRgb);
  const surface = rgbToHex(surfaceRgb);
  let text = rgbToHex(textRgb);

  if (contrastRatio(text, background) < 4.5 || contrastRatio(text, surface) < 4.5) {
    textRgb = [24, 24, 27];
    text = rgbToHex(textRgb);
  }

  return {
    primary: rgbToHex(primaryCandidate),
    accent: rgbToHex(accentRgb),
    background,
    surface,
    text,
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for palette extraction'));
    img.src = src;
  });
}

/**
 * Extracts a 5-color Brand Kit palette from an image URL, `HTMLImageElement`, or pixel buffer.
 */
export async function extractPaletteFromImage(
  imageSource: string | HTMLImageElement | PixelBufferInput,
): Promise<ExtractedBrandPalette> {
  if (typeof imageSource === 'object' && 'data' in imageSource) {
    return extractPaletteFromPixels(imageSource.data);
  }

  if (typeof document === 'undefined') {
    return { ...FALLBACK_PALETTE };
  }

  const img = typeof imageSource === 'string' ? await loadImageElement(imageSource) : imageSource;

  const sampleSize = 64;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ...FALLBACK_PALETTE };
  }

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  return extractPaletteFromPixels(imageData.data);
}
