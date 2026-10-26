import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { RedeemDesk } from '@/features/builder-lab/components/redeem-desk';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('builderLab.redeem'))('title') };
}

export default async function RedeemPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('builderLab.redeem');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense>
        <RedeemDesk orgId={orgId} />
      </Suspense>
    </div>
  );
}
