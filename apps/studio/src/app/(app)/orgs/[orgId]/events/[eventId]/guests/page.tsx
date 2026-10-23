import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventNav } from '../_components/event-nav';
import { GuestsView } from '../_components/guests-view';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('guests'))('title') };
}

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <EventNav orgId={orgId} eventId={eventId} />
      <GuestsView orgId={orgId} eventId={eventId} />
    </div>
  );
}
