import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GameEditor } from '@/features/games/components/game-editor';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('games'))('title') };
}

export default async function EventGameEditorPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string; gameId: string }>;
}) {
  const { orgId, eventId, gameId } = await params;
  return <GameEditor orgId={orgId} eventId={eventId} gameId={gameId} />;
}
