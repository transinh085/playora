import { ApiError } from '@playora/api-client';
import { meApi } from '@playora/contracts';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/features/auth/components/onboarding-form';
import { serverApi } from '@/lib/api-server';

export default async function OnboardingPage() {
  const api = await serverApi();
  const orgs = await api.call(meApi.orgs).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  });
  return <OnboardingForm existingOrgs={orgs.items} />;
}
