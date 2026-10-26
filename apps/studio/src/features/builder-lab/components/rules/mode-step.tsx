'use client';

import type { PrizeMode } from '@playora/core/prize';
import { Alert, Card, Flex, InputNumber, Slider, Typography, theme } from 'antd';
import { Gift, ListOrdered, Percent } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { IconTile, type Tone } from '@/components/icon-tile';
import type { CampaignRules } from '../../api';
import { fromPercent, toPercent } from '../../lib/rules-format';

const MODES: {
  key: PrizeMode;
  i18n: 'overall' | 'perPrize' | 'guaranteed';
  icon: React.ReactNode;
  tone: Tone;
}[] = [
  {
    key: 'overall_win_rate',
    i18n: 'overall',
    icon: <Percent className="size-5" />,
    tone: 'primary',
  },
  {
    key: 'per_prize_probability',
    i18n: 'perPrize',
    icon: <ListOrdered className="size-5" />,
    tone: 'info',
  },
  { key: 'guaranteed', i18n: 'guaranteed', icon: <Gift className="size-5" />, tone: 'success' },
];

/** Step 1: choose HOW prizes are given before anything else (docs/research/guandayun-teardown.md §3.2 派奖方式). */
export function ModeStep({
  rules,
  probabilityPercent,
  onChange,
}: {
  rules: CampaignRules;
  /** Running total of per-prize probabilities, in percent. */
  probabilityPercent: number;
  onChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.mode');
  const { token } = theme.useToken();
  const ratePercent = toPercent(rules.overallWinRate);

  return (
    <Flex vertical gap={16}>
      <div
        role="radiogroup"
        aria-label={t('label')}
        className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
      >
        {MODES.map((mode) => {
          const selected = rules.mode === mode.key;
          return (
            <Card
              key={mode.key}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => onChange({ mode: mode.key })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange({ mode: mode.key });
                }
              }}
              style={{
                borderColor: selected ? token.colorPrimary : token.colorBorderSecondary,
                boxShadow: selected ? `0 0 0 1px ${token.colorPrimary}` : undefined,
                background: selected ? token.colorPrimaryBg : undefined,
                cursor: 'pointer',
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex vertical gap={8}>
                <IconTile tone={mode.tone} size={36}>
                  {mode.icon}
                </IconTile>
                <Typography.Text strong>{t(`${mode.i18n}.title`)}</Typography.Text>
                <Typography.Text type="secondary">{t(`${mode.i18n}.description`)}</Typography.Text>
                <Caption italic>{t(`${mode.i18n}.example`)}</Caption>
              </Flex>
            </Card>
          );
        })}
      </div>

      {rules.mode === 'overall_win_rate' && (
        <Flex vertical gap={4}>
          <Typography.Text strong>{t('overall.rateLabel')}</Typography.Text>
          <Flex align="center" gap={16} wrap>
            <Slider
              className="min-w-[160px] flex-1"
              min={0}
              max={100}
              step={1}
              value={ratePercent}
              onChange={(v) => onChange({ overallWinRate: fromPercent(v) })}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
            <InputNumber
              aria-label={t('overall.rateLabel')}
              min={0}
              max={100}
              step={1}
              precision={1}
              suffix="%"
              style={{ width: 120 }}
              value={ratePercent}
              onChange={(v) => v !== null && onChange({ overallWinRate: fromPercent(v) })}
            />
          </Flex>
          <Caption>{t('overall.rateHint', { rate: ratePercent, lose: 100 - ratePercent })}</Caption>
        </Flex>
      )}

      {rules.mode === 'per_prize_probability' &&
        (probabilityPercent > 100 ? (
          <Alert
            type="error"
            showIcon
            title={t('perPrize.over', { total: probabilityPercent })}
            description={t('perPrize.overHint')}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            title={t('perPrize.total', {
              total: probabilityPercent,
              lose: Math.round((100 - probabilityPercent) * 10) / 10,
            })}
            description={t('perPrize.totalHint')}
          />
        ))}

      {rules.mode === 'guaranteed' && <Alert type="info" showIcon title={t('guaranteed.note')} />}
    </Flex>
  );
}
