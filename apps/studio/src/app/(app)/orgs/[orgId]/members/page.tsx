import { redirect } from 'next/navigation';

export default async function MembersRedirectPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/settings`);
}
