import { BuilderEditor } from '@/features/builder-lab/components/builder-editor';

const MODES = ['quick', 'customize', 'rules'] as const;

export default async function CampaignEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { orgId, campaignId } = await params;
  const { mode } = await searchParams;
  const initialMode = MODES.find((value) => value === mode) ?? 'quick';
  return <BuilderEditor orgId={orgId} campaignId={campaignId} initialMode={initialMode} />;
}
