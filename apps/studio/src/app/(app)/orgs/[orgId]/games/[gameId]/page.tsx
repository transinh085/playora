import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GameEditor } from '../../events/[eventId]/games/[gameId]/_components/game-editor';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('games'))('title') };
}

export default async function DirectGameEditorPage({
  params,
}: {
  params: Promise<{ orgId: string; gameId: string }>;
}) {
  const { orgId, gameId } = await params;
  return <GameEditor orgId={orgId} gameId={gameId} />;
}
