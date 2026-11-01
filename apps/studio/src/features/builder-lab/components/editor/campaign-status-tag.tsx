'use client';

import type { CampaignListItem } from '@playora/contracts';
import { Chip } from '@playora/ui/components';
import { CircleAlert, CircleCheck, PencilLine } from '@playora/ui/icons';
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
      <Chip variant="soft" color="default" className="gap-1">
        <PencilLine className="size-3" />
        {t('draft')}
      </Chip>
    );
  }
  return hasUnpublishedChanges(campaign) ? (
    <Chip variant="soft" color="warning" className="gap-1">
      <CircleAlert className="size-3" />
      {t('dirty', { version: campaign.version })}
    </Chip>
  ) : (
    <Chip variant="soft" color="success" className="gap-1">
      <CircleCheck className="size-3" />
      {t('published', { version: campaign.version })}
    </Chip>
  );
}
