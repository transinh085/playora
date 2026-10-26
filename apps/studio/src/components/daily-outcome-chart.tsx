'use client';

import { Empty, Flex, Typography, theme } from 'antd';

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
 * Uses Ant Design theme tokens exclusively (`docs/engineering/design-system.md` §3.4).
 */
export function DailyOutcomeChart({
  data,
  labels,
}: {
  data: readonly DailyOutcomePoint[];
  labels: DailyOutcomeChartLabels;
}) {
  const { token } = theme.useToken();
  const hasActivity = data.some((d) => d.plays > 0 || d.wins > 0 || d.visits > 0);

  if (data.length === 0 || !hasActivity) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={labels.empty}
        data-testid="daily-chart-empty"
      />
    );
  }

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.plays, d.wins, d.visits]));
  const midVal = Math.ceil(maxVal / 2);
  const ticks = maxVal === 1 ? [0, 1] : [0, midVal, maxVal];
  const slotWidth = PLOT_W / data.length;
  const groupWidth = Math.min(36, Math.max(6, slotWidth * 0.72));
  const barGap = groupWidth >= 15 ? 2 : 0.5;
  const barWidth = Math.max(1.5, (groupWidth - barGap * 2) / 3);
  const labelEvery = data.length > 12 ? Math.ceil(data.length / 8) : 1;
  const formatDay = labels.formatDay ?? defaultFormatDay;

  const yFor = (val: number) => PAD_TOP + PLOT_H - (val / maxVal) * PLOT_H;
  const hFor = (val: number) => (val > 0 ? Math.max(3, (val / maxVal) * PLOT_H) : 0);

  const totalPlays = data.reduce((sum, d) => sum + d.plays, 0);
  const totalWins = data.reduce((sum, d) => sum + d.wins, 0);
  const totalVisits = data.reduce((sum, d) => sum + d.visits, 0);

  const series = [
    { key: 'plays', label: labels.plays, total: totalPlays, color: token.colorInfo },
    { key: 'wins', label: labels.wins, total: totalWins, color: token.colorWarning },
    { key: 'visits', label: labels.visits, total: totalVisits, color: token.colorSuccess },
  ] as const;

  const visitLinePoints = data
    .map((d, i) => {
      const cx = PAD_LEFT + i * slotWidth + slotWidth / 2;
      const cy = yFor(d.visits);
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <Flex vertical gap={12} data-testid="daily-outcome-chart">
      <Flex gap={16} wrap align="center">
        {series.map((s) => (
          <Flex key={s.key} align="center" gap={6}>
            <span
              aria-hidden
              className="inline-block size-2.5 shrink-0"
              style={{ backgroundColor: s.color, borderRadius: 2 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {s.label}: <strong style={{ color: token.colorText }}>{s.total}</strong>
            </Typography.Text>
          </Flex>
        ))}
      </Flex>

      <svg
        role="img"
        aria-label={labels.ariaLabel}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full overflow-visible"
      >
        <title>{labels.ariaLabel}</title>

        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={WIDTH - PAD_RIGHT}
                y2={y}
                stroke={tick === 0 ? token.colorBorder : token.colorBorderSecondary}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fill={token.colorTextSecondary}
                fontSize={10}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const centerX = PAD_LEFT + index * slotWidth + slotWidth / 2;
          const startX = centerX - groupWidth / 2;
          const bars = [
            { key: 'plays', value: point.plays, color: token.colorInfo },
            { key: 'wins', value: point.wins, color: token.colorWarning },
            { key: 'visits', value: point.visits, color: token.colorSuccess },
          ] as const;
          const showLabel = index % labelEvery === 0 || index === data.length - 1;
          const tooltipText = labels.dayTooltip
            ? labels.dayTooltip(point)
            : `${formatDay(point.day)} — ${labels.plays}: ${point.plays}, ${labels.wins}: ${point.wins}, ${labels.visits}: ${point.visits}`;

          return (
            <g key={point.day} data-day={point.day}>
              <title>{tooltipText}</title>
              {bars.map((bar, barIdx) => {
                const h = hFor(bar.value);
                const x = startX + barIdx * (barWidth + barGap);
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
                  fill={token.colorTextSecondary}
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
            stroke={token.colorPrimary}
            strokeWidth={1.75}
            points={visitLinePoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </Flex>
  );
}
