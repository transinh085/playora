import { DraftPlayerShell } from '@/features/builder-lab/components/draft-player-shell';

export default async function DraftRehearsalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <DraftPlayerShell token={token} />;
}
