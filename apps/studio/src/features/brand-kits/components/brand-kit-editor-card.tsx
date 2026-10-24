'use client';

import {
  type AssetSummary,
  BRAND_FONTS,
  type BrandKitSummary,
  type CreateBrandKitBody,
} from '@playora/contracts';
import { Button, Card, ColorPicker, Form, type FormRule, Input, Select } from 'antd';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
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

function HexColorInput({
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
    ? hexValue
    : '#000000';

  return (
    <div className="flex items-center gap-2">
      <ColorPicker
        value={safePickerColor}
        disabledAlpha
        onChange={(color) => onChange?.(color.toHexString())}
      />
      <Input
        id={id}
        value={hexValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="font-mono"
      />
    </div>
  );
}

const toNullableAssetProps = (v: string | null | undefined) => ({ value: v ?? NONE_ASSET });
const fromNullableAssetEvent = (v: string) => (v === NONE_ASSET || !v ? null : v);

export function BrandKitEditorCard({
  rules,
  editingId,
  imageAssets,
  audioAssets,
  isSubmitting,
  onResetToNew,
}: {
  rules: FormRule[];
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
    <Card
      title={editingId ? t('brandKits.edit') : t('brandKits.new')}
      extra={
        editingId ? (
          <Button
            htmlType="button"
            type="text"
            size="small"
            icon={<Plus className="size-4" />}
            onClick={onResetToNew}
          >
            {t('brandKits.new')}
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4">
        <Form.Item name="name" label={t('brandKits.name')} rules={rules} className="mb-0">
          <Input />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(([field, labelKey]) => (
            <Form.Item
              key={field}
              name={['tokens', 'colors', field]}
              label={t(labelKey)}
              rules={rules}
              className="mb-0"
            >
              <HexColorInput />
            </Form.Item>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FONT_FIELDS.map(([field, labelKey]) => (
            <Form.Item
              key={field}
              name={['tokens', field]}
              label={t(labelKey)}
              rules={rules}
              className="mb-0"
            >
              <Select aria-label={t(labelKey)} options={fontOptions} />
            </Form.Item>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {assetSlots.map(([field, labelKey, options]) => (
            <Form.Item
              key={field}
              name={['tokens', field]}
              label={t(labelKey)}
              rules={rules}
              className="mb-0"
              getValueProps={toNullableAssetProps}
              getValueFromEvent={fromNullableAssetEvent}
            >
              <Select aria-label={t(labelKey)} options={options} />
            </Form.Item>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editingId && (
            <Button htmlType="button" onClick={onResetToNew}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {editingId ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
