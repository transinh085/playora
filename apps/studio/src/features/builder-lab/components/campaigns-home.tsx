'use client';

import { Button, Card, Empty, Flex, Skeleton, Tag, Tooltip, Typography, theme } from 'antd';
import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LogoMark } from '@/components/logo';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { useCampaigns, useLabSync } from '../mock/hooks';
import { CampaignCard } from './home/campaign-card';
import { TemplateGallery } from './home/template-gallery';

/** Builder Lab home (docs/15 P0): create from the template gallery, then the campaign list. */
export function CampaignsHome({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.home');
  const { token } = theme.useToken();
  useLabSync();
  const campaigns = useCampaigns();

  return (
    <div className="grid h-dvh" style={{ gridTemplateRows: '56px minmax(0, 1fr)' }}>
      <header
        className="flex items-center gap-2 px-3"
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Tooltip title={t('back')}>
          <Link href={`/orgs/${orgId}/events` as Route} aria-label={t('back')}>
            <Button type="text" tabIndex={-1} aria-hidden icon={<ArrowLeft className="size-4" />} />
          </Link>
        </Tooltip>
        <LogoMark className="size-7" aria-hidden />
        <Typography.Text strong className="whitespace-nowrap">
          {t('title')}
        </Typography.Text>
        <Tag color="warning" className="!m-0">
          {t('badge')}
        </Tag>
      </header>

      <main
        className="min-h-0 overflow-y-auto p-4 sm:p-6"
        style={{ background: token.colorBgLayout }}
      >
        <Flex vertical gap={24}>
          <PageHeader title={t('pageTitle')} description={t('pageDescription')} />
          <TemplateGallery orgId={orgId} />

          <Card
            variant="borderless"
            style={{ border: `1px solid ${token.colorBorderSecondary}` }}
            title={t('list.title')}
            extra={
              campaigns.data?.length ? (
                <Typography.Text type="secondary">
                  {t('list.count', { count: campaigns.data.length })}
                </Typography.Text>
              ) : null
            }
          >
            {campaigns.isError ? (
              <QueryError onRetry={() => campaigns.refetch()} />
            ) : campaigns.isLoading ? (
              <Skeleton active />
            ) : !campaigns.data?.length ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('list.empty')} />
            ) : (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
              >
                {campaigns.data.map((campaign) => (
                  <CampaignCard key={campaign.id} orgId={orgId} campaign={campaign} />
                ))}
              </div>
            )}
          </Card>
        </Flex>
      </main>
    </div>
  );
}
