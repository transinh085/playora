import { ApiError } from '@playora/api-client';
import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { serverApi } from '@/lib/api-server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const api = await serverApi();
  const orgs = await api.call(meApi.orgs).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  });
  return <AppShell orgs={orgs.items}>{children}</AppShell>;
}
