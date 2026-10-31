'use client';

import type { AssetStatus, AssetSummary } from '@playora/contracts';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Divider } from '@playora/ui/components/base/divider/divider';
import { AlertDialog, ModalTrigger } from '@playora/ui/components/base/modal/modal';
import { CircleAlert, CircleCheck, Film, LoaderCircle, Music, Trash2 } from '@playora/ui/icons';
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

  function renderStatusTag(status: AssetStatus) {
    if (status === 'ready') {
      return (
        <Chip variant="subtle" color="lime" className="gap-1">
          <CircleCheck className="size-3" />
          {t('assets.statusReady')}
        </Chip>
      );
    }
    if (status === 'failed') {
      return (
        <Chip variant="subtle" color="rose" className="gap-1">
          <CircleAlert className="size-3" />
          {t('assets.statusFailed')}
        </Chip>
      );
    }
    return (
      <Chip variant="subtle" color="neutral" className="gap-1">
        <LoaderCircle className="size-3 animate-spin" />
        {t('assets.statusPending')}
      </Chip>
    );
  }

  const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
  const placeholderTile = (icon: React.ReactNode) => (
    <div className="flex size-12 items-center justify-center rounded-xl bg-background-secondary-default text-text-secondary">
      {icon}
    </div>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden border-b border-border-button-default bg-background-secondary-default">
        {asset.kind === 'image' ? (
          // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
          <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
        ) : asset.kind === 'audio' ? (
          placeholderTile(<Music className="size-5" />)
        ) : (
          placeholderTile(<Film className="size-5" />)
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-text-primary">{asset.mime}</span>
          {renderStatusTag(asset.status)}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <Caption>{formatBytes(asset.bytes)}</Caption>
          {asset.width && asset.height && (
            <Caption>
              {asset.width}×{asset.height}
            </Caption>
          )}
        </div>

        <div className="mt-auto pt-2">
          <Divider className="my-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {Object.keys(asset.variants).map((key) => (
                <Chip key={key} variant="caption" color="neutral">
                  {key}
                </Chip>
              ))}
            </div>

            <ModalTrigger>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leadingIcon={Trash2}
                className="text-text-error-primary"
                aria-label={t('common.delete')}
                disabled={isRemoving}
              />
              <AlertDialog
                title={t('assets.deleteConfirm')}
                description={t('common.delete')}
                variant="danger"
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={() => onRemove(asset.id)}
              />
            </ModalTrigger>
          </div>
        </div>
      </div>
    </div>
  );
}
