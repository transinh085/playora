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
  toast,
} from '@playora/ui/components';
import { ImageIcon, Plus, WandSparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { AssetPickerModal } from '@/features/assets/components/asset-picker-modal';
import { extractPaletteFromImage } from '../lib/extract-palette';

export type BrandKitFormValues = z.input<typeof CreateBrandKitBody>;

export const NONE_ASSET = '__none__';

export const DEFAULT_BRAND_KIT_VALUES: BrandKitFormValues = {
  name: '',
  tokens: {
    colors: {
      primary: '#0f7c79',
      secondary: '#facf4e',
      accent: '#facf4e',
      background: '#fffdf9',
      surface: '#f5efe6',
      text: '#1c1917',
    },
    fontHeading: 'Be Vietnam Pro',
    fontBody: 'Be Vietnam Pro',
    logoAssetId: null,
    backgroundAssetId: null,
    musicAssetId: null,
  },
};

export function toBrandKitFormValues(kit: BrandKitSummary): BrandKitFormValues {
  const accent = kit.tokens.colors.accent ?? kit.tokens.colors.secondary ?? '#facf4e';
  const surface = kit.tokens.colors.surface ?? kit.tokens.colors.background;
  return {
    name: kit.name,
    tokens: {
      colors: {
        primary: kit.tokens.colors.primary,
        secondary: kit.tokens.colors.secondary ?? accent,
        accent,
        background: kit.tokens.colors.background,
        surface,
        text: kit.tokens.colors.text,
      },
      fontHeading: kit.tokens.fontHeading ?? 'Be Vietnam Pro',
      fontBody: kit.tokens.fontBody ?? 'Be Vietnam Pro',
      logoAssetId: kit.tokens.logoAssetId ?? null,
      backgroundAssetId: kit.tokens.backgroundAssetId ?? null,
      musicAssetId: kit.tokens.musicAssetId ?? null,
    },
  };
}

const COLOR_FIELDS = [
  ['primary', 'brandKits.primaryColor'],
  ['accent', 'brandKits.accentColor'],
  ['background', 'brandKits.backgroundColor'],
  ['surface', 'brandKits.surfaceColor'],
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
  orgId,
  form,
  editingId,
  imageAssets,
  audioAssets,
  isSubmitting,
  onResetToNew,
}: {
  orgId?: string;
  form: UseFormReturn<BrandKitFormValues>;
  editingId: string | null;
  imageAssets: AssetSummary[];
  audioAssets: AssetSummary[];
  isSubmitting: boolean;
  onResetToNew: () => void;
}) {
  const t = useTranslations();
  const [pickerTarget, setPickerTarget] = useState<'logoAssetId' | 'backgroundAssetId' | null>(
    null,
  );
  const [extractingPalette, setExtractingPalette] = useState(false);

  const watchedLogoAssetId = useWatch({ control: form.control, name: 'tokens.logoAssetId' });
  const selectedLogoAsset = useMemo(
    () => imageAssets.find((a) => a.id === watchedLogoAssetId),
    [imageAssets, watchedLogoAssetId],
  );

  const fontOptions = useMemo(() => BRAND_FONTS.map((f) => ({ value: f, label: f })), []);

  const imageAssetOptions = useMemo(
    () => [
      { value: NONE_ASSET, label: t('brandKits.noAsset') },
      ...imageAssets.map((a) => ({
        value: a.id,
        label: a.filename || `${a.mime} (${a.id.slice(-6)})`,
      })),
    ],
    [imageAssets, t],
  );

  const audioAssetOptions = useMemo(
    () => [
      { value: NONE_ASSET, label: t('brandKits.noAsset') },
      ...audioAssets.map((a) => ({
        value: a.id,
        label: a.filename || `${a.mime} (${a.id.slice(-6)})`,
      })),
    ],
    [audioAssets, t],
  );

  const assetSlots = [
    ['logoAssetId', 'brandKits.logoAsset', imageAssetOptions],
    ['backgroundAssetId', 'brandKits.backgroundAsset', imageAssetOptions],
    ['musicAssetId', 'brandKits.musicAsset', audioAssetOptions],
  ] as const;

  const applyPaletteFromAsset = async (asset: AssetSummary) => {
    const src = asset.variants.w320?.url ?? asset.url;
    if (!src) return;
    setExtractingPalette(true);
    try {
      const palette = await extractPaletteFromImage(src);
      form.setValue('tokens.colors.primary', palette.primary, { shouldDirty: true });
      form.setValue('tokens.colors.secondary', palette.accent, { shouldDirty: true });
      form.setValue('tokens.colors.accent', palette.accent, { shouldDirty: true });
      form.setValue('tokens.colors.background', palette.background, { shouldDirty: true });
      form.setValue('tokens.colors.surface', palette.surface, { shouldDirty: true });
      form.setValue('tokens.colors.text', palette.text, { shouldDirty: true });
      toast.success(t('brandKits.paletteApplied'));
    } catch {
      // Ignore cross-origin or load errors during palette suggestion
    } finally {
      setExtractingPalette(false);
    }
  };

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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COLOR_FIELDS.map(([colorKey, labelKey]) => (
              <Controller
                key={colorKey}
                control={form.control}
                name={`tokens.colors.${colorKey}` as const}
                render={({ field, fieldState }) => (
                  <HexColorInput
                    label={t(labelKey)}
                    value={field.value}
                    onChange={(next) => {
                      field.onChange(next);
                      if (colorKey === 'accent') {
                        form.setValue('tokens.colors.secondary', next, { shouldDirty: true });
                      }
                    }}
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
            {assetSlots.map(([slotKey, labelKey, options]) => {
              const isImageSlot = slotKey === 'logoAssetId' || slotKey === 'backgroundAssetId';
              return (
                <Controller
                  key={slotKey}
                  control={form.control}
                  name={`tokens.${slotKey}` as const}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-medium text-text-primary">{t(labelKey)}</span>
                        {orgId && isImageSlot && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-caption-1-medium"
                            onPress={() => setPickerTarget(slotKey)}
                          >
                            <ImageIcon className="size-3.5" />
                            {t('builderLab.quickEdit.chooseFromLibrary')}
                          </Button>
                        )}
                      </div>
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
                      {slotKey === 'logoAssetId' && selectedLogoAsset && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isDisabled={extractingPalette}
                          onPress={() => applyPaletteFromAsset(selectedLogoAsset)}
                          className="mt-0.5 justify-start text-caption-1-medium"
                        >
                          <WandSparkles className="size-3.5 text-accent" />
                          {t('brandKits.suggestPaletteFromLogo')}
                        </Button>
                      )}
                      {fieldState.error?.message && (
                        <span className="text-caption-1-medium text-text-error-primary">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
              );
            })}
          </div>

          {orgId && (
            <AssetPickerModal
              orgId={orgId}
              isOpen={pickerTarget !== null}
              onOpenChange={(open) => {
                if (!open) setPickerTarget(null);
              }}
              selectedAssetId={
                pickerTarget ? (form.getValues(`tokens.${pickerTarget}`) ?? null) : null
              }
              onSelect={(asset) => {
                if (!pickerTarget) return;
                form.setValue(`tokens.${pickerTarget}`, asset.id, { shouldDirty: true });
                if (pickerTarget === 'logoAssetId') {
                  void applyPaletteFromAsset(asset);
                }
              }}
            />
          )}

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
