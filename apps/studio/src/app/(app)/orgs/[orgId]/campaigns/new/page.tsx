import type { Metadata, Route } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { TemplateGallery } from '@/features/builder-lab/components/home/template-gallery';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns'))('create') };
}

export default async function NewCampaignPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('campaigns');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('create')}
        description={t('createSubtitle')}
        backHref={`/orgs/${orgId}/campaigns` as Route}
        backLabel={t('backToList')}
      />
      <TemplateGallery orgId={orgId} />
    </div>
  );
}
