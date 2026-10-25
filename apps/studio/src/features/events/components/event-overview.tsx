'use client';

import { buildEventJoinUrl } from '@playora/contracts';
import { App, Button, Card, Empty, Flex, Input, QRCode, Skeleton, Typography, theme } from 'antd';
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
import { IconTile } from '@/components/icon-tile';
import { QueryError } from '@/components/query-error';
import { PLAY_URL } from '@/lib/env';
import { useEvent } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventOverview({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations('overview');
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const cardStyle = { border: `1px solid ${token.colorBorderSecondary}` };
  const eventQuery = useEvent(orgId, eventId);

  if (eventQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Card variant="borderless" style={cardStyle}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Card key={i} variant="borderless" style={cardStyle}>
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (eventQuery.isError) {
    return <QueryError onRetry={() => eventQuery.refetch()} />;
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
      tone: 'primary',
      href: `${base}/games`,
      testId: 'event-shortcut-games',
    },
    {
      title: t('playersShortcutTitle'),
      desc: t('playersShortcutDesc'),
      action: t('playersShortcutAction'),
      icon: Users,
      tone: 'info',
      href: `${base}/players`,
      testId: 'event-shortcut-players',
    },
    {
      title: t('prizesShortcutTitle'),
      desc: t('prizesShortcutDesc'),
      action: t('prizesShortcutAction'),
      icon: Gift,
      tone: 'warning',
      href: `${base}/prizes`,
      testId: 'event-shortcut-prizes',
    },
    {
      title: t('settingsShortcutTitle'),
      desc: t('settingsShortcutDesc'),
      action: t('settingsShortcutAction'),
      icon: Settings,
      tone: 'success',
      href: `${base}/settings`,
      testId: 'event-shortcut-settings',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Play URL and QR code */}
      <Card
        variant="borderless"
        style={cardStyle}
        title={
          <Flex align="center" gap={10}>
            <IconTile tone="primary" size={28}>
              <QrCode className="size-4" />
            </IconTile>
            <span>{t('playLinkTitle')}</span>
          </Flex>
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
                className="max-w-md font-mono"
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

          <div className="flex flex-col items-center gap-2 self-center">
            <div id="overview-qr">
              <QRCode value={joinUrl} size={144} />
            </div>
            <Button
              type="text"
              size="small"
              icon={<Download className="size-4" />}
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
          <Typography.Title level={5} className="!mb-0">
            {t('shortcutsTitle')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('shortcutsDesc')}</Typography.Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shortcuts.map(({ title, desc, action, icon: Icon, tone, href, testId }) => (
            <Card
              key={href}
              variant="borderless"
              hoverable
              style={cardStyle}
              styles={{ body: { padding: '16px 20px', height: '100%' } }}
            >
              <div className="flex h-full flex-col justify-between gap-3">
                <Flex align="flex-start" gap={14}>
                  <IconTile tone={tone}>
                    <Icon className="size-5" />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <Typography.Text strong className="block" style={{ fontSize: 15 }}>
                      {title}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className="mt-0.5 block"
                      style={{ fontSize: 13 }}
                    >
                      {desc}
                    </Typography.Text>
                  </div>
                </Flex>
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
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      className="py-16"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Flex vertical gap={4}>
            <Typography.Text strong>{t('prizesPlaceholderTitle')}</Typography.Text>
            <Typography.Text type="secondary">{t('prizesPlaceholderDesc')}</Typography.Text>
          </Flex>
        }
      />
    </Card>
  );
}
