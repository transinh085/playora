import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GamesTab } from '@/features/games/components/games-tab';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('games'))('title') };
}

export default async function EventGamesPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;
  return <GamesTab orgId={orgId} eventId={eventId} />;
}
