import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BrandKitsManager } from '@/features/brand-kits/components/brand-kits-manager';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('brandKits'))('title') };
}

export default async function BrandKitsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('brandKits');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <BrandKitsManager orgId={orgId} />
    </div>
  );
}
