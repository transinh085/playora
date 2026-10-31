import { RehearsalShell } from '@/features/campaign/rehearsal-shell';

/**
 * Rehearsal / preview route (`/orgs/[orgId]/campaigns/[campaignId]/preview`) in `apps/play`
 * for testing a campaign draft with the phone bezel and rehearsal toolbar.
 */
export default async function CampaignPreviewPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return <RehearsalShell orgId={orgId} campaignId={campaignId} />;
}
