'use client';

import {
  type AssetSummary,
  BRAND_FONTS,
  type BrandKitSummary,
  type CreateBrandKitBody,
} from '@playora/contracts';
import {
  Button,
  Card,
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  ListBox,
  Select,
  TextField,
} from '@playora/ui/components';
import { Plus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

export type BrandKitFormValues = z.input<typeof CreateBrandKitBody>;

export const NONE_ASSET = '__none__';

export const DEFAULT_BRAND_KIT_VALUES: BrandKitFormValues = {
  name: '',
  tokens: {
    colors: {
      primary: '#7c3aed',
      secondary: '#f59e0b',
      background: '#0f0a1e',
      text: '#ffffff',
    },
    fontHeading: 'Unbounded',
    fontBody: 'Be Vietnam Pro',
    logoAssetId: null,
    backgroundAssetId: null,
    musicAssetId: null,
  },
};

export function toBrandKitFormValues(kit: BrandKitSummary): BrandKitFormValues {
  return {
    name: kit.name,
    tokens: {
      colors: {
        primary: kit.tokens.colors.primary,
        secondary: kit.tokens.colors.secondary ?? '#f59e0b',
        background: kit.tokens.colors.background,
        text: kit.tokens.colors.text,
      },
      fontHeading: kit.tokens.fontHeading ?? 'Unbounded',
      fontBody: kit.tokens.fontBody ?? 'Be Vietnam Pro',
      logoAssetId: kit.tokens.logoAssetId ?? null,
      backgroundAssetId: kit.tokens.backgroundAssetId ?? null,
      musicAssetId: kit.tokens.musicAssetId ?? null,
    },
  };
}

const COLOR_FIELDS = [
  ['primary', 'brandKits.primaryColor'],
  ['secondary', 'brandKits.secondaryColor'],
  ['background', 'brandKits.backgroundColor'],
  ['text', 'brandKits.textColor'],
] as const;

const FONT_FIELDS = [
  ['fontHeading', 'brandKits.fontHeading'],
  ['fontBody', 'brandKits.fontBody'],
] as const;

export function HexColorInput({
  id,
  label,
  value,
  onChange,
  isInvalid,
  hint,
}: {
  id?: string;
  label?: ReactNode;
  value?: string;
  onChange?: (next: string) => void;
  isInvalid?: boolean;
  hint?: ReactNode;
}) {
  const hexValue = typeof value === 'string' ? value : '#000000';
  const safePickerColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexValue)
    ? hexValue.length === 4
      ? `#${hexValue[1]}${hexValue[1]}${hexValue[2]}${hexValue[2]}${hexValue[3]}${hexValue[3]}`
      : hexValue
    : '#000000';

  return (
    <TextField
      id={id}
      aria-label={!label ? 'Hex color' : undefined}
      value={hexValue}
      onChange={(val) => onChange?.(val)}
      isInvalid={isInvalid}
      fullWidth
    >
      {label && <Label>{label}</Label>}
      <InputGroup fullWidth>
        <InputGroup.Prefix className="px-1.5">
          <input
            type="color"
            value={safePickerColor}
            onChange={(e) => onChange?.(e.target.value)}
            className="size-6 shrink-0 cursor-pointer rounded border border-border-button-default bg-transparent p-0"
            aria-label="Pick color"
          />
        </InputGroup.Prefix>
        <InputGroup.Input className="font-mono" />
      </InputGroup>
      {hint && (isInvalid ? <FieldError>{hint}</FieldError> : <Description>{hint}</Description>)}
    </TextField>
  );
}

export function BrandKitEditorCard({
  form,
  editingId,
  imageAssets,
  audioAssets,
  isSubmitting,
  onResetToNew,
}: {
  form: UseFormReturn<BrandKitFormValues>;
  editingId: string | null;
  imageAssets: AssetSummary[];
  audioAssets: AssetSummary[];
  isSubmitting: boolean;
  onResetToNew: () => void;
}) {
  const t = useTranslations();
  const fontOptions = useMemo(() => BRAND_FONTS.map((f) => ({ value: f, label: f })), []);

  const imageAssetOptions = useMemo(
    () => [
      { value: NONE_ASSET, label: t('brandKits.noAsset') },
      ...imageAssets.map((a) => ({ value: a.id, label: `${a.mime} (${a.id.slice(-6)})` })),
    ],
    [imageAssets, t],
  );

  const audioAssetOptions = useMemo(
    () => [
      { value: NONE_ASSET, label: t('brandKits.noAsset') },
      ...audioAssets.map((a) => ({ value: a.id, label: `${a.mime} (${a.id.slice(-6)})` })),
    ],
    [audioAssets, t],
  );

  const assetSlots = [
    ['logoAssetId', 'brandKits.logoAsset', imageAssetOptions],
    ['backgroundAssetId', 'brandKits.backgroundAsset', imageAssetOptions],
    ['musicAssetId', 'brandKits.musicAsset', audioAssetOptions],
  ] as const;

  return (
    <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <Card.Title className="m-0 text-body-medium text-text-primary">
          {editingId ? t('brandKits.edit') : t('brandKits.new')}
        </Card.Title>
        {editingId ? (
          <Button type="button" variant="ghost" size="sm" onPress={onResetToNew}>
            <Plus className="size-4" />
            {t('brandKits.new')}
          </Button>
        ) : null}
      </Card.Header>
      <Card.Content className="p-5">
        <div className="grid gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                value={field.value}
                onChange={field.onChange}
                isInvalid={!!fieldState.error}
                fullWidth
              >
                <Label>{t('brandKits.name')}</Label>
                <Input />
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map(([colorKey, labelKey]) => (
              <Controller
                key={colorKey}
                control={form.control}
                name={`tokens.colors.${colorKey}` as const}
                render={({ field, fieldState }) => (
                  <HexColorInput
                    label={t(labelKey)}
                    value={field.value}
                    onChange={field.onChange}
                    isInvalid={!!fieldState.error}
                    hint={fieldState.error?.message}
                  />
                )}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FONT_FIELDS.map(([fontKey, labelKey]) => (
              <Controller
                key={fontKey}
                control={form.control}
                name={`tokens.${fontKey}` as const}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-body-medium text-text-primary">{t(labelKey)}</span>
                    <Select
                      aria-label={t(labelKey)}
                      selectedKey={field.value ?? null}
                      onSelectionChange={(key) => {
                        if (key !== null) field.onChange(String(key));
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {fontOptions.map((f) => (
                            <ListBox.Item key={f.value} id={f.value} textValue={f.label}>
                              {f.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {fieldState.error?.message && (
                      <span className="text-caption-1-medium text-text-error-primary">
                        {fieldState.error.message}
                      </span>
                    )}
                  </div>
                )}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {assetSlots.map(([slotKey, labelKey, options]) => (
              <Controller
                key={slotKey}
                control={form.control}
                name={`tokens.${slotKey}` as const}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-body-medium text-text-primary">{t(labelKey)}</span>
                    <Select
                      aria-label={t(labelKey)}
                      selectedKey={field.value ?? NONE_ASSET}
                      onSelectionChange={(key) => {
                        if (key !== null) {
                          const v = String(key);
                          field.onChange(v === NONE_ASSET ? null : v);
                        }
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {options.map((opt) => (
                            <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                              {opt.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {fieldState.error?.message && (
                      <span className="text-caption-1-medium text-text-error-primary">
                        {fieldState.error.message}
                      </span>
                    )}
                  </div>
                )}
              />
            ))}
          </div>

          <Card.Footer className="flex justify-end gap-2 border-t border-separator-border p-0 pt-3">
            {editingId && (
              <Button type="button" variant="secondary" size="sm" onPress={onResetToNew}>
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" size="sm" isDisabled={isSubmitting}>
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </Card.Footer>
        </div>
      </Card.Content>
    </Card>
  );
}
