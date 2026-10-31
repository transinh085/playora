'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import { Slider } from '@playora/ui/components/base/slider/slider';
import { Switch } from '@playora/ui/components/base/switch/switch';
import { cx } from '@playora/ui/utils/cx';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
  RiImageLine,
} from '@remixicon/react';
import type * as React from 'react';
import type { AssetSlot, AutoFormProps, FieldDescriptor, Locale, WidgetProps } from './types';
import { createDefaultValueForField, resolveLocalized } from './utils';

/** body-sm (12/20) secondary text for hints inside the form (mirrors Studio's `Caption`). */
export function FieldHint({
  children,
  className,
  type = 'secondary',
  ...rest
}: React.ComponentProps<'p'> & { type?: 'secondary' | 'danger' }) {
  return (
    <p
      className={cx(
        'text-caption-1-regular',
        type === 'danger' ? 'text-text-error-primary font-medium' : 'text-text-tertiary',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

export function SliderWidgetControl(props: {
  id?: string;
  value?: number;
  onChange?: (next: number) => void;
  field: FieldDescriptor;
  label: string;
  disabled?: boolean;
}) {
  const { id, value, onChange, field, label, disabled } = props;
  const numericVal = typeof value === 'number' && !Number.isNaN(value) ? value : (field.min ?? 0);
  const handleChange = (next: number | null) => {
    if (next === null || Number.isNaN(next)) return;
    onChange?.(field.integer ? Math.trunc(next) : next);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Slider
          minValue={field.min ?? 0}
          maxValue={field.max ?? 100}
          step={field.step ?? 1}
          value={numericVal}
          isDisabled={disabled}
          showTooltip={false}
          thumbLabel={label}
          onChange={(val) => handleChange(val)}
        />
      </div>
      <input
        type="number"
        id={id}
        aria-label={`${label} value`}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={numericVal}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
        className="h-9 w-24 rounded-2lg bg-background-tertiary-default px-3 py-1 text-body-regular text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

export function ColorWidgetControl(props: {
  id?: string;
  value?: string;
  onChange?: (next: string) => void;
  locale: Locale;
  brandPalette?: readonly string[];
  disabled?: boolean;
}) {
  const { id, value, onChange, brandPalette, disabled } = props;
  const colorStr = typeof value === 'string' ? value : '';
  return (
    <div id={id} className="grid gap-2" data-slot="color-picker">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={colorStr || '#000000'}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-border-button-default bg-background-primary-default p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="text"
          value={colorStr}
          placeholder="#000000"
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-8 w-28 rounded-2lg bg-background-tertiary-default px-2 text-caption-1-medium font-mono text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {brandPalette && brandPalette.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-slot="brand-palette">
          {brandPalette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              data-slot="brand-swatch"
              data-color={swatch}
              aria-label={swatch}
              disabled={disabled}
              onClick={() => onChange?.(swatch)}
              className={cx(
                'size-6 cursor-pointer rounded-full border border-border-button-default transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
                colorStr.toLowerCase() === swatch.toLowerCase() &&
                  'ring-2 ring-accent-600 ring-offset-2',
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AssetWidgetControl(props: {
  id?: string;
  value?: string;
  onChange?: (next: string) => void;
  field: FieldDescriptor;
  slot?: AssetSlot;
  locale: Locale;
  placeholder?: string;
  disabled?: boolean;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
}) {
  const { id, value, onChange, field, slot, locale, placeholder, disabled } = props;
  const strVal = typeof value === 'string' ? value : '';
  const pickerProps = {
    field,
    slot,
    value: strVal,
    locale,
    disabled,
    onChange: (nextVal: string) => onChange?.(nextVal),
  };
  return (
    <div className="grid gap-2" data-slot="asset-widget">
      {slot && (slot.ratio || slot.minPx) && (
        <FieldHint data-slot="asset-constraints">
          {[slot.ratio, slot.minPx ? `≥${slot.minPx}px` : undefined].filter(Boolean).join(' · ')}
        </FieldHint>
      )}
      {props.renderAssetPicker ? (
        props.renderAssetPicker(pickerProps)
      ) : (
        <div className="flex items-center gap-2">
          <InputBase
            id={id}
            value={strVal}
            placeholder={placeholder || (locale === 'en' ? 'Asset ID' : 'Mã tài nguyên')}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            leadingIcon={RiImageLine}
            disabled={disabled}
            onClick={() => props.onPickAsset?.(pickerProps)}
          >
            {locale === 'en' ? 'Choose asset' : 'Chọn tài nguyên'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function LocalizedWidgetControl(props: {
  field: FieldDescriptor;
  label: string;
  value?: { vi?: string; en?: string };
  onChange?: (next: { vi?: string; en?: string }) => void;
  disabled?: boolean;
}) {
  const { field, label, value = {}, onChange, disabled } = props;
  return (
    <div className="grid grid-cols-2 gap-2" data-slot="localized-widget">
      {(['vi', 'en'] as const).map((lang) => (
        <div
          key={lang}
          className="flex items-center rounded-2lg bg-background-tertiary-default ring-2 ring-inset ring-transparent focus-within:ring-border-button-active"
        >
          <span className="select-none px-2.5 text-caption-1-semibold text-text-tertiary uppercase border-r border-separator-border">
            {lang}
          </span>
          <input
            data-lang={lang}
            data-lang-input={lang}
            aria-label={`${label} (${lang.toUpperCase()})`}
            maxLength={field.maxLength}
            value={value[lang] ?? ''}
            placeholder={resolveLocalized(field.placeholder, lang)}
            disabled={disabled}
            onChange={(e) => onChange?.({ ...value, [lang]: e.target.value })}
            className="h-9 w-full bg-transparent px-3 text-body-regular text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ))}
    </div>
  );
}

export function ListWidgetControl(props: {
  field: FieldDescriptor;
  value?: unknown[];
  onChange?: (next: unknown[]) => void;
  locale: Locale;
  disabled?: boolean;
  renderItemFields: (
    itemVal: unknown,
    idx: number,
    onItemChange: (newVal: unknown) => void,
  ) => React.ReactNode;
}) {
  const { field, value = [], onChange, locale, disabled, renderItemFields } = props;
  const list = Array.isArray(value) ? value : [];
  const itemLabel = resolveLocalized(field.itemLabel, locale, locale === 'en' ? 'Item' : 'Mục');
  const canAdd = field.maxItems === undefined || list.length < field.maxItems;
  const canRemove = field.minItems === undefined || list.length > field.minItems;

  const handleAdd = () => {
    if (!canAdd) return;
    onChange?.([...list, createDefaultValueForField(field.item)]);
  };

  const handleRemove = (idx: number) => {
    if (!canRemove) return;
    onChange?.(list.filter((_, i) => i !== idx));
  };

  const handleMove = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= list.length) return;
    const next = [...list];
    const [item] = next.splice(fromIdx, 1);
    if (item !== undefined) {
      next.splice(toIdx, 0, item);
      onChange?.(next);
    }
  };

  const handleItemChange = (idx: number, newVal: unknown) => {
    const next = [...list];
    next[idx] = newVal;
    onChange?.(next);
  };

  return (
    <div className="grid gap-3" data-slot="list-widget">
      {list.map((itemVal, idx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable numeric index for form list
          key={idx}
          className="rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs"
          data-slot="list-item"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-separator-border">
            <span className="text-body-medium text-text-primary">
              {itemLabel} #{idx + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiArrowUpLine}
                disabled={disabled || idx === 0}
                aria-label={`${locale === 'en' ? 'Move up' : 'Lên'} #${idx + 1}`}
                onClick={() => handleMove(idx, idx - 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiArrowDownLine}
                disabled={disabled || idx === list.length - 1}
                aria-label={`${locale === 'en' ? 'Move down' : 'Xuống'} #${idx + 1}`}
                onClick={() => handleMove(idx, idx + 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiDeleteBinLine}
                className="text-text-error-primary"
                disabled={disabled || !canRemove}
                aria-label={`${locale === 'en' ? 'Remove' : 'Xoá'} #${idx + 1}`}
                onClick={() => handleRemove(idx)}
              />
            </div>
          </div>
          <div>{renderItemFields(itemVal, idx, (newVal) => handleItemChange(idx, newVal))}</div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="small"
        leadingIcon={RiAddLine}
        disabled={disabled || !canAdd}
        onClick={handleAdd}
        className="w-fit"
      >
        {locale === 'en' ? `Add ${itemLabel}` : `Thêm ${itemLabel}`}
      </Button>
    </div>
  );
}

export function CustomWidgetControl(props: {
  Component: React.ComponentType<WidgetProps>;
  field: FieldDescriptor;
  path: string;
  value?: unknown;
  onChange?: (next: unknown) => void;
  locale: Locale;
  disabled?: boolean;
  brandPalette?: readonly string[];
  error?: string;
}) {
  const { Component, onChange, value, ...rest } = props;
  return <Component {...rest} value={value} onChange={(next) => onChange?.(next)} />;
}

export function renderScalarControl(args: {
  field: FieldDescriptor;
  label: string;
  placeholder: string;
  locale: Locale;
  value?: unknown;
  onChange?: (next: unknown) => void;
  disabled: boolean;
  brandPalette?: readonly string[];
  slot?: AssetSlot;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
}): React.ReactNode {
  const { field, label, placeholder, locale, value, onChange, disabled } = args;
  const options = (field.options ?? []).map((opt) => ({
    value: opt.value,
    label: resolveLocalized(opt.label, locale, opt.value),
  }));

  switch (field.widget) {
    case 'text':
      return (
        <InputBase
          id={field.path}
          placeholder={placeholder}
          maxLength={field.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <InputBase
          id={field.path}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? (field.integer ? 1 : undefined)}
          placeholder={placeholder}
          value={typeof value === 'number' ? value : ((value as string) ?? '')}
          onChange={(e) => onChange?.(e.target.value === '' ? undefined : Number(e.target.value))}
          disabled={disabled}
        />
      );
    case 'slider':
      return (
        <SliderWidgetControl
          id={field.path}
          field={field}
          label={label}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'switch':
      return (
        <Switch
          id={field.path}
          isSelected={Boolean(value)}
          onChange={onChange}
          aria-label={label}
          isDisabled={disabled}
        />
      );
    case 'segmented':
      return (
        <div
          className="inline-flex h-9 items-center justify-center rounded-xl bg-segmented-control-background p-1 text-text-secondary"
          data-slot="segmented"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(opt.value)}
              className={cx(
                'inline-flex items-center justify-center whitespace-nowrap rounded-2lg px-3 py-1 text-body-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30 disabled:pointer-events-none disabled:opacity-50',
                value === opt.value
                  ? 'bg-segmented-control-selected-background text-text-primary shadow-xs'
                  : 'hover:text-text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case 'select':
      return (
        <select
          id={field.path}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="h-9 w-full rounded-2lg border border-border-button-default bg-background-primary-default px-3 py-1 text-body-medium text-text-primary shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'color':
      return (
        <ColorWidgetControl
          id={field.path}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          locale={locale}
          brandPalette={args.brandPalette}
          disabled={disabled}
        />
      );
    case 'asset':
    case 'sound':
      return (
        <AssetWidgetControl
          {...args}
          id={field.path}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}
