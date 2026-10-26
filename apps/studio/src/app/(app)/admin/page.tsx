import { ApiError } from '@playora/api-client';
import { adminApi } from '@playora/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminView } from '@/features/billing/components/admin-view';
import { serverApi } from '@/lib/api-server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('admin'))('title') };
}

/**
 * Back-office (ADM-01, BIL-01), Playora staff only: the page exists only for users the API lets
 * call `/admin/orgs` (email in PLATFORM_ADMIN_EMAILS and verified); everyone else gets a 404.
 */
export default async function AdminPage() {
  const api = await serverApi();
  await api.call(adminApi.orgs, { query: { limit: 1 } }).catch((error: unknown) => {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  });
  return <AdminView />;
}
