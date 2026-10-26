'use client';

import { Alert, Button, Flex, InputNumber, Progress, Tooltip, Typography, theme } from 'antd';
import { CalendarClock, Coins, Gift, Percent, Users } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { MetricCard } from '@/components/metric-card';
import type { Campaign, CampaignRules } from '../../api';
import { campaignDays, formatVnd } from '../../lib/rules-format';
import {
  type SimSummary,
  type SimWarning,
  simulateCampaign,
  summarizeSimulation,
} from '../../lib/rules-sim';

const MAX_PLAYERS_PER_DAY = 5_000;
const DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** "If ~N customers play each day, what happens to my prizes?" (docs/product/specs/prizes-redemption.md §5). */
export function SimulatorCard({
  campaign,
  blocked,
  onRulesChange,
}: {
  campaign: Campaign;
  /** Rules have blocking errors: the engine would reject them, so don't run. */
  blocked: boolean;
  onRulesChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.sim');
  const [playersPerDay, setPlayersPerDay] = useState(200);
  const players = useDebounced(playersPerDay, DEBOUNCE_MS);
  // Debounce the campaign too so typing a quantity doesn't re-run the engine on each key, and key
  // the memo on the values that matter (not object identity, which changes on every save).
  const debouncedCampaign = useDebounced(campaign, DEBOUNCE_MS);
  const simKey = JSON.stringify([
    debouncedCampaign.id,
    debouncedCampaign.rules,
    debouncedCampaign.prizes.map(({ image: _image, ...rest }) => rest),
    players,
    blocked,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `simKey` captures every input
  const outcome = useMemo((): { summary: SimSummary } | { error: true } | null => {
    const sim = debouncedCampaign;
    if (blocked || sim.prizes.length === 0) return null;
    try {
      const result = simulateCampaign(sim, { playersPerDay: players });
      return {
        summary: summarizeSimulation(result, {
          rules: sim.rules,
          prizes: sim.prizes,
          days: campaignDays(sim.rules.startsAt, sim.rules.endsAt),
        }),
      };
    } catch {
      return { error: true };
    }
  }, [simKey]);

  return (
    <Flex vertical gap={16}>
      <div className="flex flex-wrap items-center gap-2">
        {t.rich('input', {
          n: () => (
            <InputNumber
              aria-label={t('inputLabel')}
              min={1}
              max={MAX_PLAYERS_PER_DAY}
              step={50}
              precision={0}
              style={{ width: 110 }}
              value={playersPerDay}
              onChange={(v) => v !== null && setPlayersPerDay(v)}
            />
          ),
        })}
      </div>
      <Caption>
        {t('assumption', {
          days: campaignDays(campaign.rules.startsAt, campaign.rules.endsAt),
          plays: campaign.rules.playsPerDay,
        })}
      </Caption>

      {outcome === null ? (
        <Alert type="info" showIcon title={blocked ? t('blocked') : t('noPrizes')} />
      ) : 'error' in outcome ? (
        <Alert type="error" showIcon title={t('failed')} />
      ) : (
        <SimResult summary={outcome.summary} rules={campaign.rules} onRulesChange={onRulesChange} />
      )}
    </Flex>
  );
}

function SimResult({
  summary,
  rules,
  onRulesChange,
}: {
  summary: SimSummary;
  rules: CampaignRules;
  onRulesChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.sim');
  const format = useFormatter();
  const locale = useLocale();

  return (
    <Flex vertical gap={16}>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <MetricCard
          label={t('plays')}
          value={format.number(summary.plays)}
          subtext={
            summary.closedPlays > 0
              ? t('closedPlays', { count: summary.closedPlays })
              : t('playsSub', { days: summary.days })
          }
          icon={<Users className="size-5" />}
          tone="info"
        />
        <MetricCard
          label={t('wins')}
          value={`${format.number(summary.wins)} / ${format.number(summary.stock)}`}
          subtext={t('winsSub', { left: summary.leftover })}
          icon={<Gift className="size-5" />}
          tone="success"
        />
        <MetricCard
          label={t('winRate')}
          value={`${Math.round(summary.winRate * 1000) / 10}%`}
          subtext={t('winRateSub')}
          icon={<Percent className="size-5" />}
          tone="primary"
        />
        <MetricCard
          label={t('cost')}
          value={formatVnd(summary.costVnd, locale)}
          subtext={
            rules.budgetVnd !== null
              ? t('costBudget', { budget: formatVnd(rules.budgetVnd, locale) })
              : t('costSub')
          }
          icon={<Coins className="size-5" />}
          tone="warning"
        />
      </div>

      <Flex align="center" gap={8}>
        <CalendarClock className="size-4 shrink-0" />
        <Typography.Text strong>
          {summary.stockOut
            ? t('stockOut', { day: summary.stockOut.day, time: summary.stockOut.time })
            : t('stockLeft', {
                count: summary.leftover,
                percent: Math.round(summary.leftoverRatio * 100),
              })}
        </Typography.Text>
      </Flex>

      {summary.warnings.map((w) => (
        <WarningAlert key={w.key} warning={w} rules={rules} onRulesChange={onRulesChange} />
      ))}

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <Flex vertical gap={8}>
          <Typography.Text strong>{t('perDayTitle')}</Typography.Text>
          <DayBars perDay={summary.perDay} />
        </Flex>
        <Flex vertical gap={8}>
          <Typography.Text strong>{t('perPrizeTitle')}</Typography.Text>
          {summary.perPrize.map((p) => (
            <div key={p.id}>
              <Flex justify="space-between" gap={8}>
                <Typography.Text ellipsis>{p.name}</Typography.Text>
                <Caption className="shrink-0">
                  {t('perPrizeLeft', { left: p.left, quantity: p.quantity })}
                </Caption>
              </Flex>
              <Progress
                percent={p.quantity > 0 ? Math.round((p.issued / p.quantity) * 100) : 0}
                showInfo={false}
                status={p.left === 0 && p.quantity > 0 ? 'exception' : 'normal'}
              />
            </div>
          ))}
        </Flex>
      </div>
    </Flex>
  );
}

function WarningAlert({
  warning,
  rules,
  onRulesChange,
}: {
  warning: SimWarning;
  rules: CampaignRules;
  onRulesChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.sim');
  const canPace = warning.suggestions.includes('turnOnPacing') && !rules.pacing;

  return (
    <Alert
      type={warning.severity}
      showIcon
      title={t(`warnings.${warning.key}`, warning.values)}
      description={
        warning.suggestions.length > 0 ? (
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            {warning.suggestions.map((s) => (
              <li key={s}>{t(`suggestions.${s}`)}</li>
            ))}
          </ul>
        ) : undefined
      }
      action={
        canPace ? (
          <Button onClick={() => onRulesChange({ pacing: true })}>{t('applyPacing')}</Button>
        ) : undefined
      }
    />
  );
}

/** Prizes issued per day as plain bars (no chart dependency). */
function DayBars({ perDay }: { perDay: number[] }) {
  const t = useTranslations('builderLab.rules.sim');
  const { token } = theme.useToken();
  const max = Math.max(1, ...perDay);
  const labelEvery = perDay.length > 14 ? Math.ceil(perDay.length / 7) : 1;

  return (
    <div role="img" aria-label={t('perDayAria', { days: perDay.length })}>
      <Flex justify="space-between">
        <Caption>{t('perDayMax', { max })}</Caption>
      </Flex>
      <div
        className="flex items-end gap-0.5"
        style={{ height: 120, borderBottom: `1px solid ${token.colorBorder}` }}
      >
        {perDay.map((count, i) => (
          <Tooltip
            // biome-ignore lint/suspicious/noArrayIndexKey: days are positional
            key={i}
            title={t('perDayTooltip', { day: i + 1, count })}
          >
            <div
              className="min-w-0 flex-1"
              style={{
                height: `${Math.max(count > 0 ? 3 : 0, (count / max) * 100)}%`,
                background: token.colorPrimary,
                borderRadius: `${token.borderRadiusXS}px ${token.borderRadiusXS}px 0 0`,
                opacity: count > 0 ? 1 : 0.3,
              }}
            />
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-0.5">
        {perDay.map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: days are positional
            key={i}
            className="min-w-0 flex-1 text-center"
          >
            {i % labelEvery === 0 && <Caption>{i + 1}</Caption>}
          </div>
        ))}
      </div>
    </div>
  );
}
