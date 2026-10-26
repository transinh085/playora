import type { Metadata } from 'next';
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
        extra={<CreateEventDialog orgId={orgId} />}
      />
      <EventsTable orgId={orgId} />
    </div>
  );
}
