export const MAX_CHANNEL_LENGTH = 64;

export const CHANNEL_KEY_REGEX = /^[a-z0-9_-]{0,64}$/;

export interface PresetChannel {
  key: string;
  labelKey: string;
}

export const PRESET_CHANNELS = [
  { key: 'table-qr', labelKey: 'channels.tableQr' },
  { key: 'counter', labelKey: 'channels.counter' },
  { key: 'fanpage', labelKey: 'channels.fanpage' },
  { key: 'zalo', labelKey: 'channels.zalo' },
] as const;

export interface CustomChannel {
  key: string;
  label: string;
}

/**
 * Turns a raw label or key into a valid channel key (docs/product/specs/participation.md §5):
 * lower-cased, diacritics stripped (`đ/Đ` → `d`, `Bàn 1` → `ban-1`), spaces to `-`, anything else dropped.
 * Caps length at 64 characters.
 */
export function slugifyChannelKey(raw: string): string {
  if (!raw) return '';
  const key = raw
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, MAX_CHANNEL_LENGTH);

  return key;
}

/**
 * Builds the player link for a campaign and channel (EVT-11).
 * Example: `http://localhost:3002/khai-truong?ch=table-qr`
 */
export function buildPlayerLink(baseUrl: string, slug: string, channelKey?: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
  if (!channelKey) {
    return `${base}/${cleanSlug}`;
  }
  return `${base}/${cleanSlug}?ch=${encodeURIComponent(channelKey)}`;
}

const STORAGE_PREFIX = 'playora:campaign:custom-channels:';

export function loadCustomChannels(campaignId: string): CustomChannel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${campaignId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is CustomChannel =>
        typeof c === 'object' &&
        c !== null &&
        typeof c.key === 'string' &&
        typeof c.label === 'string' &&
        /^[a-z0-9_-]{1,64}$/.test(c.key),
    );
  } catch {
    return [];
  }
}

export function saveCustomChannels(campaignId: string, channels: CustomChannel[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${campaignId}`, JSON.stringify(channels));
  } catch {
    // Ignore quota or disabled localStorage
  }
}

/** Downloads a QRCode (canvas or svg) as PNG. */
export function downloadCanvasQRCode(container: HTMLElement | null, filename = 'qrcode.png') {
  if (!container) return;
  const canvas = container.querySelector('canvas');
  if (canvas) {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const svg = container.querySelector('svg');
  if (svg) {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width || 300;
      c.height = img.height || 300;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = c.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        a.href = pngUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
}

/** Downloads an SVG QRCode as SVG. */
export function downloadSvgQRCode(container: HTMLElement | null, filename = 'qrcode.svg') {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
