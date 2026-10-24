'use client';

import type { AssetStatus, AssetSummary } from '@playora/contracts';
import { Button, Card, Popconfirm, Tag } from 'antd';
import { Film, Music, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatBytes } from '../lib/asset-helpers';

interface AssetCardProps {
  asset: AssetSummary;
  isRemoving: boolean;
  onRemove: (assetId: string) => void;
}

export function AssetCard({ asset, isRemoving, onRemove }: AssetCardProps) {
  const t = useTranslations();

  function renderStatusTag(status: AssetStatus) {
    if (status === 'ready') return <Tag color="success">{t('assets.statusReady')}</Tag>;
    if (status === 'failed') return <Tag color="error">{t('assets.statusFailed')}</Tag>;
    return <Tag color="warning">{t('assets.statusPending')}</Tag>;
  }

  const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;

  return (
    <Card
      hoverable
      className="flex flex-col overflow-hidden"
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', flex: 1 } }}
      cover={
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-[var(--ant-color-fill-secondary)]">
          {asset.kind === 'image' ? (
            // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
            <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
          ) : asset.kind === 'audio' ? (
            <Music className="size-10 text-[var(--ant-color-text-tertiary)]" />
          ) : (
            <Film className="size-10 text-[var(--ant-color-text-tertiary)]" />
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-[var(--ant-color-text)]">
          {asset.mime}
        </span>
        {renderStatusTag(asset.status)}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-[var(--ant-color-text-secondary)]">
        <span>{formatBytes(asset.bytes)}</span>
        {asset.width && asset.height && (
          <span>
            {asset.width}×{asset.height}
          </span>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between border-t border-[var(--ant-color-border-secondary)] pt-3">
          <div className="flex flex-wrap gap-1">
            {Object.keys(asset.variants).map((key) => (
              <Tag key={key} bordered={false}>
                {key}
              </Tag>
            ))}
          </div>

          <Popconfirm
            title={t('assets.deleteConfirm')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => onRemove(asset.id)}
            disabled={isRemoving}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 className="size-4" />}
              aria-label={t('common.delete')}
              disabled={isRemoving}
            />
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
}
