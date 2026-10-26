import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function EventsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/campaigns` as Route);
}
