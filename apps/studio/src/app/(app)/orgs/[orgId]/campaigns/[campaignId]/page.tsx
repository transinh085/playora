import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { CampaignOps } from '@/features/builder-lab/components/studio/campaign-ops';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns'))('title') };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return (
    <Suspense>
      <CampaignOps orgId={orgId} campaignId={campaignId} />
    </Suspense>
  );
}
