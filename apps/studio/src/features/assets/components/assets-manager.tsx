'use client';

import { assetsApi, type ErrorCode } from '@playora/contracts';
import { Card } from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import { ImageIcon } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { api } from '@/lib/api';
import { useAssets, useInvalidateAssets, useRemoveAsset } from '../api';
import {
  type CropPreset,
  computeImageCrop,
  detectKind,
  type FilterKind,
  uploadWithProgress,
} from '../lib/asset-helpers';
import { AssetCard } from './asset-card';
import { AssetUploadToolbar } from './asset-upload-toolbar';

export function AssetsManager({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const invalidateAssets = useInvalidateAssets();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [cropPreset, setCropPreset] = useState<CropPreset>('none');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const query = useAssets(orgId, {
    limit: 50,
    ...(filter !== 'all' && { kind: filter }),
  });

  const remove = useRemoveAsset({
    onSuccess: () => {
      toast.success(t('assets.deleted'));
    },
    onError: (err) => toast.error(t(`errors.${err.code}`)),
  });

  async function handleUpload(file: File) {
    setUploadProgress(0);
    try {
      const kind = detectKind(file.type);
      const crop = await computeImageCrop(file, cropPreset);
      const ticket = await api.call(assetsApi.createUpload, {
        params: { orgId },
        body: {
          kind,
          mime: file.type,
          bytes: file.size,
          filename: file.name,
        },
      });
      await uploadWithProgress(ticket.uploadUrl, ticket.headers, file, setUploadProgress);
      await api.call(assetsApi.completeUpload, {
        params: { orgId, assetId: ticket.assetId },
        body: { crop },
      });
      await invalidateAssets();
      toast.success(t('assets.uploaded'));
    } catch (err) {
      const code = (err as { code?: ErrorCode })?.code;
      toast.error(code ? t(`errors.${code}`) : t('common.unknownError'));
    } finally {
      setUploadProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AssetUploadToolbar
        filter={filter}
        onFilterChange={setFilter}
        cropPreset={cropPreset}
        onCropPresetChange={setCropPreset}
        uploadProgress={uploadProgress}
        onUpload={handleUpload}
      />

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
            >
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState icon={ImageIcon} title={t('assets.empty')} description={t('assets.subtitle')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {query.data.items.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isRemoving={remove.isPending}
              onRemove={(assetId) => remove.mutate({ params: { orgId, assetId } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
