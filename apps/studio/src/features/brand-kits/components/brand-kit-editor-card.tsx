'use client';

import {
  type AssetSummary,
  BRAND_FONTS,
  type BrandKitSummary,
  type CreateBrandKitBody,
} from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Plus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
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
  value,
  onChange,
}: {
  id?: string;
  value?: string;
  onChange?: (next: string) => void;
}) {
  const hexValue = typeof value === 'string' ? value : '#000000';
  const safePickerColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexValue)
    ? hexValue.length === 4
      ? `#${hexValue[1]}${hexValue[1]}${hexValue[2]}${hexValue[2]}${hexValue[3]}${hexValue[3]}`
      : hexValue
    : '#000000';

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={safePickerColor}
        onChange={(e) => onChange?.(e.target.value)}
        className="size-8 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-transparent p-0.5 shadow-xs dark:border-white/10"
        aria-label="Pick color"
      />
      <Input
        id={id}
        value={hexValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 rounded-md font-mono text-xs"
      />
    </div>
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
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {editingId ? t('brandKits.edit') : t('brandKits.new')}
        </CardTitle>
        {editingId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetToNew}
            className="h-7 gap-1 rounded-md text-xs"
          >
            <Plus className="size-3" />
            {t('brandKits.new')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-neutral-700 dark:text-[#D4D4D4]">
                  {t('brandKits.name')}
                </FormLabel>
                <FormControl>
                  <Input className="h-8 rounded-md text-xs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map(([colorKey, labelKey]) => (
              <FormField
                key={colorKey}
                control={form.control}
                name={`tokens.colors.${colorKey}` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(labelKey)}</FormLabel>
                    <FormControl>
                      <HexColorInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FONT_FIELDS.map(([fontKey, labelKey]) => (
              <FormField
                key={fontKey}
                control={form.control}
                name={`tokens.${fontKey}` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(labelKey)}</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label={t(labelKey)}>
                          <SelectValue placeholder={t(labelKey)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fontOptions.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {assetSlots.map(([slotKey, labelKey, options]) => (
              <FormField
                key={slotKey}
                control={form.control}
                name={`tokens.${slotKey}` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(labelKey)}</FormLabel>
                    <Select
                      value={field.value ?? NONE_ASSET}
                      onValueChange={(v) => field.onChange(v === NONE_ASSET ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger aria-label={t(labelKey)}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-white/10">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md text-xs shadow-xs"
                onClick={onResetToNew}
              >
                {t('common.cancel')}
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-md text-xs shadow-xs"
              disabled={isSubmitting}
            >
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
