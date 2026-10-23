import type { z } from 'zod';
import type { TemplateDefinition } from './define';
import type { AssetResolver, BrandKit, FieldDescriptor } from './types';

export interface ResolveAssetsOptions {
  /** Selected skin key (defaults to the first skin in `template.skins`). */
  skinKey?: string;
  /** Customer brand kit (maps `brand.logoUrl` into image slots marked `brandable: true`). */
  brand?: BrandKit;
  /** Game configuration whose `field.asset` / `field.sound` values (asset IDs or paths) override their linked slots. */
  config?: Record<string, unknown>;
  /** Per-slot URL or asset ID overrides configured by the organizer. */
  overrides?: Record<string, string | undefined>;
  /** Map of `assetId -> url` returned by the API at render time. */
  assets?: Readonly<Record<string, string | undefined>>;
}

function getAtDotPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const part of path.split('.').filter(Boolean)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function collectConfigSlotOverrides(
  fields: readonly FieldDescriptor[],
  config: Record<string, unknown>,
  defaultConfig: unknown,
  currentResolved: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const visit = (list: readonly FieldDescriptor[]) => {
    for (const field of list) {
      if (field.slotKey) {
        const val = getAtDotPath(config, field.path);
        const defVal = field.defaultValue ?? getAtDotPath(defaultConfig, field.path);
        if (typeof val === 'string' && val.length > 0) {
          if (val !== defVal || !currentResolved[field.slotKey]) {
            out[field.slotKey] = val;
          }
        }
      } else if (field.type === 'object' && field.fields) {
        visit(field.fields);
      }
    }
  };
  visit(fields);
  return out;
}

/**
 * Resolves asset URLs according to the precedence hierarchy in `docs/12-builder-spec.md` §5:
 * `skin` → `brand kit` (for `brandable: true` image slots) → `config` / `overrides`,
 * translating any asset UUID through the render-time `assets` (`Record<assetId, url>`) map.
 */
export function resolveTemplateAssets<Schema extends z.ZodType>(
  template: Pick<TemplateDefinition<Schema>, 'assetSlots' | 'skins'> &
    Partial<Pick<TemplateDefinition<Schema>, 'formDescriptor' | 'defaultConfig'>>,
  options?: ResolveAssetsOptions,
): AssetResolver {
  const assetMap = options?.assets;
  const resolveRef = (ref: string): string => assetMap?.[ref] ?? ref;

  const activeSkin = options?.skinKey
    ? (template.skins.find((s) => s.key === options.skinKey) ?? template.skins[0])
    : template.skins[0];

  const resolved: Record<string, string> = {};
  for (const [slotKey, val] of Object.entries(activeSkin?.assets ?? {})) {
    if (typeof val === 'string' && val.length > 0) {
      resolved[slotKey] = resolveRef(val);
    }
  }

  if (options?.brand?.logoUrl) {
    const logoUrl = resolveRef(options.brand.logoUrl);
    for (const slot of template.assetSlots) {
      if (slot.brandable && slot.accept.includes('image')) {
        resolved[slot.key] = logoUrl;
      }
    }
  }

  if (options?.config && template.formDescriptor?.fields) {
    const configOverrides = collectConfigSlotOverrides(
      template.formDescriptor.fields,
      options.config,
      template.defaultConfig,
      resolved,
    );
    for (const [slotKey, ref] of Object.entries(configOverrides)) {
      resolved[slotKey] = resolveRef(ref);
    }
  }

  if (options?.overrides) {
    for (const [slotKey, ref] of Object.entries(options.overrides)) {
      if (typeof ref === 'string' && ref.length > 0) {
        resolved[slotKey] = resolveRef(ref);
      }
    }
  }

  const frozen = Object.freeze({ ...resolved });

  return {
    all: frozen,
    url(slotKey: string, opts?: { width?: number }): string | undefined {
      const raw = frozen[slotKey] ?? assetMap?.[slotKey];
      if (!raw) return undefined;
      const base = assetMap?.[raw] ?? raw;
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
