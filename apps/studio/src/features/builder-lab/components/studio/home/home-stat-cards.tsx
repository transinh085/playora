'use client';

import { type Stat, StatCards } from '@playora/ui/components';
import { RiAlarmWarningLine, RiCoinsLine, RiGamepadLine, RiTicketLine } from '@remixicon/react';
import { useFormatter, useTranslations } from 'next-intl';
import { formatVnd } from '../../../lib/rules-format';

export function HomeStatCards({
  totalRedeemed,
  totalPlays,
  totalWins,
  totalPrizeCostVnd,
  attentionCount,
}: {
  totalRedeemed: number;
  totalPlays: number;
  totalWins: number;
  totalPrizeCostVnd: number;
  attentionCount: number;
}) {
  const t = useTranslations('campaigns.home');
  const format = useFormatter();

  const stats: Stat[] = [
    {
      icon: RiTicketLine,
      label: t('trends.redeemed'),
      value: format.number(totalRedeemed),
      delta: totalRedeemed > 0 ? '+100%' : '0%',
      deltaColor: totalRedeemed > 0 ? 'lime' : 'neutral',
      tone: 'emerald',
      caption: t('statCards.redeemedCaption'),
      hint: t('statCards.redeemedHint'),
    },
    {
      icon: RiGamepadLine,
      label: t('metrics.totalPlays'),
      value: format.number(totalPlays),
      delta: totalPlays > 0 ? `${format.number(totalPlays)}` : '0',
      deltaColor: totalPlays > 0 ? 'lime' : 'neutral',
      tone: 'blue',
      caption: t('statCards.playsCaption'),
      hint: t('statCards.playsHint'),
    },
    {
      icon: RiCoinsLine,
      label: t('statCards.prizeCostCaption'),
      value: formatVnd(totalPrizeCostVnd),
      delta: `${format.number(totalWins)} giải`,
      deltaColor: 'neutral',
      tone: 'orange',
      caption: t('metrics.prizesIssued'),
      hint: t('statCards.prizeCostHint'),
    },
    {
      icon: RiAlarmWarningLine,
      label: t('metrics.attentionNeeded'),
      value: format.number(attentionCount),
      delta: attentionCount > 0 ? `${attentionCount} mục` : 'OK',
      deltaColor: attentionCount > 0 ? 'rose' : 'lime',
      tone: attentionCount > 0 ? 'purple' : 'emerald',
      caption: attentionCount > 0 ? t('statCards.attentionCaption') : t('metrics.allGood'),
      hint: t('statCards.attentionHint'),
    },
  ];

  return <StatCards variant="footer" stats={stats} />;
}
