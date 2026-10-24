'use client';

import { Card, Skeleton, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useGames, useTemplates } from '../api';
import { CreateGameDialog } from './create-game-dialog';
import { GameList } from './game-list';

export function GamesTab({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();

  const gamesQuery = useGames(orgId, eventId);
  const templatesQuery = useTemplates();

  const templates = templatesQuery.data?.items ?? [];
  const games = gamesQuery.data?.items ?? [];

  return (
    <Card
      data-testid="event-games-tab"
      title={
        <div className="flex flex-col gap-0.5 py-1">
          <span>{t('games.title')}</span>
          <Typography.Text type="secondary" className="text-xs font-normal">
            {t('games.description')}
          </Typography.Text>
        </div>
      }
      extra={<CreateGameDialog orgId={orgId} eventId={eventId} templates={templates} />}
    >
      {gamesQuery.isPending ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : gamesQuery.isError ? (
        <Typography.Text type="danger" className="text-sm">
          {t('common.unknownError')}
        </Typography.Text>
      ) : (
        <GameList orgId={orgId} eventId={eventId} games={games} templates={templates} />
      )}
    </Card>
  );
}
