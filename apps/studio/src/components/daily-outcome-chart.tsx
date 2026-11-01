'use client';

import { BarChart2 } from '@playora/ui/icons';
import { useState } from 'react';

export interface DailyOutcomePoint {
  day: string;
  plays: number;
  wins: number;
  visits: number;
}

export interface DailyOutcomeChartLabels {
  ariaLabel: string;
  empty: string;
  plays: string;
  wins: string;
  visits: string;
  formatDay?: (day: string) => string;
  dayTooltip?: (point: DailyOutcomePoint) => string;
}

const WIDTH = 640;
const HEIGHT = 180;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function defaultFormatDay(day: string): string {
  const parts = day.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : day;
}

/**
 * Accessible inline SVG bar + line chart for daily campaign outcomes (`plays · wins · visits`).
 */
export function DailyOutcomeChart({
  data,
  labels,
}: {
  data: readonly DailyOutcomePoint[];
  labels: DailyOutcomeChartLabels;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasActivity = data.some((d) => d.plays > 0 || d.wins > 0 || d.visits > 0);

  if (data.length === 0 || !hasActivity) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"
        data-testid="daily-chart-empty"
      >
        <BarChart2 className="size-8 opacity-40" />
        <p className="text-xs">{labels.empty}</p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.plays, d.wins, d.visits]));
  const midVal = Math.ceil(maxVal / 2);
  const ticks = maxVal === 1 ? [0, 1] : [0, midVal, maxVal];
  const slotWidth = PLOT_W / data.length;
  const isDense = data.length > 21;
  const groupWidth = isDense
    ? Math.max(4, slotWidth * 0.76)
    : Math.min(36, Math.max(8, slotWidth * 0.72));
  const barGap = groupWidth >= 15 ? 2 : 1;
  const barWidth = isDense ? groupWidth : Math.max(2.5, (groupWidth - barGap * 2) / 3);
  const labelEvery = data.length > 12 ? Math.ceil(data.length / 8) : 1;
  const formatDay = labels.formatDay ?? defaultFormatDay;
  const activePoint = activeIndex !== null ? (data[activeIndex] ?? null) : null;

  const yFor = (val: number) => PAD_TOP + PLOT_H - (val / maxVal) * PLOT_H;
  const hFor = (val: number) => (val > 0 ? Math.max(3, (val / maxVal) * PLOT_H) : 0);

  const totalPlays = data.reduce((sum, d) => sum + d.plays, 0);
  const totalWins = data.reduce((sum, d) => sum + d.wins, 0);
  const totalVisits = data.reduce((sum, d) => sum + d.visits, 0);

  const series = [
    { key: 'plays', label: labels.plays, total: totalPlays, color: 'oklch(0.56 0.16 255)' },
    { key: 'wins', label: labels.wins, total: totalWins, color: 'oklch(0.75 0.16 70)' },
    { key: 'visits', label: labels.visits, total: totalVisits, color: 'oklch(0.56 0.15 152)' },
  ];

  const visitLinePoints = data
    .map((d, index) => {
      const centerX = PAD_LEFT + index * slotWidth + slotWidth / 2;
      const y = yFor(d.visits);
      return `${centerX},${y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {activePoint ? (
          <div
            data-testid="daily-chart-tooltip"
            className="inline-flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-surface-secondary/70 px-2.5 py-1 text-xs font-medium text-foreground"
          >
            <span className="font-semibold">{formatDay(activePoint.day)}</span>
            <span>
              {labels.plays}: <strong>{activePoint.plays}</strong>
            </span>
            <span>
              {labels.wins}: <strong>{activePoint.wins}</strong>
            </span>
            <span>
              {labels.visits}: <strong>{activePoint.visits}</strong>
            </span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-4">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-xs"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.label}:</span>
              <span className="font-semibold text-foreground">{s.total}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={labels.ariaLabel}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border/60"
                strokeWidth={0.75}
                strokeDasharray={tick === 0 ? undefined : '2 3'}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
                fontSize={10}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const slotX = PAD_LEFT + index * slotWidth;
          const centerX = slotX + slotWidth / 2;
          const startX = centerX - groupWidth / 2;
          const bars = [
            { key: 'plays', value: point.plays, color: series[0]?.color ?? '#8b5cf6' },
            { key: 'wins', value: point.wins, color: series[1]?.color ?? '#f59e0b' },
            { key: 'visits', value: point.visits, color: series[2]?.color ?? '#10b981' },
          ];
          const showLabel = index % labelEvery === 0 || index === data.length - 1;
          const tooltipText = labels.dayTooltip
            ? labels.dayTooltip(point)
            : `${formatDay(point.day)} — ${labels.plays}: ${point.plays}, ${labels.wins}: ${point.wins}, ${labels.visits}: ${point.visits}`;

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG bar group supports hover and tap tooltip
            <g
              key={point.day}
              data-day={point.day}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => setActiveIndex((prev) => (prev === index ? null : index))}
              className="cursor-pointer"
            >
              <title>{tooltipText}</title>
              <rect
                x={slotX}
                y={PAD_TOP}
                width={slotWidth}
                height={PLOT_H}
                fill={activeIndex === index ? 'currentColor' : 'transparent'}
                className="text-border/20"
                rx={3}
              />
              {bars.map((bar, barIdx) => {
                const h = hFor(bar.value);
                const x = isDense ? startX : startX + barIdx * (barWidth + barGap);
                const y = PAD_TOP + PLOT_H - h;
                return (
                  <rect
                    key={bar.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    rx={Math.min(2, barWidth / 2)}
                    fill={bar.color}
                    opacity={bar.value > 0 ? 0.9 : 0}
                  />
                );
              })}
              {showLabel && (
                <text
                  x={centerX}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                  fontSize={10}
                >
                  {formatDay(point.day)}
                </text>
              )}
            </g>
          );
        })}

        {data.length > 1 && totalVisits > 0 && (
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.75}
            points={visitLinePoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
