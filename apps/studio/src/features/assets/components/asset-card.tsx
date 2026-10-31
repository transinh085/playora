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
    <div className="flex size-12 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
      {icon}
    </div>
  );

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden border-b border-neutral-200 bg-neutral-50/50 dark:border-white/10 dark:bg-white/[0.02]">
        {asset.kind === 'image' ? (
          // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
          <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
        ) : asset.kind === 'audio' ? (
          placeholderTile(<Music className="size-5" />)
        ) : (
          placeholderTile(<Film className="size-5" />)
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {asset.mime}
          </span>
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
          <Separator className="my-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {Object.keys(asset.variants).map((key) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="rounded-sm px-1.5 py-0 text-[10px] font-normal"
                >
                  {key}
                </Badge>
              ))}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('common.delete')}
                  disabled={isRemoving}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-semibold">
                    {t('assets.deleteConfirm')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('common.delete')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                  <AlertDialogCancel className="h-8 rounded-md text-xs">
                    {t('common.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="h-8 rounded-md bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90"
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
