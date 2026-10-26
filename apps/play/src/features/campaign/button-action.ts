import type { ButtonElement } from '@playora/ui/campaign';

/**
 * Where a canvas `link` / `phone` / `zalo` button goes, or null when its target is missing or
 * unsafe. Links only open http(s); a bare domain gets `https://`.
 */
export function buttonActionHref(
  element: Pick<ButtonElement, 'action' | 'actionTarget'>,
): string | null {
  const target = element.actionTarget?.trim();
  if (!target) return null;
  switch (element.action) {
    case 'link': {
      const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(target) ? target : `https://${target}`;
      try {
        const url = new URL(withScheme);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
      } catch {
        return null;
      }
    }
    case 'phone': {
      const number = target.replace(/[^\d+]/g, '');
      return number ? `tel:${number}` : null;
    }
    case 'zalo': {
      const id = target.replace(/^https?:\/\/(www\.)?zalo\.me\//i, '').replace(/[\s.-]/g, '');
      return /^[A-Za-z0-9_]+$/.test(id) ? `https://zalo.me/${id}` : null;
    }
    default:
      return null;
  }
}
