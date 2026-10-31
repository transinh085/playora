import { redirect } from 'next/navigation';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';

/** Legacy studio play route redirects to the dedicated rehearsal preview page. */
export default async function LegacyCampaignPlayPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  redirect(campaignRoutes(orgId).preview(campaignId));
}
