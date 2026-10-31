'use client';

import type { CampaignListItem } from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { CircleAlert, CircleCheck, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function hasUnpublishedChanges(
  campaign: Pick<CampaignListItem, 'status' | 'hasUnpublishedChanges'>,
) {
  return campaign.status === 'published' && campaign.hasUnpublishedChanges;
}

export function CampaignStatusTag({
  campaign,
}: {
  campaign: Pick<CampaignListItem, 'status' | 'version' | 'hasUnpublishedChanges'>;
}) {
  const t = useTranslations('builderLab.editor.status');
  if (campaign.status === 'draft') {
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        <PencilLine className="size-3" />
        {t('draft')}
      </Badge>
    );
  }
  return hasUnpublishedChanges(campaign) ? (
    <Badge variant="secondary" className="gap-1 font-normal text-amber-600 dark:text-amber-400">
      <CircleAlert className="size-3" />
      {t('dirty', { version: campaign.version })}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
    >
      <CircleCheck className="size-3" />
      {t('published', { version: campaign.version })}
    </Badge>
  );
}
