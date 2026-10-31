'use client';

import type { PublicCampaign } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { AlertCircle, Clock, PauseCircle } from '@playora/ui/icons';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { CampaignFrame } from './campaign-frame';
import { formatOpenDays } from './open-days';

type ClosedPhase = Exclude<PublicCampaign['phase'], 'live' | 'draft'>;

/** Scheduled ("chưa bắt đầu"), paused ("tạm dừng") or ended ("đã kết thúc") campaign. */
export function CampaignNotice({
  campaign,
}: {
  campaign: Pick<
    PublicCampaign,
    'slug' | 'name' | 'brand' | 'skinKey' | 'startsAt' | 'timezone'
  > & {
    phase: ClosedPhase;
    openDays?: readonly number[] | null;
  };
}) {
  const t = useTranslations('play');
  const tWeekdays = useTranslations('play.weekdays');
  const format = useFormatter();
  const { phase } = campaign;

  const openDaysFormatted = useMemo(
    () => formatOpenDays(campaign.openDays, (d) => tWeekdays(String(d))),
    [campaign.openDays, tWeekdays],
  );

  const body =
    phase === 'scheduled'
      ? t('scheduledBody', {
          time: format.dateTime(new Date(campaign.startsAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: campaign.timezone,
          }),
        })
      : t(`${phase}Body`);

  return (
    <CampaignFrame brand={campaign.brand} skinKey={campaign.skinKey}>
      <div
        className="flex h-full flex-col items-center justify-center p-6 text-center"
        data-phase={phase}
      >
        <p className="text-xs font-medium text-muted-foreground">{campaign.name}</p>
        <div className="my-6 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {phase === 'scheduled' ? (
              <Clock className="size-7" />
            ) : phase === 'paused' ? (
              <PauseCircle className="size-7 text-amber-500" />
            ) : (
              <AlertCircle className="size-7" />
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t(`${phase}Title`)}</h2>
          <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            <span>{body}</span>
            {openDaysFormatted && (
              <span className="text-xs text-muted-foreground" data-testid="notice-open-days">
                {t('openDaysNote', { days: openDaysFormatted })}
              </span>
            )}
          </div>
          {phase !== 'scheduled' && (
            <Button asChild className="mt-4 rounded-full px-6 shadow-sm">
              <Link href={`/${campaign.slug}/prizes`}>{t('myPrizes')}</Link>
            </Button>
          )}
        </div>
      </div>
    </CampaignFrame>
  );
}
