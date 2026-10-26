import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CampaignNotice } from '@/features/campaign/campaign-notice';
import { CampaignShell } from '@/features/campaign/campaign-shell';
import { channelFromSearchParams } from '@/features/campaign/channel';
import { getPublicCampaign } from '@/features/campaign/public-campaign';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await getPublicCampaign((await params).slug);
  return campaign ? { title: campaign.name } : {};
}

/**
 * Player link `play.playora.vn/{slug}?ch={channel}` (ADR-012 §6): the published campaign, or its
 * scheduled / paused / ended notice. The play itself is client-side (`CampaignShell`).
 */
export default async function CampaignPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);
  if (!campaign || campaign.phase === 'draft') notFound();

  if (campaign.phase !== 'live') {
    return <CampaignNotice campaign={{ ...campaign, phase: campaign.phase }} />;
  }
  return (
    <CampaignShell campaign={campaign} channel={channelFromSearchParams(await searchParams)} />
  );
}
