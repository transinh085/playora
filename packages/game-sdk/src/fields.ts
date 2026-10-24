import { z } from 'zod';
import type {
  AssetFieldOptions,
  BaseFieldOptions,
  BooleanFieldOptions,
  ChoiceFieldOptions,
  ColorFieldOptions,
  DescribeConfigOptions,
  FieldDescriptor,
  FieldMeta,
  FieldOption,
  FieldValueType,
  FieldWidget,
  FormDescriptor,
  ListFieldOptions,
  Locale,
  LocalizedFieldOptions,
  LocalizedText,
  LocalizedTextSchema,
  NumberFieldOptions,
  SliderFieldOptions,
  TextFieldOptions,
} from './types';

export type {
  DescribeConfigOptions,
  FieldDescriptor,
  FieldMeta,
  FieldOption,
  FieldValueType,
  FieldWidget,
  FormDescriptor,
};

/** Typed Zod 4 registry for game config field UI metadata. */
export const fieldRegistry = z.registry<FieldMeta>();

export function toLocalizedText(value: LocalizedText | string): LocalizedText;
export function toLocalizedText(
  value: LocalizedText | string | undefined,
): LocalizedText | undefined;
export function toLocalizedText(
  value: LocalizedText | string | undefined,
): LocalizedText | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? { vi: value } : value;
}

export function resolveLocalizedText(
  value: LocalizedText | string | undefined,
  locale: Locale = 'vi',
): string {
  if (!value) return '';
  return typeof value === 'string' ? value : (value[locale] ?? value.vi);
}

function attachMeta<S extends z.ZodType>(schema: S, meta: FieldMeta): S {
  const clean: FieldMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined) clean[k] = v;
  }
  fieldRegistry.add(schema, clean);
  return schema;
}

type WithDefault<S extends z.ZodType, O> = O extends { default: NonNullable<z.output<S>> }
  ? z.ZodDefault<S>
  : S;

function baseMeta(opts?: BaseFieldOptions, widget?: FieldWidget): FieldMeta {
  return {
    widget,
    label: toLocalizedText(opts?.label),
    description: toLocalizedText(opts?.description),
    group: opts?.group,
    hotEditable: opts?.hotEditable,
  };
}

function withOptionalDefault<S extends z.ZodType, O extends { default?: unknown } | undefined>(
  schema: S,
  meta: FieldMeta,
  opts?: O,
): WithDefault<S, O> {
  const tagged = attachMeta(schema, meta);
  const def = opts?.default;
  return (
    def !== undefined ? attachMeta(tagged.default(def as never), meta) : tagged
  ) as WithDefault<S, O>;
}

function buildNumber<O extends NumberFieldOptions | undefined>(
  widget: 'slider' | 'number',
  opts?: O,
) {
  let s = z.number();
  if (opts?.int) s = s.int();
  if (opts?.min !== undefined) s = s.min(opts.min);
  if (opts?.max !== undefined) s = s.max(opts.max);
  if (opts?.step !== undefined) s = s.multipleOf(opts.step);
  return withOptionalDefault(s, { ...baseMeta(opts, widget), step: opts?.step }, opts);
}

function buildText<O extends TextFieldOptions | undefined>(widget: 'text' | 'richtext', opts?: O) {
  let s = z.string();
  if (opts?.minLength !== undefined) s = s.min(opts.minLength);
  if (opts?.maxLength !== undefined) s = s.max(opts.maxLength);
  const meta = { ...baseMeta(opts, widget), placeholder: toLocalizedText(opts?.placeholder) };
  return withOptionalDefault(s, meta, opts);
}

function buildChoice<
  const T extends readonly [string, ...string[]],
  O extends ChoiceFieldOptions<T[number]> | undefined,
>(defaultWidget: 'segmented' | 'select', values: T, opts?: O) {
  const meta: FieldMeta = {
    ...baseMeta(opts, opts?.widget ?? defaultWidget),
    optionLabels: opts?.optionLabels as Record<string, LocalizedText | string> | undefined,
    presets: opts?.presets as Record<string, Record<string, unknown>> | undefined,
  };
  return withOptionalDefault(z.enum(values), meta, opts);
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const field = {
  slider: <O extends SliderFieldOptions | undefined = undefined>(opts?: O) =>
    buildNumber('slider', opts),
  number: <O extends NumberFieldOptions | undefined = undefined>(opts?: O) =>
    buildNumber('number', opts),
  text: <O extends TextFieldOptions | undefined = undefined>(opts?: O) => buildText('text', opts),
  /**
   * @deprecated Rich text is no longer rendered by `AutoForm` (§2.5); use platform content screens or a custom widget in `TemplateSurfaces.editorWidgets`.
   */
  richtext: <O extends TextFieldOptions | undefined = undefined>(opts?: O) =>
    buildText('richtext', opts),
  boolean: <O extends BooleanFieldOptions | undefined = undefined>(opts?: O) =>
    withOptionalDefault(z.boolean(), baseMeta(opts, 'switch'), opts),
  segmented: <
    const T extends readonly [string, ...string[]],
    O extends ChoiceFieldOptions<T[number]> | undefined = undefined,
  >(
    values: T,
    opts?: O,
  ) => buildChoice('segmented', values, opts),
  select: <
    const T extends readonly [string, ...string[]],
    O extends ChoiceFieldOptions<T[number]> | undefined = undefined,
  >(
    values: T,
    opts?: O,
  ) => buildChoice('select', values, opts),
  color: <O extends ColorFieldOptions | undefined = undefined>(opts?: O) =>
    withOptionalDefault(
      z.string().regex(HEX_COLOR_REGEX, 'Expected hex color (#RGB or #RRGGBB)'),
      baseMeta(opts, 'color'),
      opts,
    ),
  asset: <O extends AssetFieldOptions | undefined = undefined>(slotKey: string, opts?: O) =>
    withOptionalDefault(z.string().min(1), { ...baseMeta(opts, 'asset'), slotKey }, opts),
  sound: <O extends AssetFieldOptions | undefined = undefined>(slotKey: string, opts?: O) =>
    withOptionalDefault(z.string().min(1), { ...baseMeta(opts, 'sound'), slotKey }, opts),
  list: <Item extends z.ZodType>(itemSchema: Item, opts?: ListFieldOptions): z.ZodArray<Item> => {
    let arr = z.array(itemSchema);
    if (opts?.min !== undefined) arr = arr.min(opts.min);
    if (opts?.max !== undefined) arr = arr.max(opts.max);
    return attachMeta(arr, {
      ...baseMeta(opts, 'list'),
      itemLabel: toLocalizedText(opts?.itemLabel),
    });
  },
  localized: <O extends LocalizedFieldOptions | undefined = undefined>(opts?: O) => {
    let vi = z.string().min(opts?.minLength ?? 1);
    let en = z.string();
    if (opts?.maxLength !== undefined) {
      vi = vi.max(opts.maxLength);
      en = en.max(opts.maxLength);
    }
    const schema: LocalizedTextSchema = z.object({ vi, en: en.optional() });
    const meta = {
      ...baseMeta(opts, 'localized'),
      placeholder: toLocalizedText(opts?.placeholder),
    };
    return withOptionalDefault(schema, meta, opts);
  },
  /**
   * @deprecated Prize assignment is handled by the platform Prizes panel (§2.5), not `AutoForm`.
   */
  prizePicker: <O extends TextFieldOptions | undefined = undefined>(opts?: O) =>
    withOptionalDefault(z.string().min(1), baseMeta(opts, 'prize-picker'), opts),
} as const;

interface JsonSchemaNode extends FieldMeta {
  type?: string | string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  minItems?: number;
  maxItems?: number;
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
}

export function toConfigJsonSchema(schema: z.ZodType): JsonSchemaNode {
  const opts = {
    metadata: fieldRegistry,
    reused: 'inline' as const,
    unrepresentable: 'any' as const,
  };
  return z.toJSONSchema(schema, opts) as unknown as JsonSchemaNode;
}

function isLocalizedJsonNode(node: JsonSchemaNode): boolean {
  if (node.widget === 'localized') return true;
  const keys = node.properties ? Object.keys(node.properties) : [];
  return keys.length > 0 && keys.includes('vi') && keys.every((k) => k === 'vi' || k === 'en');
}

function isPathMatchedByHotEditable(path: string, hotSet: ReadonlySet<string>): boolean {
  if (!path) return false;
  if (hotSet.has(path) || hotSet.has('*')) return true;
  const parts = path.split('.');
  for (let i = 1; i <= parts.length; i++) {
    const prefix = parts.slice(0, i).join('.');
    if (hotSet.has(prefix) || hotSet.has(`${prefix}.*`)) return true;
  }
  return false;
}

function describeJsonNode(
  node: JsonSchemaNode,
  key: string,
  path: string,
  isRequired: boolean,
  hotSet: ReadonlySet<string>,
  inheritedGroup?: string,
  inheritedHot = false,
): FieldDescriptor {
  const rawType = Array.isArray(node.type) ? node.type.find((t) => t !== 'null') : node.type;
  const nullable = Array.isArray(node.type) && node.type.includes('null');
  const group = (node.group as string | undefined) ?? inheritedGroup;
  const hotEditable =
    Boolean(node.hotEditable) || inheritedHot || isPathMatchedByHotEditable(path, hotSet);

  const d: FieldDescriptor = {
    path,
    key,
    type: 'string',
    widget: 'text',
    required: isRequired && !nullable,
    hotEditable,
  };

  if (node.label !== undefined) d.label = toLocalizedText(node.label);
  if (node.description !== undefined) d.description = toLocalizedText(node.description);
  if (node.placeholder !== undefined) d.placeholder = toLocalizedText(node.placeholder);
  if (group !== undefined) d.group = group;
  if (node.default !== undefined) d.defaultValue = structuredClone(node.default);

  if (Array.isArray(node.enum)) {
    d.type = 'enum';
    d.widget = node.widget ?? 'segmented';
    d.options = node.enum.map((val) => {
      const s = String(val);
      const lbl = node.optionLabels?.[s];
      return lbl !== undefined ? { value: s, label: toLocalizedText(lbl) } : { value: s };
    });
    if (node.presets) d.presets = structuredClone(node.presets);
  } else if (rawType === 'number' || rawType === 'integer') {
    d.type = 'number';
    d.widget = node.widget ?? 'number';
    if (typeof node.minimum === 'number') d.min = node.minimum;
    if (typeof node.maximum === 'number') d.max = node.maximum;
    if (rawType === 'integer') d.integer = true;
    const step = typeof node.step === 'number' ? node.step : node.multipleOf;
    if (typeof step === 'number') d.step = step;
  } else if (rawType === 'boolean') {
    d.type = 'boolean';
    d.widget = node.widget ?? 'switch';
  } else if (rawType === 'array') {
    d.type = 'array';
    d.widget = node.widget ?? 'list';
    if (typeof node.minItems === 'number') d.minItems = node.minItems;
    if (typeof node.maxItems === 'number') d.maxItems = node.maxItems;
    if (node.itemLabel !== undefined) d.itemLabel = toLocalizedText(node.itemLabel);
    if (node.items) {
      const itemPath = path ? `${path}[]` : '[]';
      d.item = describeJsonNode(node.items, 'item', itemPath, true, hotSet, group, hotEditable);
    }
  } else if (rawType === 'object') {
    if (isLocalizedJsonNode(node)) {
      d.type = 'localized';
      d.widget = 'localized';
      const viProp = node.properties?.vi;
      if (typeof viProp?.minLength === 'number') d.minLength = viProp.minLength;
      if (typeof viProp?.maxLength === 'number') d.maxLength = viProp.maxLength;
    } else {
      d.type = 'object';
      d.widget = node.widget ?? 'object';
      const reqSet = new Set(node.required ?? []);
      d.fields = Object.entries(node.properties ?? {}).map(([k, child]) => {
        const childPath = path ? `${path}.${k}` : k;
        return describeJsonNode(child, k, childPath, reqSet.has(k), hotSet, group, hotEditable);
      });
    }
  } else {
    if (node.widget) d.widget = node.widget;
    if (typeof node.minLength === 'number') d.minLength = node.minLength;
    if (typeof node.maxLength === 'number') d.maxLength = node.maxLength;
    if (typeof node.pattern === 'string') d.pattern = node.pattern;
    if (typeof node.slotKey === 'string') d.slotKey = node.slotKey;
  }

  return d;
}

export function describeConfigSchema(
  schema: z.ZodType,
  options?: DescribeConfigOptions,
): FormDescriptor {
  const root = toConfigJsonSchema(schema);
  if (root.type !== 'object' || !root.properties) {
    throw new TypeError('configSchema must be a ZodObject');
  }
  const hotSet = new Set(options?.hotEditable ?? []);
  const reqSet = new Set(root.required ?? []);
  const rootGroup = root.group as string | undefined;
  const rootHot = Boolean(root.hotEditable);
  const fields = Object.entries(root.properties).map(([key, prop]) =>
    describeJsonNode(prop, key, key, reqSet.has(key), hotSet, rootGroup, rootHot),
  );

  const groups = new Set<string>();
  const hotPaths = new Set<string>();
  const walk = (list: readonly FieldDescriptor[]) => {
    for (const f of list) {
      if (f.group) groups.add(f.group);
      if (f.type === 'object' && f.fields) walk(f.fields);
      else if (f.hotEditable && f.path) hotPaths.add(f.path);
    }
  };
  walk(fields);
  return { fields, groups: [...groups], hotEditablePaths: [...hotPaths] };
}

export function schemaHasPath(schema: z.ZodType, path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const segments = trimmed.split('.');
  let current = toConfigJsonSchema(schema);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || current.type !== 'object' || !current.properties) return false;
    if (seg === '*') return i === segments.length - 1 && Object.keys(current.properties).length > 0;
    const next = current.properties[seg];
    if (!next) return false;
    current = next;
  }
  return true;
}

export function collectReferencedSlotKeys(
  schema: z.ZodType,
): Array<{ path: string; slotKey: string }> {
  const results: Array<{ path: string; slotKey: string }> = [];
  const visit = (node: JsonSchemaNode, path: string) => {
    if (typeof node.slotKey === 'string' && node.slotKey.length > 0) {
      results.push({ path, slotKey: node.slotKey });
    }
    if (node.type === 'object' && node.properties && !isLocalizedJsonNode(node)) {
      for (const [k, child] of Object.entries(node.properties)) {
        visit(child, path ? `${path}.${k}` : k);
      }
    } else if (node.type === 'array' && node.items) {
      visit(node.items, path ? `${path}[]` : '[]');
    }
  };
  visit(toConfigJsonSchema(schema), '');
  return results;
}
