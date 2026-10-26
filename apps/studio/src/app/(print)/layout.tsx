import { ApiError } from '@playora/api-client';
import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api-server';

/**
 * Print layouts bypass the dashboard shell and full-screen wrappers to allow
 * clean, unclipped print media stylesheets.
 */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const api = await serverApi();
  await api.call(meApi.orgs).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  });
  return children;
}
