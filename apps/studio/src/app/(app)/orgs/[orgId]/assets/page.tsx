import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { AssetsManager } from '@/features/assets/components/assets-manager';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('assets'))('title') };
}

export default async function AssetsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('assets');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <AssetsManager orgId={orgId} />
    </div>
  );
}
