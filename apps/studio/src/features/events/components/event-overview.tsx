'use client';

import {
  buildEventJoinUrl,
  type EventSummary,
  type GameSummary,
  localize,
} from '@playora/contracts';
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  QRCode,
  Skeleton,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  PencilLine,
  QrCode,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { Checklist } from '@/components/checklist';
import { IconTile } from '@/components/icon-tile';
import { QueryError } from '@/components/query-error';
import { useGames, useTemplates } from '@/features/games/api';
import { PLAY_URL } from '@/lib/env';
import { useEvent } from '../api';

/**
 * Campaign overview (docs/16 §2, "Vận hành"): what is still missing before guests can play,
 * the game itself, and the link/QR to share. Every gap links to the place that fixes it.
 */
export function EventOverview({ orgId, eventId }: { orgId: string; eventId: string }) {
  const eventQuery = useEvent(orgId, eventId);
  const gamesQuery = useGames(orgId, eventId);

  if (eventQuery.isPending || gamesQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (eventQuery.isError) return <QueryError onRetry={() => eventQuery.refetch()} />;
  if (gamesQuery.isError) return <QueryError onRetry={() => gamesQuery.refetch()} />;

  const event = eventQuery.data;
  const games = gamesQuery.data.items;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Flex vertical gap={20} className="min-w-0">
        <Readiness orgId={orgId} event={event} games={games} />
        <GamesCard orgId={orgId} eventId={eventId} games={games} />
      </Flex>
      <ShareCard event={event} />
    </div>
  );
}

function Readiness({
  orgId,
  event,
  games,
}: {
  orgId: string;
  event: EventSummary;
  games: readonly GameSummary[];
}) {
  const t = useTranslations('overview');
  const base = `/orgs/${orgId}/events/${event.id}`;
  const firstGame = games[0];
  const editor = firstGame ? `${base}/games/${firstGame.id}` : `${base}/games`;
  const items = [
    {
      key: 'game',
      done: games.length > 0,
      title: t('ready.game'),
      description: t('ready.gameDesc'),
      href: `${base}/games`,
      action: t('ready.gameAction'),
    },
    {
      key: 'published',
      done: games.some((game) => game.currentVersion !== null),
      title: t('ready.published'),
      description: t('ready.publishedDesc'),
      href: editor,
      action: t('ready.publishedAction'),
    },
    {
      key: 'brand',
      done: event.brandKitId !== null,
      title: t('ready.brand'),
      description: t('ready.brandDesc'),
      href: `${base}/settings`,
      action: t('ready.brandAction'),
    },
    {
      key: 'schedule',
      done: Boolean(event.startsAt && event.endsAt),
      title: t('ready.schedule'),
      description: t('ready.scheduleDesc'),
      href: `${base}/settings`,
      action: t('ready.scheduleAction'),
    },
    {
      key: 'open',
      done: event.status === 'live' || event.status === 'scheduled',
      title: t('ready.open'),
      description: t('ready.openDesc'),
      href: `${base}/settings`,
      action: t('ready.openAction'),
    },
  ];
  const allDone = items.every((item) => item.done);

  return (
    <Checklist
      title={allDone ? t('ready.allDone') : t('ready.title')}
      items={items}
      testId="event-readiness"
    />
  );
}

function GamesCard({
  orgId,
  eventId,
  games,
}: {
  orgId: string;
  eventId: string;
  games: readonly GameSummary[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { token } = theme.useToken();
  const templates = useTemplates().data?.items ?? [];
  const base = `/orgs/${orgId}/events/${eventId}`;

  return (
    <Card
      variant="borderless"
      title={t('overview.gameTitle')}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      data-testid="event-overview-games"
    >
      {games.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('games.empty')}>
          <Link href={`${base}/games` as Route}>
            <Button type="primary" tabIndex={-1}>
              {t('games.addGame')}
            </Button>
          </Link>
        </Empty>
      ) : (
        <Flex vertical gap={12}>
          {games.map((game) => {
            const template = templates.find((item) => item.id === game.templateId);
            const skin = template?.skins.find((item) => item.key === game.skinKey);
            return (
              <Flex key={game.id} align="center" gap={12} wrap>
                <div className="min-w-0 flex-1">
                  <Flex align="center" gap={8} wrap>
                    <Typography.Text strong>{game.name}</Typography.Text>
                    {game.currentVersion ? (
                      <Tag
                        color="success"
                        variant="filled"
                        icon={<CircleCheck className="size-3" />}
                        className="!m-0 inline-flex items-center gap-1"
                      >
                        {t('games.publishedBadge', { version: game.currentVersion })}
                      </Tag>
                    ) : (
                      <Tag
                        variant="filled"
                        icon={<PencilLine className="size-3" />}
                        className="!m-0 inline-flex items-center gap-1"
                      >
                        {t('games.statusDraft')}
                      </Tag>
                    )}
                  </Flex>
                  <Caption>
                    {template ? localize(template.name, locale) : game.templateId}
                    {skin ? ` · ${localize(skin.name, locale)}` : ''}
                  </Caption>
                </div>
                <Link href={`${base}/games/${game.id}` as Route}>
                  <Button icon={<Pencil className="size-4" />} tabIndex={-1}>
                    {t('overview.editGame')}
                  </Button>
                </Link>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

function ShareCard({ event }: { event: EventSummary }) {
  const t = useTranslations('overview');
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const joinUrl = buildEventJoinUrl(PLAY_URL, event.slug);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      message.success(t('copied'));
    } catch {
      message.error(t('copyFailed'));
    }
  }

  function handleDownloadQr() {
    const canvas = document
      .getElementById('overview-qr')
      ?.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `${event.slug}-qr.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Card
      variant="borderless"
      title={
        <Flex align="center" gap={10}>
          <IconTile tone="primary" size={28}>
            <QrCode className="size-4" />
          </IconTile>
          <span>{t('playLinkTitle')}</span>
        </Flex>
      }
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex vertical gap={12} align="center">
        <div id="overview-qr">
          <QRCode value={joinUrl} size={168} />
        </div>
        <Caption className="text-center">{t('playLinkDesc')}</Caption>
        <Input readOnly value={joinUrl} className="font-mono" data-testid="join-url" />
        <div className="grid w-full grid-cols-2 gap-2">
          <Button icon={<Copy className="size-4" />} onClick={handleCopy}>
            {t('copyLink')}
          </Button>
          <Button icon={<Download className="size-4" />} onClick={handleDownloadQr}>
            {t('downloadQr')}
          </Button>
        </div>
        <Button
          block
          type="link"
          icon={<ExternalLink className="size-4" />}
          href={joinUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('openPlay')}
        </Button>
      </Flex>
    </Card>
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
