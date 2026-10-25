import { LabPlayer } from '@/features/builder-lab/components/lab-player';

export default async function BuilderLabPlayPage({
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
