'use client';

import {
  type ErrorCode,
  type GameSummary,
  localize,
  type TemplateSummary,
} from '@playora/contracts';
import { App, Button, Card, Empty, Tag, Typography, theme } from 'antd';
import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  FerrisWheel,
  Gamepad2,
  Gift,
  GripVertical,
  type LucideIcon,
  Pencil,
  PencilLine,
  ShoppingBasket,
  Ticket,
  Trash2,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile, type Tone } from '@/components/icon-tile';
import { useRemoveGame, useReorderGames } from '../api';

/** Icon + tile tone per template, so each game row is recognisable at a glance. */
const TEMPLATE_VISUALS: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'spin-wheel': { icon: FerrisWheel, tone: 'primary' },
  'scratch-card': { icon: Ticket, tone: 'warning' },
  'gift-box': { icon: Gift, tone: 'success' },
  'catch-items': { icon: ShoppingBasket, tone: 'info' },
};
const DEFAULT_VISUAL = { icon: Gamepad2, tone: 'primary' as Tone };

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
  const router = useRouter();
  const { token } = theme.useToken();
  const cardStyle = { border: `1px solid ${token.colorBorderSecondary}` };
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
      <Card variant="borderless" style={cardStyle} data-testid="games-empty-state">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('games.empty')} />
      </Card>
    );
  }

  return (
    <div className="grid gap-3" data-testid="games-list">
      {games.map((game, idx) => {
        const tpl = templates.find((item) => item.id === game.templateId);
        const skinObj = tpl?.skins.find((s) => s.key === game.skinKey);
        const editHref = `/orgs/${orgId}/events/${eventId}/games/${game.id}` as Route;
        const visual = TEMPLATE_VISUALS[game.templateId] ?? DEFAULT_VISUAL;
        const TemplateIcon = visual.icon;
        return (
          <Card
            key={game.id}
            variant="borderless"
            style={{
              ...cardStyle,
              ...(draggedId === game.id && { opacity: 0.5 }),
            }}
            styles={{ body: { padding: '14px 16px' } }}
            draggable
            onDragStart={() => setDraggedId(game.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(game.id)}
            data-testid={`game-row-${game.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Typography.Text type="secondary" className="flex cursor-grab">
                  <GripVertical className="size-4" />
                </Typography.Text>
                <IconTile tone={visual.tone}>
                  <TemplateIcon className="size-5" />
                </IconTile>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={editHref}
                      data-testid={`game-link-${game.id}`}
                      style={{ color: token.colorText, fontWeight: 600, fontSize: 15 }}
                    >
                      {game.name}
                    </Link>
                    {game.currentVersion ? (
                      <Tag
                        color="success"
                        variant="filled"
                        icon={<CircleCheck className="size-3" />}
                        className="!m-0 inline-flex items-center gap-1"
                        data-testid={`game-status-${game.id}`}
                      >
                        {t('games.publishedBadge', { version: game.currentVersion })}
                      </Tag>
                    ) : (
                      <Tag
                        variant="filled"
                        icon={<PencilLine className="size-3" />}
                        className="!m-0 inline-flex items-center gap-1"
                        data-testid={`game-status-${game.id}`}
                      >
                        {t('games.statusDraft')}
                      </Tag>
                    )}
                  </div>
                  <Caption>
                    #{idx + 1} · {tpl ? localize(tpl.name, locale) : game.templateId}
                    {skinObj ? ` · ${localize(skinObj.name, locale)}` : ''}
                  </Caption>
                </div>
              </div>

              <div className="flex items-center gap-1">
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
                <Button
                  size="small"
                  icon={<Pencil className="size-4" />}
                  data-testid={`game-edit-${game.id}`}
                  onClick={() => router.push(editHref)}
                >
                  {t('games.editGame')}
                </Button>
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
          </Card>
        );
      })}
    </div>
  );
}
