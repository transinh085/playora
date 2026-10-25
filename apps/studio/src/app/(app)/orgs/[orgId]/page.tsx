import { Button } from 'antd';
import { LayoutTemplate } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { HomeDashboard } from '@/features/events/components/home-dashboard';
import { TemplateTeaser } from '@/features/games/components/template-teaser';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('home'))('title') };
}

export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('home');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        extra={
          <Link href={`/orgs/${orgId}/templates` as Route}>
            <Button type="primary" icon={<LayoutTemplate className="size-4" />} tabIndex={-1}>
              {t('create')}
            </Button>
          </Link>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <HomeDashboard orgId={orgId} />
        <TemplateTeaser orgId={orgId} />
      </div>
    </div>
  );
}
