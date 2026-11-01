'use client';

import { Button, Card, Skeleton, Tabs } from '@playora/ui/components';
import { useCountUp } from '@playora/ui/hooks/use-count-up';
import { BarChart2, Play } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import type { CampaignListItem, CampaignReport } from '../../../api';
import { campaignRoutes } from '../../../lib/routes';

export interface OutcomeDayPoint {
  day: string;
  label: string;
  plays: number;
  wins: number;
  visits: number;
}

export const DEFAULT_STUDIO_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Formats a `Date` into `YYYY-MM-DD` in the given IANA timezone (defaults to `Asia/Ho_Chi_Minh`). */
export function formatLocalDayKey(date: Date, timeZone = DEFAULT_STUDIO_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/** Builds the rolling last `daysCount` calendar day keys (`YYYY-MM-DD`) in `timeZone`. */
export function buildRollingDayKeys(
  daysCount: number,
  now: Date = new Date(),
  timeZone = DEFAULT_STUDIO_TIMEZONE,
): string[] {
  const todayKey = formatLocalDayKey(now, timeZone);
  const [y, m, d] = todayKey.split('-').map((n) => Number.parseInt(n, 10));
  const anchorUtc = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  const keys: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const dt = new Date(anchorUtc - i * 86_400_000);
    keys.push(dt.toISOString().slice(0, 10));
  }
  return keys;
}

export function formatPeriodDelta(
  current: number,
  prior: number,
): { label: string; color: 'success' | 'danger' | 'default' } {
  if (prior <= 0) {
    if (current <= 0) return { label: '0%', color: 'default' };
    return { label: `+${current} (7d)`, color: 'success' };
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct > 0) return { label: `+${pct}%`, color: 'success' };
  if (pct < 0) return { label: `${pct}%`, color: 'danger' };
  return { label: '0%', color: 'default' };
}

export function computePeriodComparison(
  reportsById: ReadonlyMap<string, CampaignReport>,
  now: Date = new Date(),
  timeZone = DEFAULT_STUDIO_TIMEZONE,
): {
  current7dVisits: number;
  prior7dVisits: number;
  current7dPlays: number;
  prior7dPlays: number;
  returningVisitors: number;
} {
  const keys14 = buildRollingDayKeys(14, now, timeZone);
  const priorSet = new Set(keys14.slice(0, 7));
  const currentSet = new Set(keys14.slice(7));

  let current7dVisits = 0;
  let prior7dVisits = 0;
  let current7dPlays = 0;
  let prior7dPlays = 0;
  let returningVisitors = 0;

  for (const report of reportsById.values()) {
    returningVisitors += report.returningVisitors ?? 0;
    if (!report.byDay) continue;
    for (const item of report.byDay) {
      if (currentSet.has(item.day)) {
        current7dVisits += item.visits;
        current7dPlays += item.plays;
      } else if (priorSet.has(item.day)) {
        prior7dVisits += item.visits;
        prior7dPlays += item.plays;
      }
    }
  }

  return {
    current7dVisits,
    prior7dVisits,
    current7dPlays,
    prior7dPlays,
    returningVisitors,
  };
}

export function OutcomeTrendCard({
  orgId,
  reportsById,
  campaigns,
  isPending,
}: {
  orgId: string;
  reportsById: Map<string, CampaignReport>;
  campaigns: readonly CampaignListItem[];
  isPending?: boolean;
}) {
  const t = useTranslations('campaigns.home.trends');
  const format = useFormatter();
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maskId = useId();
  const routes = campaignRoutes(orgId);

  // Aggregate byDay across all campaign reports
  const chartData = useMemo<OutcomeDayPoint[]>(() => {
    const daysCount = range === '7d' ? 7 : 30;
    const dayMap = new Map<string, { plays: number; wins: number; visits: number }>();

    // Generate rolling last N days in Asia/Ho_Chi_Minh local YYYY-MM-DD
    for (const iso of buildRollingDayKeys(daysCount)) {
      dayMap.set(iso, { plays: 0, wins: 0, visits: 0 });
    }

    // Accumulate each report's byDay
    for (const report of reportsById.values()) {
      if (!report.byDay) continue;
      for (const item of report.byDay) {
        const existing = dayMap.get(item.day);
        if (existing) {
          existing.plays += item.plays;
          existing.wins += item.wins;
          existing.visits += item.visits;
        }
      }
    }

    return Array.from(dayMap.entries()).map(([day, values]) => {
      const parts = day.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : day;
      return {
        day,
        label,
        plays: values.plays,
        wins: values.wins,
        visits: values.visits,
      };
    });
  }, [reportsById, range]);

  const hasActivity = chartData.some((d) => d.plays > 0 || d.wins > 0 || d.visits > 0);
  const totalPlays = chartData.reduce((s, d) => s + d.plays, 0);
  const totalWins = chartData.reduce((s, d) => s + d.wins, 0);
  const totalVisits = chartData.reduce((s, d) => s + d.visits, 0);
  const totalReturningVisitors = useMemo(() => {
    let sum = 0;
    for (const r of reportsById.values()) {
      sum += r.returningVisitors ?? 0;
    }
    return sum;
  }, [reportsById]);

  const activePoint = activeIndex !== null ? chartData[activeIndex] : null;
  const headlineVisits = activePoint ? activePoint.visits : totalVisits;
  const headlinePlays = activePoint ? activePoint.plays : totalPlays;
  const headlineWins = activePoint ? activePoint.wins : totalWins;

  const displayVisits = useCountUp(headlineVisits);
  const firstPlayable = campaigns.find((c) => c.status === 'published' || c.status === 'draft');

  if (isPending) {
    return (
      <Card className="flex h-[320px] flex-col justify-between rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </Card>
    );
  }

  // Dimensions for responsive SVG plot
  const W = 620;
  const H = 170;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 24;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const maxVal = Math.max(1, ...chartData.flatMap((d) => [d.plays, d.wins, d.visits]));
  const stepX = chartData.length > 1 ? PLOT_W / (chartData.length - 1) : PLOT_W;

  const getX = (idx: number) => PAD_L + idx * stepX;
  const getY = (val: number) => PAD_T + PLOT_H - (val / maxVal) * PLOT_H;

  // Build SVG path strings
  const visitsPoints = chartData.map((d, i) => [getX(i), getY(d.visits)] as const);
  const playsPoints = chartData.map((d, i) => [getX(i), getY(d.plays)] as const);

  const buildLinePath = (pts: readonly (readonly [number, number])[]) =>
    pts.reduce((acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), '');

  const buildAreaPath = (pts: readonly (readonly [number, number])[]) => {
    if (pts.length === 0) return '';
    const firstPoint = pts[0];
    const lastPoint = pts[pts.length - 1];
    if (!firstPoint || !lastPoint) return '';
    const line = buildLinePath(pts);
    const lastX = lastPoint[0];
    const firstX = firstPoint[0];
    const bottomY = PAD_T + PLOT_H;
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const visitsArea = buildAreaPath(visitsPoints);
  const visitsLine = buildLinePath(visitsPoints);
  const playsLine = buildLinePath(playsPoints);

  return (
    <Card
      className="flex flex-col gap-4 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card"
      data-testid="home-outcome-trend"
    >
      {/* Top Bar: Title & 7d/30d Segmented Filter */}
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3 p-0">
        <div className="flex flex-col gap-0.5">
          <Card.Title className="text-body-medium text-text-primary">{t('title')}</Card.Title>
          <Card.Description className="text-caption-1-regular text-text-tertiary">
            {activePoint ? activePoint.day : range === '7d' ? t('range7d') : t('range30d')}
          </Card.Description>
        </div>

        <Tabs
          selectedKey={range}
          onSelectionChange={(key) => {
            if (key === '7d' || key === '30d') setRange(key);
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('title')}>
              <Tabs.Tab id="7d">
                {t('range7d')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="30d">
                {t('range30d')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4 p-0">
        {/* Metrics Row: Large Count-up for Visits & Sub-stats */}
        <div className="flex flex-wrap items-baseline gap-6 border-b border-separator-border pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-title-1-semibold tabular-nums text-text-primary">
              {format.number(displayVisits)}
            </span>
            <span className="flex items-center gap-1.5 text-caption-1-medium text-emerald-600 dark:text-emerald-400">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              {t('redeemed')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-caption-1-regular text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-teal-500" />
              <span>{t('plays')}:</span>
              <strong className="font-semibold tabular-nums text-text-primary">
                {format.number(headlinePlays)}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              <span>{t('wins')}:</span>
              <strong className="font-semibold tabular-nums text-text-primary">
                {format.number(headlineWins)}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-violet-500" />
              <span>{t('returning')}:</span>
              <strong className="font-semibold tabular-nums text-text-primary">
                {format.number(totalReturningVisitors)}
              </strong>
            </div>
          </div>
        </div>

        {/* Main Chart or Empty State */}
        {!hasActivity ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-4 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background-primary-default text-text-tertiary shadow-xs">
              <BarChart2 className="size-5" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="text-body-medium text-text-primary">{t('emptyTitle')}</p>
              <p className="text-caption-1-regular text-text-tertiary">{t('emptyDesc')}</p>
            </div>
            {firstPlayable && (
              <Link href={routes.rehearsal(firstPlayable.id) as never}>
                <Button size="sm" variant="secondary" excludeFromTabOrder>
                  <Play className="size-4" />
                  {t('playRehearsal')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full overflow-visible"
              role="img"
              aria-label={t('title')}
            >
              <defs>
                <linearGradient id={`${maskId}-visits`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.16 155)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="oklch(0.68 0.16 155)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line
                x1={PAD_L}
                y1={PAD_T}
                x2={W - PAD_R}
                y2={PAD_T}
                stroke="var(--color-separator-border)"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <line
                x1={PAD_L}
                y1={PAD_T + PLOT_H / 2}
                x2={W - PAD_R}
                y2={PAD_T + PLOT_H / 2}
                stroke="var(--color-separator-border)"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <line
                x1={PAD_L}
                y1={PAD_T + PLOT_H}
                x2={W - PAD_R}
                y2={PAD_T + PLOT_H}
                stroke="var(--color-separator-border)"
                strokeWidth="1"
              />

              {/* Y axis ticks */}
              <text
                x={PAD_L - 8}
                y={PAD_T + 4}
                textAnchor="end"
                className="fill-text-tertiary text-[10px] tabular-nums"
              >
                {maxVal}
              </text>
              <text
                x={PAD_L - 8}
                y={PAD_T + PLOT_H / 2 + 4}
                textAnchor="end"
                className="fill-text-tertiary text-[10px] tabular-nums"
              >
                {Math.round(maxVal / 2)}
              </text>
              <text
                x={PAD_L - 8}
                y={PAD_T + PLOT_H}
                textAnchor="end"
                className="fill-text-tertiary text-[10px] tabular-nums"
              >
                0
              </text>

              {/* Areas and lines */}
              <path d={visitsArea} fill={`url(#${maskId}-visits)`} />
              <path
                d={playsLine}
                fill="none"
                stroke="oklch(0.65 0.14 200)"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
              <path
                d={visitsLine}
                fill="none"
                stroke="oklch(0.62 0.16 155)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Interactive column hover targets */}
              {chartData.map((d, i) => {
                const x = getX(i);
                const isHovered = activeIndex === i;
                const labelStep = range === '30d' ? 5 : 1;
                const showLabel = i % labelStep === 0 || i === chartData.length - 1;

                return (
                  <g key={d.day}>
                    {/* Invisible hit box */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: chart hover guide hit area */}
                    <rect
                      x={x - stepX / 2}
                      y={PAD_T}
                      width={stepX}
                      height={PLOT_H}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(null)}
                      aria-label={`${d.label}: ${d.visits} ${t('redeemed')}`}
                    />

                    {/* Vertical guide line on hover */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={PAD_T}
                        x2={x}
                        y2={PAD_T + PLOT_H}
                        stroke="var(--color-border-focus-ring)"
                        strokeWidth="1"
                      />
                    )}

                    {/* Active dot */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={getY(d.visits)}
                        r={4}
                        fill="oklch(0.62 0.16 155)"
                        stroke="var(--color-background-primary-default)"
                        strokeWidth="2"
                      />
                    )}

                    {/* X Axis Label */}
                    {showLabel && (
                      <text
                        x={x}
                        y={H - 6}
                        textAnchor="middle"
                        className={cx(
                          'text-[10px] tabular-nums transition-colors',
                          isHovered ? 'fill-text-primary font-semibold' : 'fill-text-tertiary',
                        )}
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
