'use client';

import {
  type AssetSummary,
  BRAND_FONTS,
  type BrandKitSummary,
  type CreateBrandKitBody,
} from '@playora/contracts';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Input } from '@playora/ui/components/base/input/input';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
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
    <Input
      id={id}
      label={label}
      aria-label={!label ? 'Hex color' : undefined}
      value={hexValue}
      onChange={(val) => onChange?.(val)}
      isInvalid={isInvalid}
      hint={hint}
      inputClassName="font-mono"
      leadingAddon={
        <input
          type="color"
          value={safePickerColor}
          onChange={(e) => onChange?.(e.target.value)}
          className="size-6 shrink-0 cursor-pointer rounded-md border border-border-button-default bg-transparent p-0.5 shadow-2xs"
          aria-label="Pick color"
        />
      }
    />
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
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">
          {editingId ? t('brandKits.edit') : t('brandKits.new')}
        </h3>
        {editingId ? (
          <Button
            type="button"
            variant="ghost"
            size="small"
            leadingIcon={Plus}
            onClick={onResetToNew}
          >
            {t('brandKits.new')}
          </Button>
        ) : null}
      </div>
      <div className="p-5">
        <div className="grid gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label={t('brandKits.name')}
                value={field.value}
                onChange={field.onChange}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
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
                      {fontOptions.map((f) => (
                        <SelectItem key={f.value} id={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
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
                      {options.map((opt) => (
                        <SelectItem key={opt.value} id={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
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

          <div className="flex justify-end gap-2 border-t border-separator-border pt-3">
            {editingId && (
              <Button type="button" variant="secondary" size="small" onClick={onResetToNew}>
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" size="small" disabled={isSubmitting}>
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
