'use client';

import { Button, Card, Flex, Tag, Typography, theme } from 'antd';
import { CalendarRange, Repeat, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { IconTile, type Tone } from '@/components/icon-tile';
import { PLAYBOOK_KEYS, PLAYBOOKS, type PlaybookKey } from '../../lib/playbooks';

const LOOK: Record<PlaybookKey, { Icon: typeof Sparkles; tone: Tone }> = {
  tet_traffic: { Icon: Sparkles, tone: 'error' },
  second_visit: { Icon: Repeat, tone: 'success' },
  slow_days: { Icon: CalendarRange, tone: 'info' },
};

/**
 * "Bạn muốn gì?" (docs/product/specs/playbooks.md §2.1): the create flow starts from the shop's
 * goal. Each card shows the goal, how the playbook gets there and the number that tells.
 */
export function GoalPicker({
  onPick,
  onCustom,
}: {
  onPick: (key: PlaybookKey) => void;
  onCustom: () => void;
}) {
  const t = useTranslations('builderLab.playbooks');
  const tl = useTranslations('builderLab.home');
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      title={
        <Flex align="center" gap={8}>
          <Target className="size-4" />
          {t('title')}
        </Flex>
      }
    >
      <Flex vertical gap={20}>
        <Caption>{t('hint')}</Caption>
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {PLAYBOOK_KEYS.map((key) => {
            const pb = PLAYBOOKS[key];
            const { Icon, tone } = LOOK[key];
            const title = t(`items.${key}.title`);
            return (
              <Card
                key={key}
                variant="borderless"
                hoverable
                role="button"
                tabIndex={0}
                aria-label={title}
                data-testid={`playbook-${key}`}
                onClick={() => onPick(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(key);
                  }
                }}
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                }}
                styles={{ body: { height: '100%' } }}
              >
                <Flex vertical gap={14} className="h-full">
                  <Flex align="center" gap={12}>
                    <IconTile tone={tone}>
                      <Icon className="size-5" />
                    </IconTile>
                    <div className="min-w-0">
                      <Typography.Text strong className="block" style={{ fontSize: 16 }}>
                        {title}
                      </Typography.Text>
                      <Flex gap={4} wrap className="mt-1">
                        <Tag className="!m-0">{tl(`templates.${pb.templateKey}`)}</Tag>
                        <Tag className="!m-0">{t('daysTag', { days: pb.days })}</Tag>
                      </Flex>
                    </div>
                  </Flex>
                  <Line label={t('goalLabel')} icon={<Target className="size-3.5" />}>
                    {t(`items.${key}.goal`)}
                  </Line>
                  <Line label={t('mechanismLabel')} icon={<Sparkles className="size-3.5" />}>
                    {t(`items.${key}.mechanism`)}
                  </Line>
                  <Line label={t('metricLabel')} icon={<TrendingUp className="size-3.5" />}>
                    {t(`items.${key}.metric`)}
                  </Line>
                  <Button
                    block
                    className="mt-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(key);
                    }}
                  >
                    {t('choose')}
                  </Button>
                </Flex>
              </Card>
            );
          })}
        </div>
        <Flex
          gap={8}
          wrap
          align="center"
          justify="space-between"
          className="p-4"
          style={{ background: token.colorFillAlter, borderRadius: token.borderRadiusLG }}
        >
          <Typography.Text type="secondary">{t('customTitle')}</Typography.Text>
          <Button type="link" onClick={onCustom} className="!px-0">
            {t('custom')}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

function Line({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Flex align="center" gap={4}>
        <Caption>{icon}</Caption>
        <Caption>{label}</Caption>
      </Flex>
      <Typography.Text>{children}</Typography.Text>
    </div>
  );
}
