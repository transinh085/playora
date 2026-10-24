import { ApiError } from '@playora/api-client';
import { ErrorCode, type PublicEvent, publicApi } from '@playora/contracts';
import { notFound } from 'next/navigation';
import { EventJoinShell } from '@/features/join/event-join-shell';
import { api } from '@/lib/api';

async function getEvent(slug: string): Promise<PublicEvent | null> {
  try {
    return await api.call(publicApi.event, { params: { slug } });
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 400 ||
        err.code === ErrorCode.NOT_FOUND ||
        err.code === ErrorCode.VALIDATION_FAILED)
    ) {
      return null;
    }
    throw err;
  }
}

/** Player shell for an event: brand cover, identity/form/consent join step, and waiting lobby. */
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return <EventJoinShell event={event} />;
}
