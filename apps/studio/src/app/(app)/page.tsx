import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { isRedeemerOnly } from '@/lib/permissions';

/** Entry point: first organization's Home, or onboarding when the user has none. */
export default async function Home() {
  const { items } = await (await serverApi()).call(meApi.orgs);
  const first = items[0];
  if (!first) redirect('/onboarding');
  redirect(isRedeemerOnly(first.role) ? `/orgs/${first.id}/redeem` : `/orgs/${first.id}`);
}
