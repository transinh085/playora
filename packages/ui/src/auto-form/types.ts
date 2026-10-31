import type * as React from 'react';
import type { z } from 'zod';
import type { FormInstance } from '../form';

export type Locale = 'vi' | 'en';
export type LocalizedText = Partial<Record<Locale, string>> & { vi: string };
export type AssetMediaType = 'image' | 'audio' | 'video';

export interface AssetSlot {
  key: string;
  label: LocalizedText;
  required?: boolean;
  ratio?: string;
  minPx?: number;
  transparent?: boolean;
  brandable?: boolean;
  accept: AssetMediaType[];
}

export type SupportedFieldWidget =
  | 'text'
  | 'number'
  | 'slider'
  | 'switch'
  | 'segmented'
  | 'select'
  | 'color'
  | 'asset'
  | 'sound'
  | 'list'
  | 'localized'
  | 'object';

export type KnownFieldWidget =
  | SupportedFieldWidget
  | 'richtext'
  | 'prize-picker'
  | 'datetime-range';

export type FieldWidget = KnownFieldWidget | (string & {});

export type FieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object'
  | 'localized';

export interface FieldOption {
  value: string;
  label?: LocalizedText;
}

export interface FieldDescriptor {
  path: string;
  key: string;
  type: FieldValueType;
  widget: FieldWidget;
  label?: LocalizedText;
  description?: LocalizedText;
  placeholder?: LocalizedText;
  group?: string;
  required: boolean;
  defaultValue?: unknown;
  hotEditable: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: FieldOption[];
  presets?: Record<string, Record<string, unknown>>;
  slotKey?: string;
  minItems?: number;
  maxItems?: number;
  itemLabel?: LocalizedText;
  item?: FieldDescriptor;
  fields?: FieldDescriptor[];
}

export interface FormDescriptor {
  fields: FieldDescriptor[];
  groups: string[];
  hotEditablePaths: string[];
}

export interface AssetPickerRenderProps {
  field: FieldDescriptor;
  slot?: AssetSlot;
  value: string;
  locale: Locale;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
}

export interface WidgetProps<V = unknown> {
  field: FieldDescriptor;
  path: string;
  value: V;
  onChange: (nextValue: V) => void;
  locale: Locale;
  disabled?: boolean;
  brandPalette?: readonly string[];
  error?: string;
}

export interface EditorPanelProps<C = Record<string, unknown>> {
  value: C;
  onChange: (nextValue: C, changedPath?: string) => void;
  locale: Locale;
  disabled?: boolean;
  brandPalette?: readonly string[];
}

export interface EditorPanel<C = Record<string, unknown>> {
  key: string;
  label: LocalizedText;
  Component: React.ComponentType<EditorPanelProps<C>>;
}

export interface AutoFormProps {
  descriptor: FormDescriptor;
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>, changedPath?: string) => void;
  locale?: Locale;
  /** Optional Zod configSchema validated via `@playora/ui/form` `zodRule`. */
  configSchema?: z.ZodType;
  /** Optional Ant Design FormInstance if the host wants direct access. */
  form?: FormInstance<Record<string, unknown>>;
  /** When true, fields that are not `hotEditable` are disabled (published game hot-edit mode). */
  published?: boolean;
  /** Alias for `published`. */
  isPublished?: boolean;
  /** Optional group key to filter top-level fields. */
  activeGroup?: string;
  /** Hex colors from the event/organization Brand Kit shown as quick swatches in color fields. */
  brandPalette?: readonly string[];
  /** Template asset slot definitions for constraint hints and media filtering. */
  assetSlots?: readonly AssetSlot[];
  /** Injected asset picker renderer so `@playora/ui` stays API-agnostic. */
  renderAssetPicker?: (props: AssetPickerRenderProps) => React.ReactNode;
  /** Optional callback triggered when the built-in asset button is clicked. */
  onPickAsset?: (props: AssetPickerRenderProps) => void;
  /** Custom widget components keyed by widget name (e.g. from `TemplateSurfaces.editorWidgets`). */
  widgets?: Readonly<Record<string, React.ComponentType<WidgetProps>>>;
  /** Field-level error messages keyed by dot-path (compatible with `applyApiError`). */
  errors?: Record<string, string | readonly string[] | undefined>;
  disabled?: boolean;
  className?: string;
}
