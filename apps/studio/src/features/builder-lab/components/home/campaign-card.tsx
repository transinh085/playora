'use client';

import { App, Button, Card, Flex, Popconfirm, Tooltip, Typography, theme } from 'antd';
import { ExternalLink, PencilLine, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { useDeleteCampaign } from '../../mock/hooks';
import type { Campaign } from '../../mock/types';
import { CampaignStatusTag } from '../editor/campaign-status-tag';
import { FitScreen } from '../editor/fit-screen';
import { labLinks } from '../editor/publish-dialog';
import { toCanvasPrizes } from '../editor/to-canvas-prizes';

/** One campaign in the home list: cover thumbnail, status, version, last update, actions. */
export function CampaignCard({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('builderLab.home');
  const format = useFormatter();
  // A ticking clock keeps 'x phút trước' fresh and avoids next-intl's global-now fallback.
  const now = useNow({ updateInterval: 60_000 });
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const router = useRouter();
  const remove = useDeleteCampaign();
  const editHref = `/orgs/${orgId}/labs/builder/${campaign.id}` as Route;
  const links = labLinks(orgId, campaign.id);
  const live = campaign.status === 'published';

  return (
    <Card
      variant="borderless"
      data-testid="campaign-card"
      style={{ overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { padding: 16 } }}
      cover={
        <Link href={editHref} aria-label={t('list.open')} className="block" style={{ height: 180 }}>
          <FitScreen
            screen={campaign.screens.cover}
            brand={campaign.brand}
            prizes={toCanvasPrizes(campaign)}
          />
        </Link>
      }
      actions={[
        <Button
          key="open"
          type="text"
          icon={<PencilLine className="size-4" />}
          onClick={() => router.push(editHref)}
        >
          {t('list.open')}
        </Button>,
        <Tooltip key="play" title={live ? t('list.playLive') : t('list.playRehearsal')}>
          <Button
            type="text"
            icon={<ExternalLink className="size-4" />}
            href={live ? links.play : links.rehearsal}
            target="_blank"
          >
            {t('list.play')}
          </Button>
        </Tooltip>,
        <Popconfirm
          key="delete"
          title={t('list.deleteConfirm', { name: campaign.name })}
          okButtonProps={{ danger: true }}
          okText={t('list.delete')}
          onConfirm={async () => {
            await remove.mutateAsync(campaign.id);
            message.success(t('list.deleted'));
          }}
        >
          <Button
            type="text"
            danger
            icon={<Trash2 className="size-4" />}
            aria-label={t('list.delete')}
          />
        </Popconfirm>,
      ]}
    >
      <Flex vertical gap={6}>
        <Typography.Text strong ellipsis={{ tooltip: campaign.name }}>
          {campaign.name}
        </Typography.Text>
        <Flex align="center" gap={8} wrap>
          <CampaignStatusTag campaign={campaign} />
        </Flex>
        <Caption>
          {t('list.meta', {
            version: campaign.version,
            time: format.relativeTime(new Date(campaign.updatedAt), now),
          })}
        </Caption>
      </Flex>
    </Card>
  );
}
