import { meApi } from '@playora/contracts';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';

/** Only members of the org can access its printable materials. */
export default async function PrintOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const api = await serverApi();
  const orgs = await api.call(meApi.orgs);
  if (!orgs.items.some((org) => org.id === orgId)) notFound();
  return children;
}
