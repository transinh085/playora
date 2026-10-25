import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { TemplateGallery } from '@/features/games/components/template-gallery';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('templates'))('title') };
}

export default async function TemplatesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('templates');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <TemplateGallery orgId={orgId} />
    </div>
  );
}
