import type { AutoFormProps, FieldDescriptor, Locale, LocalizedText } from './types';

export const SUPPORTED_WIDGETS = new Set<string>([
  'text',
  'number',
  'slider',
  'switch',
  'segmented',
  'select',
  'color',
  'asset',
  'sound',
  'list',
  'localized',
  'object',
]);

export function resolveLocalized(
  value: LocalizedText | string | undefined,
  locale: Locale = 'vi',
  fallback = '',
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value[locale] ?? value.vi ?? fallback;
}

export function groupLabelFor(group: string, locale: Locale = 'vi'): string {
  switch (group) {
    case 'gameplay':
      return locale === 'en' ? 'Gameplay' : 'Lối chơi';
    case 'appearance':
      return locale === 'en' ? 'Appearance' : 'Giao diện';
    case 'content':
      return locale === 'en' ? 'Content' : 'Nội dung';
    default:
      return group;
  }
}

export function getValueAtPath(source: unknown, path: string): unknown {
  if (!path) return source;
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    if (Array.isArray(current)) {
      const idx = Number.parseInt(part, 10);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

export function setValueAtPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const clone = structuredClone(source ?? {});
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return clone;

  let current: Record<string, unknown> | unknown[] = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i] as string;
    const nextKey = parts[i + 1] as string;
    const nextIsIndex = /^\d+$/.test(nextKey);

    if (Array.isArray(current)) {
      const idx = Number.parseInt(key, 10);
      const existing = current[idx];
      if (existing === null || typeof existing !== 'object') {
        current[idx] = nextIsIndex ? [] : {};
      }
      current = current[idx] as Record<string, unknown> | unknown[];
    } else {
      const existing = current[key];
      if (existing === null || typeof existing !== 'object') {
        current[key] = nextIsIndex ? [] : {};
      }
      current = current[key] as Record<string, unknown> | unknown[];
    }
  }

  const lastKey = parts.at(-1) as string;
  if (Array.isArray(current)) {
    const idx = Number.parseInt(lastKey, 10);
    if (!Number.isNaN(idx)) {
      current[idx] = value;
    }
  } else {
    current[lastKey] = value;
  }

  return clone;
}

export function createDefaultValueForField(field?: FieldDescriptor): unknown {
  if (!field) return '';
  if (field.defaultValue !== undefined) {
    return structuredClone(field.defaultValue);
  }
  switch (field.type) {
    case 'number':
      return field.min ?? 0;
    case 'boolean':
      return false;
    case 'enum':
      return field.options?.[0]?.value ?? '';
    case 'localized':
      return { vi: '', en: '' };
    case 'array':
      return [];
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const child of field.fields ?? []) {
        obj[child.key] = createDefaultValueForField(child);
      }
      return obj;
    }
    default:
      return field.widget === 'color' ? '#000000' : '';
  }
}

export function withFieldDefaults(
  fields: readonly FieldDescriptor[],
  source: Record<string, unknown>,
): Record<string, unknown> {
  let result = structuredClone(source ?? {});
  const applyFields = (list: readonly FieldDescriptor[]) => {
    for (const field of list) {
      if (field.type === 'object' && field.fields) {
        applyFields(field.fields);
        continue;
      }
      const existing = getValueAtPath(result, field.path);
      if (existing === undefined && field.defaultValue !== undefined) {
        result = setValueAtPath(result, field.path, structuredClone(field.defaultValue));
      }
    }
  };
  applyFields(fields);
  return result;
}

export function isFieldHotEditable(
  field: FieldDescriptor,
  path: string,
  hotEditablePaths: readonly string[] = [],
): boolean {
  if (field.hotEditable) return true;
  if (!path) return false;
  for (const hp of hotEditablePaths) {
    if (hp === '*' || hp === path) return true;
    if (hp.endsWith('.*') && path.startsWith(hp.slice(0, -1))) return true;
    if (path.startsWith(`${hp}.`)) return true;
  }
  return false;
}

export function findFieldByPath(
  fields: readonly FieldDescriptor[],
  path: string,
): FieldDescriptor | undefined {
  const normalized = path.replace(/\.\d+(?=\.|$)/g, '[]');
  const walk = (list: readonly FieldDescriptor[]): FieldDescriptor | undefined => {
    for (const f of list) {
      if (f.path === path || f.path === normalized) return f;
      if (f.fields) {
        const found = walk(f.fields);
        if (found) return found;
      }
      if (f.item) {
        if (f.item.path === normalized) return f.item;
        if (f.item.fields) {
          const found = walk(f.item.fields);
          if (found) return found;
        }
      }
    }
    return undefined;
  };
  return walk(fields);
}

export function extractChangedPath(changedValues: unknown, prefix = ''): string | undefined {
  if (!changedValues || typeof changedValues !== 'object') return prefix || undefined;
  if (Array.isArray(changedValues)) {
    for (let i = 0; i < changedValues.length; i++) {
      if (changedValues[i] !== undefined) {
        const nextPrefix = prefix ? `${prefix}.${i}` : String(i);
        if (
          typeof changedValues[i] === 'object' &&
          changedValues[i] !== null &&
          !Array.isArray(changedValues[i])
        ) {
          return extractChangedPath(changedValues[i], nextPrefix) ?? nextPrefix;
        }
        return nextPrefix;
      }
    }
    return prefix || undefined;
  }
  const keys = Object.keys(changedValues as Record<string, unknown>);
  if (keys.length === 0) return prefix || undefined;
  const firstKey = keys[0] as string;
  const nextPrefix = prefix ? `${prefix}.${firstKey}` : firstKey;
  const child = (changedValues as Record<string, unknown>)[firstKey];
  if (child && typeof child === 'object') {
    return extractChangedPath(child, nextPrefix);
  }
  return nextPrefix;
}

export function addListItem(
  items: readonly unknown[],
  itemDescriptor?: FieldDescriptor,
  maxItems?: number,
): unknown[] {
  if (maxItems !== undefined && items.length >= maxItems) {
    return [...items];
  }
  return [...items, createDefaultValueForField(itemDescriptor)];
}

export function removeListItem(
  items: readonly unknown[],
  index: number,
  minItems?: number,
): unknown[] {
  if (minItems !== undefined && items.length <= minItems) {
    return [...items];
  }
  return items.filter((_, idx) => idx !== index);
}

export function reorderListItem(
  items: readonly unknown[],
  fromIndex: number,
  toIndex: number,
): unknown[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function resolveFieldError(
  errors: AutoFormProps['errors'],
  path: string,
): string | undefined {
  if (!errors || !path) return undefined;
  const candidates = [path, `draftConfig.${path}`, `${path}.vi`, `${path}.en`];
  for (const key of candidates) {
    const entry = errors[key];
    if (!entry) continue;
    if (typeof entry === 'string' && entry.length > 0) return entry;
    if (Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].length > 0) {
      return entry[0];
    }
  }
  return undefined;
}
