import { Button, Space } from 'antd';
import { LayoutTemplate } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { CreateEventDialog } from '@/features/events/components/create-event-dialog';
import { EventsTable } from '@/features/events/components/events-table';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('events'))('title') };
}

export default async function EventsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('events');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        extra={
          <Space wrap>
            <CreateEventDialog orgId={orgId} />
            <Link href={`/orgs/${orgId}/templates` as Route}>
              <Button type="primary" icon={<LayoutTemplate className="size-4" />} tabIndex={-1}>
                {t('fromTemplate')}
              </Button>
            </Link>
          </Space>
        }
      />
      <EventsTable orgId={orgId} />
    </div>
  );
}
