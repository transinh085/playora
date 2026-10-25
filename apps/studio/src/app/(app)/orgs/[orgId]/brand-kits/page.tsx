import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { BrandKitsManager } from '@/features/brand-kits/components/brand-kits-manager';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('brandKits'))('title') };
}

export default async function BrandKitsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('brandKits');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <BrandKitsManager orgId={orgId} />
    </div>
  );
}
