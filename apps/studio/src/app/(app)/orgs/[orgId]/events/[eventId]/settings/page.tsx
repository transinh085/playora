import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventSettingsForm } from './_components/event-settings-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('events'))('settings') };
}

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  const t = await getTranslations('events');
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('settings')}</h1>
      <EventSettingsForm orgId={orgId} eventId={eventId} />
    </div>
  );
}
