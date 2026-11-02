import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CampaignList } from '@/features/builder-lab/components/studio/campaign-list';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns'))('title') };
}

export default async function CampaignsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <CampaignList orgId={orgId} />;
}
