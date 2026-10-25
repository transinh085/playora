import { meApi } from '@playora/contracts';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';

/** Only members of the org reach its full-screen tools. */
export default async function FullscreenOrgLayout({
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
