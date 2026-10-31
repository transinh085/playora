'use client';

import type { AssetStatus, AssetSummary } from '@playora/contracts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent } from '@playora/ui/components/card';
import { Separator } from '@playora/ui/components/separator';
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

  function renderStatusTag(status: AssetStatus) {
    if (status === 'ready') {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
        >
          <CircleCheck className="size-3" />
          {t('assets.statusReady')}
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1">
          <CircleAlert className="size-3" />
          {t('assets.statusFailed')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <LoaderCircle className="size-3 animate-spin" />
        {t('assets.statusPending')}
      </Badge>
    );
  }

  const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
  const placeholderTile = (icon: React.ReactNode) => (
    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      {icon}
    </div>
  );

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border">
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden border-b bg-muted/30">
        {asset.kind === 'image' ? (
          // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
          <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
        ) : asset.kind === 'audio' ? (
          placeholderTile(<Music className="size-6" />)
        ) : (
          placeholderTile(<Film className="size-6" />)
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{asset.mime}</span>
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
          <Separator className="my-2.5" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {Object.keys(asset.variants).map((key) => (
                <Badge key={key} variant="secondary" className="text-[10px] font-normal">
                  {key}
                </Badge>
              ))}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('common.delete')}
                  disabled={isRemoving}
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('assets.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('common.delete')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onRemove(asset.id)}
                  >
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
