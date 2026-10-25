'use client';

import { Card, Flex, Skeleton, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { QueryError } from '@/components/query-error';
import { useGames, useTemplates } from '../api';
import { CreateGameDialog } from './create-game-dialog';
import { GameList } from './game-list';

export function GamesTab({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const { token } = theme.useToken();

  const gamesQuery = useGames(orgId, eventId);
  const templatesQuery = useTemplates();

  const templates = templatesQuery.data?.items ?? [];
  const games = gamesQuery.data?.items ?? [];

  return (
    <div data-testid="event-games-tab" className="flex flex-col gap-4">
      <Flex align="center" justify="space-between" gap={16} wrap>
        <div className="min-w-0">
          <Typography.Title level={5} className="!m-0" style={{ fontWeight: 700 }}>
            {t('games.title')}
          </Typography.Title>
          <Typography.Text type="secondary" className="mt-0.5 block" style={{ fontSize: 13 }}>
            {t('games.description')}
          </Typography.Text>
        </div>
        <CreateGameDialog orgId={orgId} eventId={eventId} templates={templates} />
      </Flex>
      {gamesQuery.isPending ? (
        <Card
          variant="borderless"
          style={{ border: `1px solid ${token.colorBorderSecondary}` }}
          styles={{ body: { padding: '14px 16px' } }}
        >
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
      ) : gamesQuery.isError ? (
        <QueryError onRetry={() => gamesQuery.refetch()} />
      ) : (
        <GameList orgId={orgId} eventId={eventId} games={games} templates={templates} />
      )}
    </div>
  );
}
