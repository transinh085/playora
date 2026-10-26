import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { CampaignReportView } from '@/features/builder-lab/components/studio/campaign-report';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns.report'))('title') };
}

export default async function CampaignReportPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return (
    <Suspense>
      <CampaignReportView orgId={orgId} campaignId={campaignId} />
    </Suspense>
  );
}
