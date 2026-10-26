'use client';

import type { PublicCampaign } from '@playora/contracts';
import { Button, Result, Typography } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { CampaignFrame } from './campaign-frame';

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
  };
}) {
  const t = useTranslations('play');
  const format = useFormatter();
  const { phase } = campaign;

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
      <div className="flex h-full flex-col items-center justify-center p-6" data-phase={phase}>
        <Typography.Text type="secondary">{campaign.name}</Typography.Text>
        <Result
          status={phase === 'paused' ? 'warning' : 'info'}
          title={t(`${phase}Title`)}
          subTitle={body}
          extra={
            phase === 'scheduled' ? null : (
              <Button type="primary" href={`/${campaign.slug}/prizes`}>
                {t('myPrizes')}
              </Button>
            )
          }
        />
      </div>
    </CampaignFrame>
  );
}
