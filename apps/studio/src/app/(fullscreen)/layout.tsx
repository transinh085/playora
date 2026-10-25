import { ApiError } from '@playora/api-client';
import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api-server';

/**
 * Full-viewport tools (canvas editor) that must not sit inside the dashboard shell. Same session
 * check as `(app)/layout.tsx`; the org membership check lives in `orgs/[orgId]/layout.tsx`.
 */
export default async function FullscreenLayout({ children }: { children: React.ReactNode }) {
  const api = await serverApi();
  await api.call(meApi.orgs).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  });
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
