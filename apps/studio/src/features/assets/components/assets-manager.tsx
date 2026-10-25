'use client';

import { assetsApi, type ErrorCode } from '@playora/contracts';
import { App, Card, Empty, Skeleton, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const cardStyle = { border: `1px solid ${token.colorBorderSecondary}` };
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
      message.success(t('assets.deleted'));
    },
    onError: (err) => message.error(t(`errors.${err.code}`)),
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
      message.success(t('assets.uploaded'));
    } catch (err) {
      const code = (err as { code?: ErrorCode })?.code;
      message.error(code ? t(`errors.${code}`) : t('common.unknownError'));
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
            <Card key={i} variant="borderless" style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Skeleton.Node active className="!h-40 !w-full" />
              <div className="px-4 py-3.5">
                <Skeleton active title={false} paragraph={{ rows: 2 }} />
              </div>
            </Card>
          ))}
        </div>
      ) : query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <Card variant="borderless" style={cardStyle}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('assets.empty')} />
        </Card>
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
