/**
 * Cloudflare Turnstile explicit rendering interface (docs/engineering/security.md §1.3).
 * Loaded via https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit.
 */

export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  'error-callback'?: (code?: string | number) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  tabindex?: number;
  'response-field'?: boolean;
  'response-field-name'?: string;
  size?: 'normal' | 'flexible' | 'compact';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  appearance?: 'always' | 'execute' | 'interaction-only';
}

export interface TurnstileApi {
  render(container: string | HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
  getResponse(widgetId?: string): string | undefined;
  isExpired?(widgetId?: string): boolean;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function getTurnstile(): TurnstileApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.turnstile;
}

export function isTurnstileReady(): boolean {
  return Boolean(getTurnstile()?.render);
}

export function renderTurnstile(
  container: HTMLElement | string,
  options: TurnstileRenderOptions,
): string | null {
  const api = getTurnstile();
  if (!api) return null;
  return api.render(container, options);
}

export function resetTurnstile(widgetId?: string): void {
  getTurnstile()?.reset(widgetId);
}

export function removeTurnstile(widgetId?: string): void {
  getTurnstile()?.remove(widgetId);
}

export function getTurnstileResponse(widgetId?: string): string | undefined {
  return getTurnstile()?.getResponse(widgetId);
}
