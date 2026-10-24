import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AssetsManager } from '@/features/assets/components/assets-manager';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('assets'))('title') };
}

export default async function AssetsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('assets');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <AssetsManager orgId={orgId} />
    </div>
  );
}
