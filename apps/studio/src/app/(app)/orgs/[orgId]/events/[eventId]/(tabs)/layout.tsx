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
    <div className="flex flex-col gap-5">
      <EventHeader orgId={orgId} eventId={eventId} />
      <EventNav orgId={orgId} eventId={eventId} />
      {children}
    </div>
  );
}
