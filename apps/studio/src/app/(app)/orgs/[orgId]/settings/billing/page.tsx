import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BillingView } from '@/features/billing/components/billing-view';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('billing'))('title') };
}

export default async function BillingPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <BillingView orgId={orgId} />;
}
