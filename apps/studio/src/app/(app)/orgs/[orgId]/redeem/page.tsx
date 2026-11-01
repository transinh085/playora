import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { RedeemDesk } from '@/features/builder-lab/components/redeem-desk';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('builderLab.redeem'))('title') };
}

export default async function RedeemPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <Suspense>
      <RedeemDesk orgId={orgId} />
    </Suspense>
  );
}
