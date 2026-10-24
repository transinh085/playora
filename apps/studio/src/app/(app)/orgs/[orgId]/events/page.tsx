import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CreateEventDialog } from '@/features/events/components/create-event-dialog';
import { EventsTable } from '@/features/events/components/events-table';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('events'))('title') };
}

export default async function EventsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const t = await getTranslations('events');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <CreateEventDialog orgId={orgId} />
      </div>
      <EventsTable orgId={orgId} />
    </div>
  );
}
