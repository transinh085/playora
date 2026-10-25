'use client';

import { buildEventJoinUrl } from '@playora/contracts';
import { App, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { Copy, Download, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_URL ?? 'http://localhost:3002';

export function JoinQrCard({ slug }: { slug: string }) {
  const t = useTranslations('guests');
  const { message } = App.useApp();
  const [zone, setZone] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const joinUrl = buildEventJoinUrl(PLAY_URL, slug, zone);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(joinUrl, { width: 320, margin: 2 })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [joinUrl]);

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    message.success(t('linkCopied'));
  }

  const downloadName = zone.trim() ? `${slug}-${zone.trim()}-qr.png` : `${slug}-qr.png`;

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <QrCode className="size-4" />
          <span>{t('qrTitle')}</span>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary">{t('qrDescription')}</Typography.Paragraph>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex size-36 items-center justify-center rounded-lg border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-2">
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: Data URL generated client-side for QR download
            <img src={qrDataUrl} alt={joinUrl} className="size-32" />
          ) : (
            <QrCode className="size-10 text-[var(--ant-color-text-tertiary)]" />
          )}
        </div>
        <div className="grid gap-3">
          <Form layout="vertical" className="!mb-0">
            <Form.Item label={t('qrZoneLabel')} htmlFor="qr-zone" className="!mb-0">
              <Input
                id="qr-zone"
                placeholder={t('qrZonePlaceholder')}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              />
            </Form.Item>
          </Form>
          <Typography.Text type="secondary" ellipsis className="font-mono" data-testid="join-url">
            {joinUrl}
          </Typography.Text>
          <Flex wrap gap={8}>
            <Button icon={<Copy className="size-4" />} onClick={copyLink}>
              {t('copyLink')}
            </Button>
            {qrDataUrl && (
              <Button
                icon={<Download className="size-4" />}
                href={qrDataUrl}
                download={downloadName}
              >
                {t('downloadPng')}
              </Button>
            )}
          </Flex>
        </div>
      </div>
    </Card>
  );
}
