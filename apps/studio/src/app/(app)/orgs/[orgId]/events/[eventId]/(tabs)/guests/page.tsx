import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GuestsView } from '@/features/guests/components/guests-view';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('guests'))('title') };
}

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return <GuestsView orgId={orgId} eventId={eventId} />;
}
