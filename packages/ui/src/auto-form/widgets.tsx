'use client';

import { cn } from '@playora/ui/lib/utils';
import {
  Button,
  Card,
  ColorPicker,
  Form,
  type FormListFieldData,
  type FormRule,
  Input,
  InputNumber,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd';
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react';
import type * as React from 'react';
import type { AssetSlot, AutoFormProps, FieldDescriptor, Locale, WidgetProps } from './types';
import { createDefaultValueForField, resolveLocalized } from './utils';

/** body-sm (12/20) secondary text for hints inside the form (mirrors Studio's `Caption`). */
export function FieldHint({
  children,
  type = 'secondary',
  ...rest
}: Omit<React.ComponentProps<typeof Typography.Text>, 'style'>) {
  const { token } = theme.useToken();
  return (
    <Typography.Text
      type={type}
      {...rest}
      style={{ fontSize: token.fontSizeSM, lineHeight: token.lineHeightSM }}
    >
      {children}
    </Typography.Text>
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
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={numericVal}
          disabled={disabled}
          onChange={handleChange}
        />
      </div>
      <InputNumber
        id={id}
        aria-label={`${label} value`}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        precision={field.integer ? 0 : undefined}
        value={numericVal}
        disabled={disabled}
        onChange={handleChange}
        className="w-24"
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
  const { id, value, onChange, locale, brandPalette, disabled } = props;
  const colorStr = typeof value === 'string' ? value : '';
  const presets = brandPalette?.length
    ? [
        {
          label: locale === 'en' ? 'Brand palette' : 'Bảng màu thương hiệu',
          colors: [...brandPalette],
        },
      ]
    : undefined;
  return (
    <div id={id} className="grid gap-2">
      <ColorPicker
        value={colorStr || undefined}
        showText
        disabled={disabled}
        presets={presets}
        onChange={(_, cssHex) => onChange?.(cssHex)}
      />
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
              className={cn(
                'size-6 cursor-pointer rounded-full border disabled:cursor-not-allowed disabled:opacity-50',
                colorStr.toLowerCase() === swatch.toLowerCase() && 'ring-2',
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
        <Space.Compact block>
          <Input
            id={id}
            value={strVal}
            placeholder={placeholder || (locale === 'en' ? 'Asset ID' : 'Mã tài nguyên')}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
          />
          <Button
            type="default"
            disabled={disabled}
            icon={<ImageIcon className="size-4" />}
            onClick={() => props.onPickAsset?.(pickerProps)}
          >
            {locale === 'en' ? 'Choose asset' : 'Chọn tài nguyên'}
          </Button>
        </Space.Compact>
      )}
    </div>
  );
}

export function LocalizedWidgetControl(props: {
  field: FieldDescriptor;
  label: string;
  relNamePath: (string | number)[];
  rules: FormRule[];
  disabled?: boolean;
}) {
  const { field, label, relNamePath, rules, disabled } = props;
  return (
    <Space.Compact block data-slot="localized-widget">
      {(['vi', 'en'] as const).map((lang) => (
        <Form.Item key={lang} name={[...relNamePath, lang]} noStyle rules={rules}>
          <Input
            data-lang={lang}
            data-lang-input={lang}
            prefix={lang.toUpperCase()}
            aria-label={`${label} (${lang.toUpperCase()})`}
            maxLength={field.maxLength}
            placeholder={resolveLocalized(field.placeholder, lang)}
            disabled={disabled}
          />
        </Form.Item>
      ))}
    </Space.Compact>
  );
}

export function ListWidgetControl(props: {
  field: FieldDescriptor;
  relNamePath: (string | number)[];
  locale: Locale;
  disabled?: boolean;
  renderItemFields: (lf: FormListFieldData, idx: number) => React.ReactNode;
}) {
  const { field, relNamePath, locale, disabled, renderItemFields } = props;
  const itemLabel = resolveLocalized(field.itemLabel, locale, locale === 'en' ? 'Item' : 'Mục');
  return (
    <Form.List name={relNamePath}>
      {(listFields, { add, remove, move }) => {
        const canAdd = field.maxItems === undefined || listFields.length < field.maxItems;
        const canRemove = field.minItems === undefined || listFields.length > field.minItems;
        return (
          <div className="grid gap-3" data-slot="list-widget">
            {listFields.map((lf, idx) => (
              <Card
                key={lf.key}
                size="small"
                data-slot="list-item"
                title={`${itemLabel} #${idx + 1}`}
                extra={
                  <div className="flex items-center gap-1">
                    <Button
                      type="text"
                      size="small"
                      disabled={disabled || idx === 0}
                      aria-label={`${locale === 'en' ? 'Move up' : 'Lên'} #${idx + 1}`}
                      icon={<ArrowUp className="size-3.5" />}
                      onClick={() => idx > 0 && move(idx, idx - 1)}
                    />
                    <Button
                      type="text"
                      size="small"
                      disabled={disabled || idx === listFields.length - 1}
                      aria-label={`${locale === 'en' ? 'Move down' : 'Xuống'} #${idx + 1}`}
                      icon={<ArrowDown className="size-3.5" />}
                      onClick={() => idx < listFields.length - 1 && move(idx, idx + 1)}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      disabled={disabled || !canRemove}
                      aria-label={`${locale === 'en' ? 'Remove' : 'Xoá'} #${idx + 1}`}
                      icon={<Trash2 className="size-3.5" />}
                      onClick={() => canRemove && remove(lf.name)}
                    />
                  </div>
                }
              >
                {renderItemFields(lf, idx)}
              </Card>
            ))}
            <Button
              type="dashed"
              size="small"
              disabled={disabled || !canAdd}
              icon={<Plus className="size-4" />}
              onClick={() => canAdd && add(createDefaultValueForField(field.item))}
              className="w-fit"
            >
              {locale === 'en' ? `Add ${itemLabel}` : `Thêm ${itemLabel}`}
            </Button>
          </div>
        );
      }}
    </Form.List>
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
  disabled: boolean;
  brandPalette?: readonly string[];
  slot?: AssetSlot;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
}): React.ReactNode {
  const { field, label, placeholder, locale, disabled } = args;
  const options = (field.options ?? []).map((opt) => ({
    value: opt.value,
    label: resolveLocalized(opt.label, locale, opt.value),
  }));
  switch (field.widget) {
    case 'text':
      return <Input placeholder={placeholder} maxLength={field.maxLength} disabled={disabled} />;
    case 'number':
      return (
        <InputNumber
          min={field.min}
          max={field.max}
          step={field.step ?? (field.integer ? 1 : undefined)}
          precision={field.integer ? 0 : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full"
        />
      );
    case 'slider':
      return <SliderWidgetControl field={field} label={label} disabled={disabled} />;
    case 'switch':
      return <Switch aria-label={label} disabled={disabled} />;
    case 'segmented':
      return <Segmented options={options} disabled={disabled} />;
    case 'select':
      return <Select options={options} disabled={disabled} />;
    case 'color':
      return (
        <ColorWidgetControl locale={locale} brandPalette={args.brandPalette} disabled={disabled} />
      );
    case 'asset':
    case 'sound':
      return <AssetWidgetControl {...args} />;
    default:
      return null;
  }
}
