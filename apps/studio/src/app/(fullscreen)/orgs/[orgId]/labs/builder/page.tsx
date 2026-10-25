import { CampaignsHome } from '@/features/builder-lab/components/campaigns-home';

export default async function BuilderLabPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <CampaignsHome orgId={orgId} />;
}
