'use client';

import type { AssetStatus, AssetSummary } from '@playora/contracts';
import { Button, Card, Divider, Flex, Popconfirm, Tag, Typography, theme } from 'antd';
import { CircleAlert, CircleCheck, Film, LoaderCircle, Music, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { formatBytes } from '../lib/asset-helpers';

interface AssetCardProps {
  asset: AssetSummary;
  isRemoving: boolean;
  onRemove: (assetId: string) => void;
}

export function AssetCard({ asset, isRemoving, onRemove }: AssetCardProps) {
  const t = useTranslations();
  const { token } = theme.useToken();

  function renderStatusTag(status: AssetStatus) {
    const tagClass = '!m-0 inline-flex shrink-0 items-center gap-1';
    if (status === 'ready')
      return (
        <Tag color="success" icon={<CircleCheck className="size-3" />} className={tagClass}>
          {t('assets.statusReady')}
        </Tag>
      );
    if (status === 'failed')
      return (
        <Tag color="error" icon={<CircleAlert className="size-3" />} className={tagClass}>
          {t('assets.statusFailed')}
        </Tag>
      );
    return (
      <Tag
        color="warning"
        icon={<LoaderCircle className="size-3 animate-spin" />}
        className={tagClass}
      >
        {t('assets.statusPending')}
      </Tag>
    );
  }

  const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
  const placeholderTile = (icon: React.ReactNode) => (
    <Flex
      align="center"
      justify="center"
      className="size-14"
      style={{ borderRadius: 12, background: token.colorInfoBg, color: token.colorInfo }}
    >
      {icon}
    </Flex>
  );

  return (
    <Card
      variant="borderless"
      className="flex flex-col overflow-hidden"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, padding: '14px 16px' } }}
      cover={
        <div
          className="flex aspect-video w-full items-center justify-center overflow-hidden"
          style={{
            backgroundColor: token.colorFillQuaternary,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {asset.kind === 'image' ? (
            // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
            <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
          ) : asset.kind === 'audio' ? (
            placeholderTile(<Music className="size-6" />)
          ) : (
            placeholderTile(<Film className="size-6" />)
          )}
        </div>
      }
    >
      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Text strong ellipsis className="min-w-0">
          {asset.mime}
        </Typography.Text>
        {renderStatusTag(asset.status)}
      </Flex>

      <Flex align="center" justify="space-between" className="mt-1">
        <Caption>{formatBytes(asset.bytes)}</Caption>
        {asset.width && asset.height && (
          <Caption>
            {asset.width}×{asset.height}
          </Caption>
        )}
      </Flex>

      <div className="mt-auto pt-1">
        <Divider size="small" />
        <Flex align="center" justify="space-between" gap={8}>
          <Flex wrap gap={4}>
            {Object.keys(asset.variants).map((key) => (
              <Tag key={key} variant="filled">
                {key}
              </Tag>
            ))}
          </Flex>

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
        </Flex>
      </div>
    </Card>
  );
}
