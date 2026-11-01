'use client';

export const COUNTER_DEVICE_TOKEN_KEY = 'playora:counter-device-token';
export const COUNTER_DEVICE_META_KEY = 'playora:counter-device-meta';
export const COUNTER_DEVICE_COOKIE = 'playora_counter_device';

export interface StoredCounterDeviceMeta {
  id: string;
  organizationId: string;
  organizationName: string;
  label: string;
  storeLabel: string | null;
}

export function getCounterDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(COUNTER_DEVICE_TOKEN_KEY)?.trim();
    return token || null;
  } catch {
    return null;
  }
}

export function getCounterDeviceMeta(): StoredCounterDeviceMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COUNTER_DEVICE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCounterDeviceMeta;
  } catch {
    return null;
  }
}

export function saveCounterDeviceSession(token: string, meta: StoredCounterDeviceMeta) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COUNTER_DEVICE_TOKEN_KEY, token);
    window.localStorage.setItem(COUNTER_DEVICE_META_KEY, JSON.stringify(meta));
    // biome-ignore lint/suspicious/noDocumentCookie: sync device token cookie so Next.js proxy allows /redeem reloads without a user login
    document.cookie = `${COUNTER_DEVICE_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event('playora:counter-device-changed'));
  } catch {
    // Storage unavailable in private mode
  }
}

export function clearCounterDeviceSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(COUNTER_DEVICE_TOKEN_KEY);
    window.localStorage.removeItem(COUNTER_DEVICE_META_KEY);
    // biome-ignore lint/suspicious/noDocumentCookie: clear counter device cookie on disconnect
    document.cookie = `${COUNTER_DEVICE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    window.dispatchEvent(new Event('playora:counter-device-changed'));
  } catch {
    // Ignore
  }
}
