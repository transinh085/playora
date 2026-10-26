import { LabPlayer } from '@/features/builder-lab/components/lab-player';

/** Simulated player app (docs/plans/2026-10-25-game-builder-plan.md §11) until Play serves campaigns from the real API. */
export default async function CampaignPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
  searchParams: Promise<{ rehearsal?: string }>;
}) {
  const { orgId, campaignId } = await params;
  const { rehearsal } = await searchParams;
  return <LabPlayer orgId={orgId} campaignId={campaignId} rehearsal={rehearsal === '1'} />;
}
