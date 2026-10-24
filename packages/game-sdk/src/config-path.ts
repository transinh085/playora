import type { z } from 'zod';
import type { AssetMediaType, AssetSlot, FieldDescriptor } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item === undefined ? null : item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${entries.join(',')}}`;
}

export function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const part of path.split('.').filter(Boolean)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return;
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!key) continue;
    const next = cur[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  const last = parts.at(-1);
  if (last) {
    cur[last] = value;
  }
}

export interface AssetFieldOccurrence {
  path: string;
  slotKey?: string;
  widget: string;
  value: string;
}

export function collectAssetOccurrences(
  fields: readonly FieldDescriptor[],
  config: unknown,
  prefix = '',
): AssetFieldOccurrence[] {
  if (config === null || typeof config !== 'object') return [];
  const obj = config as Record<string, unknown>;
  const out: AssetFieldOccurrence[] = [];

  for (const field of fields) {
    const val = obj[field.key];
    const currentPath = prefix ? `${prefix}.${field.key}` : field.key;

    if (field.widget === 'asset' || field.widget === 'sound' || field.slotKey) {
      if (typeof val === 'string' && val.trim().length > 0) {
        out.push({
          path: currentPath,
          slotKey: field.slotKey,
          widget: field.widget,
          value: val.trim(),
        });
      }
    } else if (field.type === 'object' && field.fields && val && typeof val === 'object') {
      out.push(...collectAssetOccurrences(field.fields, val, currentPath));
    } else if (field.type === 'array' && field.item && Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const itemVal = val[i];
        const itemPath = `${currentPath}.${i}`;
        if (field.item.widget === 'asset' || field.item.widget === 'sound' || field.item.slotKey) {
          if (typeof itemVal === 'string' && itemVal.trim().length > 0) {
            out.push({
              path: itemPath,
              slotKey: field.item.slotKey,
              widget: field.item.widget,
              value: itemVal.trim(),
            });
          }
        } else if (field.item.type === 'object' && field.item.fields) {
          out.push(...collectAssetOccurrences(field.item.fields, itemVal, itemPath));
        }
      }
    }
  }

  return out;
}

export function collectBuiltInAssetStrings(template: {
  formDescriptor: { fields: readonly FieldDescriptor[] };
  skins: ReadonlyArray<{ assets?: Record<string, string> }>;
}): Set<string> {
  const allowed = new Set<string>();
  const addFromFields = (fields: readonly FieldDescriptor[]) => {
    for (const f of fields) {
      if (
        (f.widget === 'asset' || f.widget === 'sound' || f.slotKey) &&
        typeof f.defaultValue === 'string'
      ) {
        allowed.add(f.defaultValue);
      }
      if (f.fields) addFromFields(f.fields);
      if (f.item) addFromFields([f.item]);
    }
  };
  addFromFields(template.formDescriptor.fields);
  for (const skin of template.skins) {
    for (const url of Object.values(skin.assets ?? {})) {
      if (typeof url === 'string') allowed.add(url);
    }
  }
  return allowed;
}

export function isBuiltInAssetPath(value: string, builtIns: ReadonlySet<string>): boolean {
  if (builtIns.has(value)) return true;
  return (
    value.startsWith('/assets/') || value.startsWith('/skins/') || value.startsWith('/templates/')
  );
}

export function extractConfigAssetIds(
  fields: readonly FieldDescriptor[],
  config: unknown,
): string[] {
  const occurrences = collectAssetOccurrences(fields, config);
  const ids = new Set<string>();
  for (const occ of occurrences) {
    if (UUID_REGEX.test(occ.value)) {
      ids.add(occ.value);
    }
  }
  return [...ids];
}

export function pickAssetUrls(
  assetIds: readonly string[],
  allResolved: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of assetIds) {
    const url = allResolved[id];
    if (url) out[id] = url;
  }
  return out;
}

export interface ExternalAssetReference {
  path: string;
  assetId: string;
  expectedAccept: readonly AssetMediaType[];
}

export type ValidateTemplateConfigResult =
  | {
      ok: true;
      config: Record<string, unknown>;
      externalAssets: ExternalAssetReference[];
    }
  | {
      ok: false;
      message: string;
      fieldErrors: Record<string, string[]>;
    };

export function validateTemplateConfig(
  template: {
    configSchema: z.ZodType;
    formDescriptor: { fields: readonly FieldDescriptor[] };
    assetSlots: readonly AssetSlot[];
    skins: ReadonlyArray<{ assets?: Record<string, string> }>;
  },
  rawConfig: unknown,
): ValidateTemplateConfigResult {
  const parsed = template.configSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const dotPath = issue.path.map(String).join('.') || '_root';
      fieldErrors[dotPath] ??= [];
      fieldErrors[dotPath].push(issue.message);
    }
    return { ok: false, message: 'Invalid game configuration', fieldErrors };
  }

  const config = parsed.data as Record<string, unknown>;
  const builtIns = collectBuiltInAssetStrings(template);
  const occurrences = collectAssetOccurrences(template.formDescriptor.fields, config);
  const slotMap = new Map(template.assetSlots.map((s) => [s.key, s]));

  const fieldErrors: Record<string, string[]> = {};
  const externalAssets: ExternalAssetReference[] = [];

  for (const occ of occurrences) {
    if (isBuiltInAssetPath(occ.value, builtIns)) continue;
    if (!UUID_REGEX.test(occ.value)) {
      fieldErrors[occ.path] = ['Mã tài nguyên phải là UUID hợp lệ (không lưu URL trực tiếp)'];
      continue;
    }
    const slot = occ.slotKey ? slotMap.get(occ.slotKey) : undefined;
    const expectedAccept =
      slot?.accept ?? (occ.widget === 'sound' ? (['audio'] as const) : (['image'] as const));
    externalAssets.push({ path: occ.path, assetId: occ.value, expectedAccept });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Invalid asset reference in game config', fieldErrors };
  }

  return { ok: true, config, externalAssets };
}
