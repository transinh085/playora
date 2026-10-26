import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { CampaignSharePrint } from '@/features/builder-lab/components/studio/campaign-share-print';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('campaigns.share.print');
  return { title: t('title') };
}

export default async function CampaignSharePrintPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return (
    <Suspense>
      <CampaignSharePrint orgId={orgId} campaignId={campaignId} />
    </Suspense>
  );
}
