import { BuilderEditor } from '@/features/builder-lab/components/builder-editor';

export default async function BuilderLabEditorPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;
  return <BuilderEditor orgId={orgId} campaignId={campaignId} />;
}
