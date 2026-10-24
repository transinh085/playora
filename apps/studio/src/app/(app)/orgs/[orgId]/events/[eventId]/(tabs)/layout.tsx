import { EventHeader, EventNav } from '@/features/events/components/event-nav';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <EventHeader orgId={orgId} eventId={eventId} />
      <EventNav orgId={orgId} eventId={eventId} />
      {children}
    </div>
  );
}
