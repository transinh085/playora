import type { CampaignRules } from '@playora/contracts';
import type { useFormatter } from 'next-intl';

/** "20/1 – 10/2" in the viewer's locale. */
export function campaignPeriod(
  format: ReturnType<typeof useFormatter>,
  campaign: { rules: Pick<CampaignRules, 'startsAt' | 'endsAt'> },
) {
  return format.dateTimeRange(new Date(campaign.rules.startsAt), new Date(campaign.rules.endsAt), {
    day: 'numeric',
    month: 'numeric',
  });
}
