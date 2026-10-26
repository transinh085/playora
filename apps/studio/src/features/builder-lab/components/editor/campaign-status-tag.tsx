'use client';

import type { CampaignListItem } from '@playora/contracts';
import { Tag } from 'antd';
import { CircleAlert, CircleCheck, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Published campaigns keep serving their last version while the draft changes (docs/product/specs/builder.md §4.3). */
export function hasUnpublishedChanges(
  campaign: Pick<CampaignListItem, 'status' | 'hasUnpublishedChanges'>,
) {
  return campaign.status === 'published' && campaign.hasUnpublishedChanges;
}

const icon = 'mr-1 inline size-3 align-[-2px]';

/** Status tag with an icon (docs/engineering/design-system.md §3.4): draft · published vN · published with pending changes. */
export function CampaignStatusTag({
  campaign,
}: {
  campaign: Pick<CampaignListItem, 'status' | 'version' | 'hasUnpublishedChanges'>;
}) {
  const t = useTranslations('builderLab.editor.status');
  if (campaign.status === 'draft') {
    return (
      <Tag className="!m-0" icon={<PencilLine className={icon} />}>
        {t('draft')}
      </Tag>
    );
  }
  return hasUnpublishedChanges(campaign) ? (
    <Tag className="!m-0" color="warning" icon={<CircleAlert className={icon} />}>
      {t('dirty', { version: campaign.version })}
    </Tag>
  ) : (
    <Tag className="!m-0" color="success" icon={<CircleCheck className={icon} />}>
      {t('published', { version: campaign.version })}
    </Tag>
  );
}
