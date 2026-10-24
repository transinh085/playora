'use client';

import {
  type AssetSummary,
  type BrandKitSummary,
  CreateBrandKitBody,
  type ErrorCode,
} from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import { App, Button, Form, Skeleton, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useAssets } from '@/features/assets/api';
import { useBrandKits, useCreateBrandKit, useRemoveBrandKit, useUpdateBrandKit } from '../api';
import {
  BrandKitEditorCard,
  type BrandKitFormValues,
  DEFAULT_BRAND_KIT_VALUES,
  toBrandKitFormValues,
} from './brand-kit-editor-card';
import { BrandKitList } from './brand-kit-list';
import { BrandKitPreviewCard } from './brand-kit-preview-card';

export function BrandKitsManager({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [editingId, setEditingId] = useState<string | null>(null);

  const kitsQuery = useBrandKits(orgId, 50);
  const assetsQuery = useAssets(orgId, { limit: 100 });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const remove = useRemoveBrandKit({
    onSuccess: () => {
      message.success(t('brandKits.deleted'));
      if (editingId) {
        setEditingId(null);
      }
    },
    onError: (err) => message.error(messageFor(err.code)),
  });

  if (kitsQuery.isPending || assetsQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (kitsQuery.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Typography.Text type="danger">{t('common.unknownError')}</Typography.Text>
        <Button size="small" onClick={() => kitsQuery.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const kits = kitsQuery.data?.items ?? [];
  const kit = editingId ? (kits.find((k) => k.id === editingId) ?? null) : null;
  const assets = assetsQuery.data?.items ?? [];
  const imageAssets = assets.filter((a) => a.kind === 'image');
  const audioAssets = assets.filter((a) => a.kind === 'audio');

  return (
    <BrandKitsManagerInner
      key={kit?.id ?? 'new'}
      orgId={orgId}
      kit={kit}
      kits={kits}
      imageAssets={imageAssets}
      audioAssets={audioAssets}
      isRemoving={remove.isPending}
      onEdit={(nextKit) => setEditingId(nextKit.id)}
      onResetToNew={() => setEditingId(null)}
      onRemove={(brandKitId) => remove.mutate({ params: { orgId, brandKitId } })}
    />
  );
}

export function BrandKitsManagerInner({
  orgId,
  kit,
  kits,
  imageAssets,
  audioAssets,
  isRemoving,
  onEdit,
  onResetToNew,
  onRemove,
}: {
  orgId: string;
  kit: BrandKitSummary | null;
  kits: BrandKitSummary[];
  imageAssets: AssetSummary[];
  audioAssets: AssetSummary[];
  isRemoving: boolean;
  onEdit: (kit: BrandKitSummary) => void;
  onResetToNew: () => void;
  onRemove: (brandKitId: string) => void;
}) {
  const t = useTranslations();
  const { message } = App.useApp();

  const { form, rules, parse } = useZodForm(CreateBrandKitBody);

  const initialValues = useMemo<BrandKitFormValues>(
    () => (kit ? toBrandKitFormValues(kit) : DEFAULT_BRAND_KIT_VALUES),
    [kit],
  );

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const create = useCreateBrandKit({
    onSuccess: (created) => {
      message.success(t('brandKits.created', { name: created.name }));
      form.resetFields();
    },
    onError: (err) => {
      if (!applyApiError(form, err, messageFor)) {
        message.error(messageFor(err.code));
      }
    },
  });

  const update = useUpdateBrandKit({
    onSuccess: (updated) => {
      message.success(t('brandKits.updated', { name: updated.name }));
      onResetToNew();
    },
    onError: (err) => {
      if (!applyApiError(form, err, messageFor)) {
        message.error(messageFor(err.code));
      }
    },
  });

  function handleSubmit(values: BrandKitFormValues) {
    const body = parse(values);
    if (kit) {
      update.mutate({ params: { orgId, brandKitId: kit.id }, body });
    } else {
      create.mutate({ params: { orgId }, body });
    }
  }

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <BrandKitEditorCard
            rules={rules}
            editingId={kit?.id ?? null}
            imageAssets={imageAssets}
            audioAssets={audioAssets}
            isSubmitting={create.isPending || update.isPending}
            onResetToNew={onResetToNew}
          />

          <BrandKitList items={kits} isRemoving={isRemoving} onEdit={onEdit} onRemove={onRemove} />
        </div>

        <BrandKitPreviewCard form={form} initialValues={initialValues} imageAssets={imageAssets} />
      </div>
    </Form>
  );
}
