'use client';

import {
  type AssetCropRect,
  type AssetKind,
  type AssetStatus,
  assetsApi,
  type ErrorCode,
} from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardFooter } from '@playora/ui/components/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Skeleton } from '@playora/ui/components/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@playora/ui/components/tabs';
import { Film, Music, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAssets, useInvalidateAssets, useRemoveAsset } from '../api';

type FilterKind = 'all' | AssetKind;
type CropPreset = 'none' | '1:1' | '16:9';

function detectKind(mime: string): AssetKind {
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'image';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function computeImageCrop(
  file: File,
  preset: CropPreset,
): Promise<AssetCropRect | undefined> {
  if (preset === 'none' || !file.type.startsWith('image/')) return undefined;
  const objectUrl = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = objectUrl;
    });
    const ratio = preset === '1:1' ? 1 : 16 / 9;
    let w = dims.width;
    let h = Math.round(w / ratio);
    if (h > dims.height) {
      h = dims.height;
      w = Math.round(h * ratio);
    }
    const x = Math.max(0, Math.floor((dims.width - w) / 2));
    const y = Math.max(0, Math.floor((dims.height - h) / 2));
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function uploadWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

export function AssetsManager({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const invalidateAssets = useInvalidateAssets();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

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

  function statusBadge(status: AssetStatus) {
    if (status === 'ready') return <Badge variant="success">{t('assets.statusReady')}</Badge>;
    if (status === 'failed') return <Badge variant="destructive">{t('assets.statusFailed')}</Badge>;
    return <Badge variant="warning">{t('assets.statusPending')}</Badge>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKind)}>
          <TabsList>
            <TabsTrigger value="all">{t('assets.filterAll')}</TabsTrigger>
            <TabsTrigger value="image">{t('assets.filterImage')}</TabsTrigger>
            <TabsTrigger value="audio">{t('assets.filterAudio')}</TabsTrigger>
            <TabsTrigger value="video">{t('assets.filterVideo')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <Select value={cropPreset} onValueChange={(v) => setCropPreset(v as CropPreset)}>
            <SelectTrigger aria-label={t('assets.cropTitle')} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('assets.cropNone')}</SelectItem>
              <SelectItem value="1:1">{t('assets.cropSquare')}</SelectItem>
              <SelectItem value="16:9">{t('assets.cropWide')}</SelectItem>
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,audio/*,video/mp4,video/webm"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null}>
            <Upload />
            {uploadProgress !== null
              ? t('assets.uploading', { progress: uploadProgress })
              : t('assets.upload')}
          </Button>
        </div>
      </div>

      {uploadProgress !== null && (
        <div
          role="progressbar"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-muted h-2 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">{t('common.unknownError')}</span>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center">
          {t('assets.empty')}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {query.data.items.map((asset) => {
            const thumbUrl = asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
            return (
              <Card key={asset.id} className="overflow-hidden py-0">
                <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
                  {asset.kind === 'image' ? (
                    // biome-ignore lint/performance/noImgElement: presigned S3 URLs are dynamic
                    <img src={thumbUrl} alt={asset.id} className="size-full object-cover" />
                  ) : asset.kind === 'audio' ? (
                    <Music className="text-muted-foreground size-10" />
                  ) : (
                    <Film className="text-muted-foreground size-10" />
                  )}
                </div>
                <CardContent className="grid gap-2 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{asset.mime}</span>
                    {statusBadge(asset.status)}
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>{formatBytes(asset.bytes)}</span>
                    {asset.width && asset.height && (
                      <span>
                        {asset.width}×{asset.height}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t py-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(asset.variants).map((key) => (
                      <Badge key={key} variant="outline">
                        {key}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ params: { orgId, assetId: asset.id } })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
