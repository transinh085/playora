import { meApi } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { Plus } from '@playora/ui/icons';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { RedemptionUsageBanner } from '@/features/billing/components/usage-banner';
import { CampaignHome } from '@/features/builder-lab/components/studio/campaign-home';
import { serverApi } from '@/lib/api-server';
import { isRedeemerOnly } from '@/lib/permissions';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('campaigns.home'))('title') };
}

export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { items } = await (await serverApi()).call(meApi.orgs);
  const currentOrg = items.find((o) => o.id === orgId);
  if (currentOrg && isRedeemerOnly(currentOrg.role)) {
    redirect(`/orgs/${orgId}/redeem`);
  }
  const t = await getTranslations('campaigns');
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('home.title')}
        description={t('home.subtitle')}
        extra={
          <Button asChild size="sm">
            <Link href={`/orgs/${orgId}/campaigns/new` as Route}>
              <Plus className="mr-1.5 size-4" />
              {t('create')}
            </Link>
          </Button>
        }
      />
      <RedemptionUsageBanner orgId={orgId} />
      <CampaignHome orgId={orgId} />
    </div>
  );
}
