import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { TemplatesCatalog } from '@/features/templates';
import { MOCK_TEMPLATES } from '@/features/templates/data/mock-templates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('templatesCatalog');
  return { title: t('title') };
}

export default async function TemplatesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('templatesCatalog');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        tags={
          <span className="rounded-full bg-status-cyan-background px-2.5 py-0.5 text-caption-1-medium text-status-cyan-text">
            {t('totalCountTag', { count: MOCK_TEMPLATES.length })}
          </span>
        }
      />
      <TemplatesCatalog orgId={orgId} />
    </div>
  );
}
