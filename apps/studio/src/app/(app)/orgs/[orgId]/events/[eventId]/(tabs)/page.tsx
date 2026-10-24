import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventOverview } from '@/features/events/components/event-overview';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('overview'))('title') };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return <EventOverview orgId={orgId} eventId={eventId} />;
}
