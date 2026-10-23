import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api-server';

/** Entry point: first organization's events, or onboarding when the user has none. */
export default async function Home() {
  const { items } = await (await serverApi()).call(meApi.orgs);
  const first = items[0];
  redirect(first ? `/orgs/${first.id}/events` : '/onboarding');
}
