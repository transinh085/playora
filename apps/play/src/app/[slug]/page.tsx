import type { PublicEvent } from '@playora/contracts';
import { notFound } from 'next/navigation';
import { EventJoinShell } from './_components/event-join-shell';

async function getEvent(slug: string): Promise<PublicEvent | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/p/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/** Player shell for an event: brand cover, identity/form/consent join step, and waiting lobby. */
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return <EventJoinShell event={event} />;
}
