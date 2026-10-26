import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { CampaignShareView } from '@/features/builder-lab/components/studio/campaign-share-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('campaigns.share');
  return { title: t('title') };
}

export default async function CampaignSharePage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return (
    <Suspense>
      <CampaignShareView orgId={orgId} campaignId={campaignId} />
    </Suspense>
  );
}
