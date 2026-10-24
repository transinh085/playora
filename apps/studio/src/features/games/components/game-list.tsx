'use client';

import {
  type ErrorCode,
  type GameSummary,
  localize,
  type TemplateSummary,
} from '@playora/contracts';
import { App, Button, Empty, Tag, Typography } from 'antd';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRemoveGame, useReorderGames } from '../api';

export function GameList({
  orgId,
  eventId,
  games,
  templates,
}: {
  orgId: string;
  eventId: string;
  games: readonly GameSummary[];
  templates: readonly TemplateSummary[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { message } = App.useApp();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const reorderMutation = useReorderGames({
    onSuccess: () => {
      message.success(t('games.reordered'));
    },
    onError: (err) => message.error(messageFor(err.code)),
  });

  const removeMutation = useRemoveGame({
    onSuccess: () => {
      message.success(t('games.deleted'));
    },
    onError: (err) => message.error(messageFor(err.code)),
  });

  function moveGame(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= games.length) return;
    const nextIds = games.map((g) => g.id);
    const [moved] = nextIds.splice(index, 1);
    if (!moved) return;
    nextIds.splice(targetIndex, 0, moved);
    reorderMutation.mutate({
      params: { orgId, eventId },
      body: { gameIds: nextIds },
    });
  }

  function handleDrop(targetGameId: string) {
    if (!draggedId || draggedId === targetGameId) {
      setDraggedId(null);
      return;
    }
    const fromIndex = games.findIndex((g) => g.id === draggedId);
    const toIndex = games.findIndex((g) => g.id === targetGameId);
    setDraggedId(null);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = games.map((g) => g.id);
    const [moved] = nextIds.splice(fromIndex, 1);
    if (!moved) return;
    nextIds.splice(toIndex, 0, moved);
    reorderMutation.mutate({
      params: { orgId, eventId },
      body: { gameIds: nextIds },
    });
  }

  if (games.length === 0) {
    return (
      <div
        data-testid="games-empty-state"
        className="rounded-lg border border-dashed border-[var(--ant-color-border)] p-8 text-center"
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('games.empty')} />
      </div>
    );
  }

  return (
    <div className="grid gap-2" data-testid="games-list">
      {games.map((game, idx) => {
        const tpl = templates.find((item) => item.id === game.templateId);
        const skinObj = tpl?.skins.find((s) => s.key === game.skinKey);
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: HTML5 drag-and-drop row; keyboard reorder uses the explicit Up/Down buttons
          <div
            key={game.id}
            draggable
            onDragStart={() => setDraggedId(game.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(game.id)}
            data-testid={`game-row-${game.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-3 transition hover:border-[var(--ant-color-primary-border)]"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="size-4 cursor-grab text-[var(--ant-color-text-tertiary)]" />
              <Tag variant="filled" className="!m-0 font-mono text-xs">
                #{idx + 1}
              </Tag>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/orgs/${orgId}/events/${eventId}/games/${game.id}` as Route}
                    className="font-medium text-[var(--ant-color-text)] hover:underline"
                    data-testid={`game-link-${game.id}`}
                  >
                    {game.name}
                  </Link>
                  {game.currentVersion ? (
                    <Tag color="success" variant="filled" data-testid={`game-status-${game.id}`}>
                      {t('games.publishedBadge', { version: game.currentVersion })}
                    </Tag>
                  ) : (
                    <Tag variant="filled" data-testid={`game-status-${game.id}`}>
                      {t('games.statusDraft')}
                    </Tag>
                  )}
                </div>
                <Typography.Text type="secondary" className="text-xs">
                  {tpl ? localize(tpl.name, locale) : game.templateId}
                  {skinObj ? ` · ${localize(skinObj.name, locale)}` : ''}
                </Typography.Text>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="text"
                size="small"
                icon={<ArrowUp className="size-4" />}
                aria-label={t('games.moveUp')}
                data-testid={`game-move-up-${game.id}`}
                disabled={idx === 0 || reorderMutation.isPending}
                onClick={() => moveGame(idx, -1)}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDown className="size-4" />}
                aria-label={t('games.moveDown')}
                data-testid={`game-move-down-${game.id}`}
                disabled={idx === games.length - 1 || reorderMutation.isPending}
                onClick={() => moveGame(idx, 1)}
              />
              <Link
                href={`/orgs/${orgId}/events/${eventId}/games/${game.id}` as Route}
                data-testid={`game-edit-${game.id}`}
              >
                <Button size="small" icon={<Pencil className="size-3.5" />}>
                  {t('games.editGame')}
                </Button>
              </Link>
              <Button
                type="text"
                danger
                size="small"
                icon={<Trash2 className="size-4" />}
                aria-label={t('games.deleteGame')}
                data-testid={`game-delete-${game.id}`}
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate({ params: { orgId, gameId: game.id } })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
