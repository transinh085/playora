import { z } from 'zod';
import { defineRoute } from './route';

export const LocalizedText = z.object({
  vi: z.string(),
  en: z.string().optional(),
});
export type LocalizedText = z.infer<typeof LocalizedText>;

export const GameKind = z.enum(['instant', 'skill']);
export type GameKind = z.infer<typeof GameKind>;

export const AssetMediaType = z.enum(['image', 'audio', 'video']);
export type AssetMediaType = z.infer<typeof AssetMediaType>;

export const TemplateAssetSlot = z.object({
  key: z.string(),
  label: LocalizedText,
  required: z.boolean().optional(),
  ratio: z.string().optional(),
  minPx: z.number().optional(),
  transparent: z.boolean().optional(),
  brandable: z.boolean().optional(),
  accept: z.array(AssetMediaType),
});
export type TemplateAssetSlot = z.infer<typeof TemplateAssetSlot>;

export const TemplateSkinSummary = z.object({
  key: z.string(),
  name: LocalizedText,
  tags: z.array(z.string()),
});
export type TemplateSkinSummary = z.infer<typeof TemplateSkinSummary>;

export const FieldWidget = z.enum([
  'text',
  'richtext',
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
  'prize-picker',
  'datetime-range',
  'object',
]);
export type FieldWidget = z.infer<typeof FieldWidget>;

export const FieldValueType = z.enum([
  'string',
  'number',
  'boolean',
  'enum',
  'array',
  'object',
  'localized',
]);
export type FieldValueType = z.infer<typeof FieldValueType>;

export const FieldOption = z.object({
  value: z.string(),
  label: LocalizedText.optional(),
});
export type FieldOption = z.infer<typeof FieldOption>;

const BaseFieldDescriptor = z.object({
  path: z.string(),
  key: z.string(),
  type: FieldValueType,
  widget: FieldWidget,
  label: LocalizedText.optional(),
  description: LocalizedText.optional(),
  placeholder: LocalizedText.optional(),
  group: z.string().optional(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  hotEditable: z.boolean(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  integer: z.boolean().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(FieldOption).optional(),
  presets: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  slotKey: z.string().optional(),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  itemLabel: LocalizedText.optional(),
});

export type FieldDescriptor = z.infer<typeof BaseFieldDescriptor> & {
  item?: FieldDescriptor;
  fields?: FieldDescriptor[];
};

export const FieldDescriptor: z.ZodType<FieldDescriptor> = BaseFieldDescriptor.extend({
  item: z.lazy(() => FieldDescriptor).optional(),
  fields: z.array(z.lazy(() => FieldDescriptor)).optional(),
});

export const FormDescriptor = z.object({
  fields: z.array(FieldDescriptor),
  groups: z.array(z.string()),
  hotEditablePaths: z.array(z.string()),
});
export type FormDescriptor = z.infer<typeof FormDescriptor>;

export const TemplateSummary = z.object({
  id: z.string(),
  version: z.string(),
  kind: GameKind,
  name: LocalizedText,
  description: LocalizedText,
  thumbnail: z.string().optional(),
  tags: z.array(z.string()),
  assetSlots: z.array(TemplateAssetSlot),
  skins: z.array(TemplateSkinSummary),
  formDescriptor: FormDescriptor,
  defaultConfig: z.record(z.string(), z.unknown()),
});
export type TemplateSummary = z.infer<typeof TemplateSummary>;

export const templatesApi = {
  list: defineRoute({
    method: 'GET',
    path: '/templates',
    summary: 'List available game templates',
    tags: ['templates'],
    auth: 'session',
    response: z.object({ items: z.array(TemplateSummary) }),
  }),
};
