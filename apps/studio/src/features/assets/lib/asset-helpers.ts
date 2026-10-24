import type { AssetCropRect, AssetKind } from '@playora/contracts';

export type FilterKind = 'all' | AssetKind;
export type CropPreset = 'none' | '1:1' | '16:9';

export function detectKind(mime: string): AssetKind {
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'image';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function computeImageCrop(
  file: File,
  preset: CropPreset,
): Promise<AssetCropRect | undefined> {
  if (preset === 'none' || !file.type.startsWith('image/')) return undefined;
  const objectUrl = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = objectUrl;
    });
    const ratio = preset === '1:1' ? 1 : 16 / 9;
    let w = dims.width;
    let h = Math.round(w / ratio);
    if (h > dims.height) {
      h = dims.height;
      w = Math.round(h * ratio);
    }
    const x = Math.max(0, Math.floor((dims.width - w) / 2));
    const y = Math.max(0, Math.floor((dims.height - h) / 2));
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function uploadWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
