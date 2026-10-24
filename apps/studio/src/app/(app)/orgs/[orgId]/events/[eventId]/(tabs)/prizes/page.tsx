import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventPrizesPlaceholder } from '@/features/events/components/event-overview';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('eventNav'))('prizes') };
}

export default function EventPrizesPage() {
  return <EventPrizesPlaceholder />;
}
