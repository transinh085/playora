import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MyPrizesView } from '@/features/campaign/my-prizes-view';
import { getPublicCampaign } from '@/features/campaign/public-campaign';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [campaign, t] = await Promise.all([
    getPublicCampaign((await params).slug),
    getTranslations('play'),
  ]);
  return campaign ? { title: `${t('myPrizes')} · ${campaign.name}` } : {};
}

/** "Quà của tôi" for this campaign, also after it ended (vouchers stay redeemable until they expire). */
export default async function MyPrizesPage({ params }: Props) {
  const campaign = await getPublicCampaign((await params).slug);
  if (!campaign) notFound();
  return (
    <MyPrizesView
      campaign={{
        slug: campaign.slug,
        name: campaign.name,
        brand: campaign.brand,
        skinKey: campaign.skinKey,
      }}
    />
  );
}
