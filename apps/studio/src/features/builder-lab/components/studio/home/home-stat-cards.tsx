'use client';

import { Card, Chip, Tooltip } from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import {
  RiAlarmWarningLine,
  RiCoinsLine,
  RiGamepadLine,
  RiInformationFill,
  RiTicketLine,
} from '@remixicon/react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import { formatVnd } from '../../../lib/rules-format';

type StatTone = 'blue' | 'orange' | 'purple' | 'emerald';

interface HomeStatItem {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  value: string;
  delta: string;
  deltaColor: 'success' | 'danger' | 'default';
  tone: StatTone;
  caption: string;
  hint: string;
}

const TILE_TONES: Record<StatTone, string> = {
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-400 to-orange-500',
  purple: 'from-purple-500 to-purple-600',
  emerald: 'from-emerald-500 to-emerald-600',
};

export function HomeStatCards({
  totalRedeemed,
  totalPlays,
  totalWins,
  totalPrizeCostVnd,
  attentionCount,
  returningPlayers = 0,
  redeemedDelta,
  playsDelta,
}: {
  totalRedeemed: number;
  totalPlays: number;
  totalWins: number;
  totalPrizeCostVnd: number;
  attentionCount: number;
  returningPlayers?: number;
  redeemedDelta?: { label: string; color: 'success' | 'danger' | 'default' };
  playsDelta?: { label: string; color: 'success' | 'danger' | 'default' };
}) {
  const t = useTranslations('campaigns.home');
  const format = useFormatter();

  const resolvedRedeemedDelta = redeemedDelta ?? {
    label: '0%',
    color: 'default' as const,
  };
  const resolvedPlaysDelta = playsDelta ?? {
    label:
      returningPlayers > 0
        ? t('statCards.returningBadge', { count: format.number(returningPlayers) })
        : `${format.number(totalPlays)}`,
    color: returningPlayers > 0 || totalPlays > 0 ? ('success' as const) : ('default' as const),
  };

  const stats: HomeStatItem[] = [
    {
      icon: RiTicketLine,
      label: t('trends.redeemed'),
      value: format.number(totalRedeemed),
      delta: resolvedRedeemedDelta.label,
      deltaColor: resolvedRedeemedDelta.color,
      tone: 'emerald',
      caption:
        returningPlayers > 0
          ? t('statCards.returningCaption', { count: format.number(returningPlayers) })
          : t('statCards.redeemedCaption'),
      hint: t('statCards.redeemedHint'),
    },
    {
      icon: RiGamepadLine,
      label: t('metrics.totalPlays'),
      value: format.number(totalPlays),
      delta: resolvedPlaysDelta.label,
      deltaColor: resolvedPlaysDelta.color,
      tone: 'blue',
      caption: t('statCards.playsCaption'),
      hint: t('statCards.playsHint'),
    },
    {
      icon: RiCoinsLine,
      label: t('statCards.prizeCostCaption'),
      value: formatVnd(totalPrizeCostVnd),
      delta: `${format.number(totalWins)} giải`,
      deltaColor: 'default',
      tone: 'orange',
      caption: t('metrics.prizesIssued'),
      hint: t('statCards.prizeCostHint'),
    },
    {
      icon: RiAlarmWarningLine,
      label: t('metrics.attentionNeeded'),
      value: format.number(attentionCount),
      delta: attentionCount > 0 ? `${attentionCount} mục` : 'OK',
      deltaColor: attentionCount > 0 ? 'danger' : 'success',
      tone: attentionCount > 0 ? 'purple' : 'emerald',
      caption: attentionCount > 0 ? t('statCards.attentionCaption') : t('metrics.allGood'),
      hint: t('statCards.attentionHint'),
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            variant="secondary"
            className="flex min-w-0 flex-col rounded-2xl p-2"
          >
            <Card.Header className="flex w-full flex-row items-start justify-between gap-2.5 p-2">
              <span
                className={cx(
                  'flex size-10 shrink-0 items-center justify-center rounded-2lg bg-linear-to-b',
                  TILE_TONES[stat.tone],
                )}
              >
                <Icon className="size-5 shrink-0 text-white" aria-hidden />
              </span>
              {stat.hint && (
                <Tooltip delay={200}>
                  <Tooltip.Trigger aria-label={`About ${stat.label}`}>
                    <span className="flex shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-icon-secondary transition-colors hover:text-foreground-icon-primary">
                      <RiInformationFill className="size-5" aria-hidden />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{stat.hint}</Tooltip.Content>
                </Tooltip>
              )}
            </Card.Header>

            <Card.Content className="flex flex-col gap-0.5 px-2 pt-2.5 pb-3.5">
              <Card.Description className="m-0 truncate text-body-medium text-text-secondary">
                {stat.label}
              </Card.Description>
              <Card.Title className="m-0 text-display-4-medium whitespace-nowrap text-text-primary tabular-nums">
                {stat.value}
              </Card.Title>
            </Card.Content>

            <Card.Footer className="mt-auto flex w-full items-center justify-between gap-2 rounded-2lg bg-surface py-1.5 pe-1.5 ps-2.5 shadow-card">
              <p className="m-0 truncate text-body-regular text-text-secondary">{stat.caption}</p>
              <Chip variant="soft" size="sm" color={stat.deltaColor}>
                {stat.delta}
              </Chip>
            </Card.Footer>
          </Card>
        );
      })}
    </div>
  );
}
