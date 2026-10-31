'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type AssetSummary,
  type BrandKitSummary,
  CreateBrandKitBody,
  type ErrorCode,
} from '@playora/contracts';
import { Form } from '@playora/ui/components/form';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import { applyApiErrorToRHF } from '@playora/ui/form';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { QueryError } from '@/components/query-error';
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const kitsQuery = useBrandKits(orgId, 50);
  const assetsQuery = useAssets(orgId, { limit: 100 });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const remove = useRemoveBrandKit({
    onSuccess: () => {
      toast.success(t('brandKits.deleted'));
      if (editingId) {
        setEditingId(null);
      }
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  if (kitsQuery.isPending || assetsQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (kitsQuery.isError) {
    return <QueryError onRetry={() => kitsQuery.refetch()} />;
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

  const initialValues = useMemo<BrandKitFormValues>(
    () => (kit ? toBrandKitFormValues(kit) : DEFAULT_BRAND_KIT_VALUES),
    [kit],
  );

  const form = useForm<BrandKitFormValues>({
    resolver: zodResolver(CreateBrandKitBody),
    defaultValues: initialValues,
  });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const create = useCreateBrandKit({
    onSuccess: (created) => {
      toast.success(t('brandKits.created', { name: created.name }));
      form.reset(DEFAULT_BRAND_KIT_VALUES);
    },
    onError: (err) => {
      if (!applyApiErrorToRHF(form.setError, err, messageFor)) {
        toast.error(messageFor(err.code));
      }
    },
  });

  const update = useUpdateBrandKit({
    onSuccess: (updated) => {
      toast.success(t('brandKits.updated', { name: updated.name }));
      onResetToNew();
    },
    onError: (err) => {
      if (!applyApiErrorToRHF(form.setError, err, messageFor)) {
        toast.error(messageFor(err.code));
      }
    },
  });

  function handleSubmit(values: BrandKitFormValues) {
    const body = CreateBrandKitBody.parse(values);
    if (kit) {
      update.mutate({ params: { orgId, brandKitId: kit.id }, body });
    } else {
      create.mutate({ params: { orgId }, body });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <BrandKitEditorCard
              form={form}
              editingId={kit?.id ?? null}
              imageAssets={imageAssets}
              audioAssets={audioAssets}
              isSubmitting={create.isPending || update.isPending}
              onResetToNew={onResetToNew}
            />

            <BrandKitList
              items={kits}
              isRemoving={isRemoving}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          </div>

          <BrandKitPreviewCard
            control={form.control}
            initialValues={initialValues}
            imageAssets={imageAssets}
          />
        </div>
      </form>
    </Form>
  );
}
