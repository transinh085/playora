import { meApi } from '@playora/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MembersView } from '@/features/members/components/members-view';
import { serverApi } from '@/lib/api-server';
import { isRedeemerOnly } from '@/lib/permissions';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('members'))('title') };
}

export default async function OrgSettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { items } = await (await serverApi()).call(meApi.orgs);
  const currentOrg = items.find((o) => o.id === orgId);
  if (currentOrg && isRedeemerOnly(currentOrg.role)) {
    redirect(`/orgs/${orgId}/redeem`);
  }
  return <MembersView orgId={orgId} />;
}
