import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { CreateCampaignFlow } from '@/features/builder-lab/components/home/create-campaign-flow';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns'))('create') };
}

export default async function NewCampaignPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('campaigns');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('create')} description={t('createSubtitle')} />
      <Suspense>
        <CreateCampaignFlow orgId={orgId} />
      </Suspense>
    </div>
  );
}
