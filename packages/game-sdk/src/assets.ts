import type { z } from 'zod';
import type { TemplateDefinition } from './define';
import type { AssetResolver, BrandKit } from './types';

export interface ResolveAssetsOptions {
  /** Selected skin key (defaults to the first skin in `template.skins`). */
  skinKey?: string;
  /** Customer brand kit (maps `brand.logoUrl` into image slots marked `brandable: true`). */
  brand?: BrandKit;
  /** Per-slot URL overrides configured by the organizer. */
  overrides?: Record<string, string | undefined>;
}

/**
 * Resolves asset URLs according to the precedence hierarchy in `docs/12-builder-spec.md` §5:
 * `skin` → `brand kit` (for `brandable: true` image slots) → `overrides`.
 */
export function resolveTemplateAssets<Schema extends z.ZodType>(
  template: Pick<TemplateDefinition<Schema>, 'assetSlots' | 'skins'>,
  options?: ResolveAssetsOptions,
): AssetResolver {
  const activeSkin = options?.skinKey
    ? (template.skins.find((s) => s.key === options.skinKey) ?? template.skins[0])
    : template.skins[0];

  const resolved: Record<string, string> = {
    ...(activeSkin?.assets ?? {}),
  };

  if (options?.brand?.logoUrl) {
    for (const slot of template.assetSlots) {
      if (slot.brandable && slot.accept.includes('image')) {
        resolved[slot.key] = options.brand.logoUrl;
      }
    }
  }

  if (options?.overrides) {
    for (const [slotKey, url] of Object.entries(options.overrides)) {
      if (typeof url === 'string' && url.length > 0) {
        resolved[slotKey] = url;
      }
    }
  }

  const frozen = Object.freeze({ ...resolved });

  return {
    all: frozen,
    url(slotKey: string, opts?: { width?: number }): string | undefined {
      const base = frozen[slotKey];
      if (!base) return undefined;
      if (opts?.width && opts.width > 0) {
        const separator = base.includes('?') ? '&' : '?';
        return `${base}${separator}w=${opts.width}`;
      }
      return base;
    },
  };
}

/**
 * Merges `template.defaultConfig` with the selected skin's config defaults and organizer overrides,
 * then parses the result through `template.configSchema`.
 */
export function resolveSkinConfig<Schema extends z.ZodType>(
  template: Pick<TemplateDefinition<Schema>, 'configSchema' | 'defaultConfig' | 'skins'>,
  skinKey?: string,
  overrides?: Partial<z.infer<Schema>>,
): z.infer<Schema> {
  const activeSkin = skinKey ? template.skins.find((s) => s.key === skinKey) : template.skins[0];

  const merged = {
    ...(typeof template.defaultConfig === 'object' && template.defaultConfig !== null
      ? template.defaultConfig
      : {}),
    ...(activeSkin?.config ?? {}),
    ...(overrides ?? {}),
  };

  return template.configSchema.parse(merged);
}
