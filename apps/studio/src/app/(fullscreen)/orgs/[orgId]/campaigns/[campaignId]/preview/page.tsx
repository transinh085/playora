import { LabPlayer } from '@/features/builder-lab/components/lab-player';

/** Rehearsal / preview player in Studio (docs/product/specs/builder.md §3.1) with phone bezel and toolbar. */
export default async function CampaignPreviewPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return <LabPlayer orgId={orgId} campaignId={campaignId} rehearsal />;
}
