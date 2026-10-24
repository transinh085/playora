'use client';

import { buildEventJoinUrl } from '@playora/contracts';
import { App, Button, Card, Empty, Input, QRCode, Skeleton, Typography } from 'antd';
import {
  Copy,
  Download,
  ExternalLink,
  Gamepad2,
  Gift,
  QrCode,
  Settings,
  Users,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PLAY_URL } from '@/lib/env';
import { useEvent } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventOverview({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations('overview');
  const tCommon = useTranslations('common');
  const { message } = App.useApp();
  const eventQuery = useEvent(orgId, eventId);

  if (eventQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Card key={i}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (eventQuery.isError) {
    return (
      <Typography.Text type="danger" className="text-sm">
        {tCommon('unknownError')}
      </Typography.Text>
    );
  }

  const event = eventQuery.data;
  const joinUrl = buildEventJoinUrl(PLAY_URL, event.slug);
  const base = `/orgs/${orgId}/events/${eventId}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    message.success(t('copied'));
  }

  function handleDownloadQr() {
    const canvas = document
      .getElementById('overview-qr')
      ?.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `${event.slug}-qr.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const shortcuts = [
    {
      title: t('gamesShortcutTitle'),
      desc: t('gamesShortcutDesc'),
      action: t('gamesShortcutAction'),
      icon: Gamepad2,
      href: `${base}/games`,
      testId: 'event-shortcut-games',
    },
    {
      title: t('playersShortcutTitle'),
      desc: t('playersShortcutDesc'),
      action: t('playersShortcutAction'),
      icon: Users,
      href: `${base}/players`,
      testId: 'event-shortcut-players',
    },
    {
      title: t('prizesShortcutTitle'),
      desc: t('prizesShortcutDesc'),
      action: t('prizesShortcutAction'),
      icon: Gift,
      href: `${base}/prizes`,
      testId: 'event-shortcut-prizes',
    },
    {
      title: t('settingsShortcutTitle'),
      desc: t('settingsShortcutDesc'),
      action: t('settingsShortcutAction'),
      icon: Settings,
      href: `${base}/settings`,
      testId: 'event-shortcut-settings',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Play URL and QR code */}
      <Card
        title={
          <div className="flex items-center gap-2 py-1">
            <QrCode className="size-5 text-[var(--ant-color-primary)]" />
            <span>{t('playLinkTitle')}</span>
          </div>
        }
        extra={<EventStatusBadge status={event.status} />}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-4">
            <Typography.Text type="secondary">{t('playLinkDesc')}</Typography.Text>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                readOnly
                value={joinUrl}
                className="max-w-md font-mono text-sm"
                data-testid="join-url"
              />
              <Button icon={<Copy className="size-4" />} onClick={handleCopy}>
                {t('copyLink')}
              </Button>
              <Button
                icon={<ExternalLink className="size-4" />}
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('openPlay')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 self-center rounded-lg border border-[var(--ant-color-border-secondary)] p-3">
            <div id="overview-qr">
              <QRCode value={joinUrl} size={144} bordered={false} />
            </div>
            <Button
              type="text"
              size="small"
              icon={<Download className="size-3.5" />}
              onClick={handleDownloadQr}
            >
              {t('downloadQr')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Shortcuts */}
      <div>
        <div className="mb-3">
          <Typography.Title level={4} className="!mb-0">
            {t('shortcutsTitle')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm">
            {t('shortcutsDesc')}
          </Typography.Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shortcuts.map(({ title, desc, action, icon: Icon, href, testId }) => (
            <Card key={href} hoverable className="transition-shadow">
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--ant-color-primary-bg)] p-2 text-[var(--ant-color-primary)]">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Typography.Text strong className="text-base">
                      {title}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="text-sm">
                      {desc}
                    </Typography.Text>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link href={href as Route} data-testid={testId}>
                    <Button type="link" className="!px-0">
                      {action} →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EventPrizesPlaceholder() {
  const t = useTranslations('overview');

  return (
    <Card className="py-16 text-center">
      <Empty
        image={<Gift className="mx-auto size-12 text-[var(--ant-color-text-tertiary)]" />}
        description={
          <div className="flex flex-col gap-1">
            <Typography.Text strong className="text-base">
              {t('prizesPlaceholderTitle')}
            </Typography.Text>
            <Typography.Text type="secondary">{t('prizesPlaceholderDesc')}</Typography.Text>
          </div>
        }
      />
    </Card>
  );
}
