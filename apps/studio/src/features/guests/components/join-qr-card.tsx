'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { buildEventJoinUrl, JoinQrFormValues } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { Copy, Download, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_URL ?? 'http://localhost:3002';

type Values = z.input<typeof JoinQrFormValues>;

export function JoinQrCard({ slug }: { slug: string }) {
  const t = useTranslations('guests');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const form = useForm<Values>({
    resolver: zodResolver(JoinQrFormValues),
    defaultValues: { zone: '' },
  });

  const zone = form.watch('zone');
  const joinUrl = buildEventJoinUrl(PLAY_URL, slug, zone);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(joinUrl, { width: 320, margin: 2 }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [joinUrl]);

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    toast.success(t('linkCopied'));
  }

  const downloadName = zone?.trim() ? `${slug}-${zone.trim()}-qr.png` : `${slug}-qr.png`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4" />
          {t('qrTitle')}
        </CardTitle>
        <CardDescription>{t('qrDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="bg-background flex size-36 items-center justify-center rounded-lg border p-2">
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: Data URL generated client-side for QR download
            <img src={qrDataUrl} alt={joinUrl} className="size-32" />
          ) : (
            <QrCode className="text-muted-foreground size-10" />
          )}
        </div>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="qr-zone">{t('qrZoneLabel')}</Label>
            <Input id="qr-zone" placeholder={t('qrZonePlaceholder')} {...form.register('zone')} />
          </div>
          <p className="text-muted-foreground truncate font-mono text-xs" data-testid="join-url">
            {joinUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              <Copy />
              {t('copyLink')}
            </Button>
            {qrDataUrl && (
              <Button asChild variant="secondary" size="sm">
                <a href={qrDataUrl} download={downloadName}>
                  <Download />
                  {t('downloadPng')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
