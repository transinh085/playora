import type { useFormatter } from 'next-intl';
import type { Campaign } from '../../mock/types';

/** "20/1 – 10/2" in the viewer's locale. */
export function campaignPeriod(format: ReturnType<typeof useFormatter>, campaign: Campaign) {
  return format.dateTimeRange(new Date(campaign.rules.startsAt), new Date(campaign.rules.endsAt), {
    day: 'numeric',
    month: 'numeric',
  });
}
