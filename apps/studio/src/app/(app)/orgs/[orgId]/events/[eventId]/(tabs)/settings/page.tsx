import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventSettingsForm } from '@/features/events/components/event-settings-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('events'))('settings') };
}

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return <EventSettingsForm orgId={orgId} eventId={eventId} />;
}
