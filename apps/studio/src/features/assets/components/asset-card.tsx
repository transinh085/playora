'use client';

import type { AssetStatus, AssetSummary } from '@playora/contracts';
import { AlertDialog, Button, Card, Chip, Separator } from '@playora/ui/components';
import { CircleAlert, CircleCheck, Film, LoaderCircle, Music, Trash2 } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { formatBytes } from '../lib/asset-helpers';

interface AssetCardProps {
  asset: AssetSummary;
  isRemoving: boolean;
  onRemove: (assetId: string) => void;
}

const KNOWN_VARIANT_KEYS = new Set(['w320', 'w1280', 'cropped']);

export function AssetCard({ asset, isRemoving, onRemove }: AssetCardProps) {
  const t = useTranslations();

  function renderStatusTag(status: AssetStatus) {
    if (status === 'ready') {
      return (
        <Chip variant="soft" color="success" size="sm" className="gap-1">
          <CircleCheck className="size-3" />
          {t('assets.statusReady')}
        </Chip>
      );
    }
    if (status === 'failed') {
      return (
        <Chip variant="soft" color="danger" size="sm" className="gap-1">
          <CircleAlert className="size-3" />
          {t('assets.statusFailed')}
        </Chip>
      );
    }
    return (
      <Chip variant="soft" color="default" size="sm" className="gap-1">
        <LoaderCircle className="size-3 animate-spin" />
        {t('assets.statusPending')}
      </Chip>
    );
  }

  function renderVariantLabel(key: string) {
    if (KNOWN_VARIANT_KEYS.has(key)) {
      return t(`assets.variantLabels.${key as 'w320' | 'w1280' | 'cropped'}`);
    }
    return key;
  }

  const displayName = asset.filename || asset.mime;
  const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
  const placeholderTile = (icon: React.ReactNode) => (
    <div className="flex size-12 items-center justify-center rounded-xl bg-background-secondary-default text-text-secondary">
      {icon}
    </div>
  );

  return (
    <Card className="flex flex-col overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden border-b border-border-button-default bg-background-secondary-default">
        {asset.kind === 'image' ? (
          // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
          <img src={thumbUrl} alt={displayName} className="size-full object-cover" />
        ) : asset.kind === 'audio' ? (
          placeholderTile(<Music className="size-5" />)
        ) : (
          placeholderTile(<Film className="size-5" />)
        )}
      </div>

      <Card.Content className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-caption-1-semibold text-text-primary" title={displayName}>
            {displayName}
          </span>
          {renderStatusTag(asset.status)}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <Caption>{formatBytes(asset.bytes)}</Caption>
          {asset.width && asset.height ? (
            <Caption>
              {asset.width}×{asset.height}
            </Caption>
          ) : (
            <Caption>{asset.mime}</Caption>
          )}
        </div>

        <Card.Footer className="mt-auto flex flex-col items-stretch p-0 pt-2">
          <Separator className="my-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {Object.keys(asset.variants).map((key) => (
                <Chip key={key} variant="soft" color="default" size="sm">
                  {renderVariantLabel(key)}
                </Chip>
              ))}
            </div>

            <AlertDialog>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                className="text-text-error-primary"
                aria-label={t('common.delete')}
                isDisabled={isRemoving}
              >
                <Trash2 className="size-4" />
              </Button>
              <AlertDialog.Backdrop isDismissable>
                <AlertDialog.Container size="sm">
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>{t('assets.deleteConfirm')}</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p className="text-body-2-regular text-text-secondary">
                        {t('assets.deleteConfirmDescription', { name: displayName })}
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="secondary" size="sm">
                        {t('common.cancel')}
                      </Button>
                      <Button
                        slot="close"
                        variant="danger"
                        size="sm"
                        onPress={() => onRemove(asset.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </div>
        </Card.Footer>
      </Card.Content>
    </Card>
  );
}
