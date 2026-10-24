import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function EventGuestsRedirectPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  redirect(`/orgs/${orgId}/events/${eventId}/players` as Route);
}
