import { Button } from 'antd';
import { Plus } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { CampaignList } from '@/features/builder-lab/components/studio/campaign-list';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns'))('title') };
}

export default async function CampaignsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('campaigns');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        extra={
          <Link href={`/orgs/${orgId}/campaigns/new` as Route}>
            <Button type="primary" icon={<Plus className="size-4" />} tabIndex={-1}>
              {t('create')}
            </Button>
          </Link>
        }
      />
      <CampaignList orgId={orgId} />
    </div>
  );
}
