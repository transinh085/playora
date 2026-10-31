'use client';

import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { Input } from '@playora/ui/components/input';
import { Progress } from '@playora/ui/components/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import { CalendarClock, Coins, Gift, Percent, Users } from '@playora/ui/icons';
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {t.rich('input', {
          n: () => (
            <Input
              type="number"
              aria-label={t('inputLabel')}
              min={1}
              max={MAX_PLAYERS_PER_DAY}
              step={50}
              className="inline-block h-8 w-24 rounded-md font-mono text-xs"
              value={playersPerDay}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 1) setPlayersPerDay(val);
              }}
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
        <Alert>
          <AlertTitle>{blocked ? t('blocked') : t('noPrizes')}</AlertTitle>
        </Alert>
      ) : 'error' in outcome ? (
        <Alert variant="destructive">
          <AlertTitle>{t('failed')}</AlertTitle>
        </Alert>
      ) : (
        <SimResult summary={outcome.summary} rules={campaign.rules} onRulesChange={onRulesChange} />
      )}
    </div>
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
    <div className="flex flex-col gap-4">
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

      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-sm">
          {summary.stockOut
            ? t('stockOut', { day: summary.stockOut.day, time: summary.stockOut.time })
            : t('stockLeft', {
                count: summary.leftover,
                percent: Math.round(summary.leftoverRatio * 100),
              })}
        </span>
      </div>

      {summary.warnings.map((w) => (
        <WarningAlert key={w.key} warning={w} rules={rules} onRulesChange={onRulesChange} />
      ))}

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">{t('perDayTitle')}</span>
          <DayBars perDay={summary.perDay} />
        </div>
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-sm">{t('perPrizeTitle')}</span>
          {summary.perPrize.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{p.name}</span>
                <Caption className="shrink-0">
                  {t('perPrizeLeft', { left: p.left, quantity: p.quantity })}
                </Caption>
              </div>
              <Progress
                value={p.quantity > 0 ? Math.round((p.issued / p.quantity) * 100) : 0}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <Alert>
      <AlertTitle>{t(`warnings.${warning.key}`, warning.values)}</AlertTitle>
      {warning.suggestions.length > 0 && (
        <AlertDescription className="mt-1">
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-xs">
            {warning.suggestions.map((s) => (
              <li key={s}>{t(`suggestions.${s}`)}</li>
            ))}
          </ul>
        </AlertDescription>
      )}
      {canPace && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-md text-xs"
            onClick={() => onRulesChange({ pacing: true })}
          >
            {t('applyPacing')}
          </Button>
        </div>
      )}
    </Alert>
  );
}

/** Prizes issued per day as plain bars (no chart dependency). */
function DayBars({ perDay }: { perDay: number[] }) {
  const t = useTranslations('builderLab.rules.sim');
  const max = Math.max(1, ...perDay);
  const labelEvery = perDay.length > 14 ? Math.ceil(perDay.length / 7) : 1;

  return (
    <div role="img" aria-label={t('perDayAria', { days: perDay.length })}>
      <div className="flex justify-between">
        <Caption>{t('perDayMax', { max })}</Caption>
      </div>
      <TooltipProvider>
        <div className="flex h-[120px] items-end gap-0.5 border-b border-border pb-0.5">
          {perDay.map((count, i) => (
            <Tooltip
              // biome-ignore lint/suspicious/noArrayIndexKey: days are positional
              key={i}
            >
              <TooltipTrigger asChild>
                <div
                  className="min-w-0 flex-1 rounded-t bg-primary transition-all hover:opacity-80"
                  style={{
                    height: `${Math.max(count > 0 ? 3 : 0, (count / max) * 100)}%`,
                    opacity: count > 0 ? 1 : 0.3,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{t('perDayTooltip', { day: i + 1, count })}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="flex gap-0.5 mt-1">
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
