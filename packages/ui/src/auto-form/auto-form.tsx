'use client';

import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { Textarea } from '@playora/ui/components/textarea';
import { cn } from '@playora/ui/lib/utils';
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import type { AssetSlot, AutoFormProps, FieldDescriptor, Locale } from './types';
import {
  addListItem,
  getValueAtPath,
  removeListItem,
  reorderListItem,
  resolveFieldError,
  resolveLocalized,
  setValueAtPath,
} from './utils';

const KNOWN_WIDGETS = new Set([
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
  'object',
]);

interface FieldRendererProps {
  field: FieldDescriptor;
  path: string;
  rootValue: Record<string, unknown>;
  onChangePath: (path: string, value: unknown, presetPatch?: Record<string, unknown>) => void;
  locale: Locale;
  brandPalette?: readonly string[];
  assetSlotMap: ReadonlyMap<string, AssetSlot>;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
  errors?: AutoFormProps['errors'];
  disabled?: boolean;
}

function LocalizedFieldWidget({
  field,
  path,
  value,
  locale,
  disabled,
  onChange,
}: {
  field: FieldDescriptor;
  path: string;
  value: unknown;
  locale: Locale;
  disabled?: boolean;
  onChange: (next: { vi: string; en?: string }) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<Locale>(locale);
  const obj =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as { vi?: string; en?: string })
      : { vi: typeof value === 'string' ? value : '' };

  const viVal = obj.vi ?? '';
  const enVal = obj.en ?? '';
  const placeholder = resolveLocalized(field.placeholder, activeTab);
  const inputBaseId = `autoform-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div data-slot="localized-widget" className="grid gap-2">
      <div
        role="tablist"
        aria-label={resolveLocalized(field.label, locale, field.key)}
        className="inline-flex w-fit rounded-md border bg-muted p-0.5 text-xs"
      >
        {(['vi', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={activeTab === lang}
            data-lang={lang}
            disabled={disabled}
            onClick={() => setActiveTab(lang)}
            className={cn(
              'rounded-sm px-2.5 py-1 font-medium uppercase transition-colors',
              activeTab === lang
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {lang}
          </button>
        ))}
      </div>

      <div hidden={activeTab !== 'vi'}>
        <Input
          id={`${inputBaseId}-vi`}
          data-lang-input="vi"
          aria-label={`${resolveLocalized(field.label, locale, field.key)} (VI)`}
          value={viVal}
          maxLength={field.maxLength}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange({ ...obj, vi: e.target.value })}
        />
      </div>
      <div hidden={activeTab !== 'en'}>
        <Input
          id={`${inputBaseId}-en`}
          data-lang-input="en"
          aria-label={`${resolveLocalized(field.label, locale, field.key)} (EN)`}
          value={enVal}
          maxLength={field.maxLength}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange({ ...obj, vi: viVal, en: e.target.value })}
        />
      </div>
    </div>
  );
}

function AutoFormField({
  field,
  path,
  rootValue,
  onChangePath,
  locale,
  brandPalette,
  assetSlotMap,
  renderAssetPicker,
  onPickAsset,
  errors,
  disabled,
}: FieldRendererProps) {
  const rawValue = getValueAtPath(rootValue, path);
  const value = rawValue !== undefined ? rawValue : field.defaultValue;
  const label = resolveLocalized(field.label, locale, field.key);
  const description = resolveLocalized(field.description, locale);
  const placeholder = resolveLocalized(field.placeholder, locale);
  const errorMsg = resolveFieldError(errors, path);
  const inputId = `autoform-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  if (field.widget === 'object' || (field.type === 'object' && field.fields)) {
    return (
      <fieldset
        data-slot="autoform-object"
        data-widget="object"
        data-field-path={path}
        className="grid gap-4 rounded-lg border p-4"
      >
        <legend className="px-1 text-sm font-semibold">{label}</legend>
        {description && <p className="text-muted-foreground -mt-2 text-xs">{description}</p>}
        <div className="grid gap-4">
          {(field.fields ?? []).map((child) => {
            const childPath = path ? `${path}.${child.key}` : child.key;
            return (
              <AutoFormField
                key={childPath}
                field={child}
                path={childPath}
                rootValue={rootValue}
                onChangePath={onChangePath}
                locale={locale}
                brandPalette={brandPalette}
                assetSlotMap={assetSlotMap}
                renderAssetPicker={renderAssetPicker}
                onPickAsset={onPickAsset}
                errors={errors}
                disabled={disabled}
              />
            );
          })}
        </div>
        {errorMsg && (
          <p role="alert" data-slot="field-error" className="text-destructive text-xs">
            {errorMsg}
          </p>
        )}
      </fieldset>
    );
  }

  let control: React.ReactNode = null;

  if (!KNOWN_WIDGETS.has(field.widget)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[AutoForm] Unknown widget "${String(field.widget)}" at path "${path}", falling back to text input.`,
      );
    }
    control = (
      <Input
        id={inputId}
        type="text"
        data-widget-fallback={String(field.widget)}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!errorMsg}
        onChange={(e) => onChangePath(path, e.target.value)}
      />
    );
  } else {
    switch (field.widget) {
      case 'text':
        control = (
          <Input
            id={inputId}
            type="text"
            value={typeof value === 'string' ? value : String(value ?? '')}
            placeholder={placeholder}
            maxLength={field.maxLength}
            disabled={disabled}
            aria-invalid={!!errorMsg}
            onChange={(e) => onChangePath(path, e.target.value)}
          />
        );
        break;

      case 'richtext':
        control = (
          <Textarea
            id={inputId}
            value={typeof value === 'string' ? value : String(value ?? '')}
            placeholder={placeholder}
            maxLength={field.maxLength}
            disabled={disabled}
            aria-invalid={!!errorMsg}
            onChange={(e) => onChangePath(path, e.target.value)}
          />
        );
        break;

      case 'number': {
        const numStr = typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
        control = (
          <Input
            id={inputId}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step ?? (field.integer ? 1 : 'any')}
            value={numStr}
            disabled={disabled}
            aria-invalid={!!errorMsg}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return;
              const num = Number(raw);
              if (!Number.isNaN(num)) {
                onChangePath(path, field.integer ? Math.trunc(num) : num);
              }
            }}
          />
        );
        break;
      }

      case 'slider': {
        const numericVal =
          typeof value === 'number' && !Number.isNaN(value) ? value : (field.min ?? 0);
        control = (
          <div className="flex items-center gap-3">
            <input
              id={inputId}
              type="range"
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              value={numericVal}
              disabled={disabled}
              aria-invalid={!!errorMsg}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (!Number.isNaN(num)) {
                  onChangePath(path, field.integer ? Math.trunc(num) : num);
                }
              }}
              className="accent-primary h-2 flex-1 cursor-pointer rounded-lg"
            />
            <Input
              type="number"
              aria-label={`${label} value`}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={String(numericVal)}
              disabled={disabled}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (!Number.isNaN(num)) {
                  onChangePath(path, field.integer ? Math.trunc(num) : num);
                }
              }}
              className="h-8 w-20 text-right tabular-nums"
            />
          </div>
        );
        break;
      }

      case 'switch': {
        const checked = Boolean(value);
        control = (
          <button
            id={inputId}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChangePath(path, !checked)}
            className={cn(
              'focus-visible:ring-ring inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              checked ? 'bg-primary' : 'bg-input',
            )}
          >
            <span
              className={cn(
                'bg-background pointer-events-none block size-5 rounded-full shadow-xs transition-transform',
                checked ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        );
        break;
      }

      case 'segmented': {
        const currentStr = String(value ?? '');
        control = (
          <div
            role="radiogroup"
            aria-label={label}
            className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted p-1"
          >
            {(field.options ?? []).map((opt) => {
              const active = currentStr === opt.value;
              const optLabel = resolveLocalized(opt.label, locale, opt.value);
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'ghost'}
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => onChangePath(path, opt.value, field.presets?.[opt.value])}
                  className="h-7 px-3 text-xs"
                >
                  {optLabel}
                </Button>
              );
            })}
          </div>
        );
        break;
      }

      case 'select': {
        const currentStr = String(value ?? '');
        control = (
          <select
            id={inputId}
            value={currentStr}
            disabled={disabled}
            aria-invalid={!!errorMsg}
            onChange={(e) => onChangePath(path, e.target.value, field.presets?.[e.target.value])}
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {resolveLocalized(opt.label, locale, opt.value)}
              </option>
            ))}
          </select>
        );
        break;
      }

      case 'color': {
        const colorStr = typeof value === 'string' ? value : '#000000';
        const validHex = /^#[0-9a-fA-F]{6}$/.test(colorStr) ? colorStr : '#000000';
        control = (
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${label} picker`}
                value={validHex}
                disabled={disabled}
                onChange={(e) => onChangePath(path, e.target.value)}
                className="border-input h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
              />
              <Input
                id={inputId}
                value={colorStr}
                disabled={disabled}
                aria-invalid={!!errorMsg}
                onChange={(e) => onChangePath(path, e.target.value)}
                className="font-mono"
              />
            </div>
            {brandPalette && brandPalette.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5" data-slot="brand-palette">
                {brandPalette.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    data-slot="brand-swatch"
                    data-color={swatch}
                    aria-label={swatch}
                    disabled={disabled}
                    onClick={() => onChangePath(path, swatch)}
                    className={cn(
                      'border-border size-6 rounded-full border transition-transform hover:scale-110',
                      colorStr.toLowerCase() === swatch.toLowerCase() && 'ring-primary ring-2',
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            )}
          </div>
        );
        break;
      }

      case 'asset':
      case 'sound': {
        const strVal = typeof value === 'string' ? value : '';
        const slot = field.slotKey ? assetSlotMap.get(field.slotKey) : undefined;
        const pickerProps = {
          field,
          slot,
          value: strVal,
          locale,
          disabled,
          onChange: (nextVal: string) => onChangePath(path, nextVal),
        };

        control = (
          <div className="grid gap-2" data-slot="asset-widget">
            {slot && (slot.ratio || slot.minPx) && (
              <p className="text-muted-foreground text-xs" data-slot="asset-constraints">
                {[slot.ratio, slot.minPx ? `≥${slot.minPx}px` : undefined]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {renderAssetPicker ? (
              renderAssetPicker(pickerProps)
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id={inputId}
                  value={strVal}
                  placeholder={placeholder || (locale === 'en' ? 'Asset ID' : 'Mã tài nguyên')}
                  disabled={disabled}
                  aria-invalid={!!errorMsg}
                  onChange={(e) => onChangePath(path, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onPickAsset?.(pickerProps)}
                >
                  <ImageIcon className="size-4" />
                  {locale === 'en' ? 'Choose asset' : 'Chọn tài nguyên'}
                </Button>
              </div>
            )}
          </div>
        );
        break;
      }

      case 'localized':
        control = (
          <LocalizedFieldWidget
            field={field}
            path={path}
            value={value}
            locale={locale}
            disabled={disabled}
            onChange={(next) => onChangePath(path, next)}
          />
        );
        break;

      case 'list': {
        const items = Array.isArray(value) ? value : [];
        const itemLabel = resolveLocalized(
          field.itemLabel,
          locale,
          locale === 'en' ? 'Item' : 'Mục',
        );
        const canAdd = field.maxItems === undefined || items.length < field.maxItems;
        const canRemove = field.minItems === undefined || items.length > field.minItems;

        control = (
          <div className="grid gap-3" data-slot="list-widget">
            {items.map((_, idx) => {
              const itemPath = `${path}.${idx}`;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: Config list items are positional
                  key={idx}
                  data-slot="list-item"
                  className="grid gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {itemLabel} #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={disabled || idx === 0}
                        aria-label={`${locale === 'en' ? 'Move up' : 'Lên'} #${idx + 1}`}
                        onClick={() => onChangePath(path, reorderListItem(items, idx, idx - 1))}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={disabled || idx === items.length - 1}
                        aria-label={`${locale === 'en' ? 'Move down' : 'Xuống'} #${idx + 1}`}
                        onClick={() => onChangePath(path, reorderListItem(items, idx, idx + 1))}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-7"
                        disabled={disabled || !canRemove}
                        aria-label={`${locale === 'en' ? 'Remove' : 'Xoá'} #${idx + 1}`}
                        onClick={() =>
                          onChangePath(path, removeListItem(items, idx, field.minItems))
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {field.item &&
                    (field.item.type === 'object' && field.item.fields ? (
                      <div className="grid gap-3">
                        {field.item.fields.map((subField) => {
                          const subPath = `${itemPath}.${subField.key}`;
                          return (
                            <AutoFormField
                              key={subPath}
                              field={subField}
                              path={subPath}
                              rootValue={rootValue}
                              onChangePath={onChangePath}
                              locale={locale}
                              brandPalette={brandPalette}
                              assetSlotMap={assetSlotMap}
                              renderAssetPicker={renderAssetPicker}
                              onPickAsset={onPickAsset}
                              errors={errors}
                              disabled={disabled}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <AutoFormField
                        field={field.item}
                        path={itemPath}
                        rootValue={rootValue}
                        onChangePath={onChangePath}
                        locale={locale}
                        brandPalette={brandPalette}
                        assetSlotMap={assetSlotMap}
                        renderAssetPicker={renderAssetPicker}
                        onPickAsset={onPickAsset}
                        errors={errors}
                        disabled={disabled}
                      />
                    ))}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !canAdd}
              onClick={() => onChangePath(path, addListItem(items, field.item, field.maxItems))}
              className="w-fit"
            >
              <Plus className="size-4" />
              {locale === 'en' ? `Add ${itemLabel}` : `Thêm ${itemLabel}`}
            </Button>
          </div>
        );
        break;
      }
    }
  }

  return (
    <div
      data-slot="autoform-field"
      data-widget={field.widget}
      data-field-path={path}
      className="grid gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.hotEditable && (
          <Badge variant="outline" className="text-[10px]">
            {locale === 'en' ? 'Hot-editable' : 'Sửa nhanh'}
          </Badge>
        )}
      </div>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
      {control}
      {errorMsg && (
        <p role="alert" data-slot="field-error" className="text-destructive text-xs">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export function AutoForm({
  descriptor,
  value,
  onChange,
  locale = 'vi',
  activeGroup,
  brandPalette,
  assetSlots,
  renderAssetPicker,
  onPickAsset,
  errors,
  disabled,
  className,
}: AutoFormProps) {
  const assetSlotMap = React.useMemo(
    () => new Map((assetSlots ?? []).map((slot) => [slot.key, slot])),
    [assetSlots],
  );

  const visibleFields = React.useMemo(() => {
    if (!activeGroup || activeGroup === 'all') {
      return descriptor.fields;
    }
    return descriptor.fields.filter((f) => f.group === activeGroup);
  }, [descriptor.fields, activeGroup]);

  const handleChangePath = React.useCallback(
    (path: string, nextVal: unknown, presetPatch?: Record<string, unknown>) => {
      let nextRoot = setValueAtPath(value, path, nextVal);
      if (presetPatch) {
        for (const [presetKey, presetVal] of Object.entries(presetPatch)) {
          nextRoot = setValueAtPath(nextRoot, presetKey, presetVal);
        }
      }
      onChange(nextRoot, path);
    },
    [value, onChange],
  );

  return (
    <div data-slot="auto-form" className={cn('grid gap-4', className)}>
      {visibleFields.map((field) => (
        <AutoFormField
          key={field.path}
          field={field}
          path={field.path}
          rootValue={value}
          onChangePath={handleChangePath}
          locale={locale}
          brandPalette={brandPalette}
          assetSlotMap={assetSlotMap}
          renderAssetPicker={renderAssetPicker}
          onPickAsset={onPickAsset}
          errors={errors}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
