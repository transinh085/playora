import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MembersView } from './_components/members-view';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('members'))('title') };
}

export default async function MembersSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return <MembersView orgId={orgId} />;
}
