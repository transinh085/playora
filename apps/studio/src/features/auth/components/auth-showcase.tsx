'use client';

import { Card, Chip, PhoneMockup, Separator } from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import {
  RiCheckboxCircleFill,
  RiCoupon3Line,
  RiGift2Fill,
  RiQrScan2Line,
  RiSparklingFill,
  RiStore2Line,
  RiUserHeartLine,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const WHEEL_SLICES = [
  { key: 'sizeUp', code: 'MỘC-88A', color: 'var(--team-1)' },
  { key: 'topping', code: 'MỘC-19C', color: 'var(--team-2)' },
  { key: 'discount20', code: 'MỘC-42K', color: 'var(--team-3)' },
  { key: 'buy1get1', code: 'MỘC-77P', color: 'var(--team-4)' },
  { key: 'sizeUp', code: 'MỘC-95T', color: 'var(--team-5)' },
  { key: 'topping', code: 'MỘC-63M', color: 'var(--team-6)' },
] as const;

export function AuthShowcase() {
  const t = useTranslations('auth.showcase');
  const [rotation, setRotation] = useState(24);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonIndex, setWonIndex] = useState(0);
  const [stockLeft, setStockLeft] = useState(312);

  function handleTrySpin() {
    if (isSpinning) return;
    setIsSpinning(true);
    const nextIndex = (wonIndex + 1) % WHEEL_SLICES.length;
    const extraTurns = 360 * 3 + (360 - nextIndex * 60);
    setRotation((prev) => prev + extraTurns);
    window.setTimeout(() => {
      setWonIndex(nextIndex);
      setStockLeft((prev) => (prev > 290 ? prev - 1 : 312));
      setIsSpinning(false);
    }, 900);
  }

  const currentPrize = WHEEL_SLICES[wonIndex] ?? WHEEL_SLICES[0];
  const prizeLabel = t(`prizes.${currentPrize.key}`);

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-background-secondary-default p-8 lg:p-10">
      {/* Subtle geometric dot grid & ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-65"
        style={{
          backgroundImage:
            'radial-gradient(circle at 75% 25%, color-mix(in oklab, var(--primary) 16%, transparent) 0%, transparent 55%), radial-gradient(circle at 20% 80%, color-mix(in oklab, var(--spotlight-400) 14%, transparent) 0%, transparent 50%)',
        }}
      />

      {/* Top Headline */}
      <div className="relative z-10 flex flex-col items-start gap-3">
        <Chip variant="soft" size="sm" color="accent" className="gap-1">
          <RiSparklingFill className="size-3.5" aria-hidden />
          <span>{t('badge')}</span>
        </Chip>
        <h2 className="m-0 max-w-[38ch] text-title-2-semibold text-text-primary">
          {t('headline')}
        </h2>
      </div>

      {/* Center Stage: Interactive Phone Mockup + Floating Outcome Cards */}
      <div className="relative z-10 my-6 flex flex-1 items-center justify-center py-2">
        {/* Floating Card 1: Counter Verification Ticket (Top Right) */}
        <Card className="absolute -top-2 right-0 z-20 hidden w-[236px] gap-1.5 border border-border-button-default bg-background-primary-default/95 p-3.5 shadow-dropdown backdrop-blur-md xl:flex">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-caption-2-semibold text-emerald-600 dark:text-emerald-400">
              <RiCheckboxCircleFill className="size-3.5 shrink-0" />
              <span>{t('counterCardTitle')}</span>
            </span>
            <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 font-mono text-caption-2-semibold tabular-nums text-text-primary">
              {currentPrize.code}
            </span>
          </div>
          <p className="m-0 truncate text-body-2-semibold text-text-primary">{prizeLabel}</p>
          <Separator className="my-0.5" />
          <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
            <RiQrScan2Line className="size-3.5 shrink-0 text-foreground-icon-secondary" />
            <span className="truncate">{t('counterCardMeta')}</span>
          </div>
        </Card>

        {/* Realistic Phone Mockup with Interactive Lucky Wheel */}
        <PhoneMockup
          size="xs"
          finish="titanium-dark"
          screenClassName="bg-[#6f000b] text-white"
          className="shadow-dropdown"
        >
          <div className="flex h-full flex-col justify-between px-3.5 pt-8 pb-5 text-center">
            {/* Store Pill & Transparent Stock Counter */}
            <div className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium text-amber-200 backdrop-blur-xs">
                <RiStore2Line className="size-2.5" />
                <span>{t('shopName')}</span>
              </span>
              <p className="m-0 font-display text-[13px] leading-tight font-bold tracking-tight text-amber-300">
                {t('campaignTitle')}
              </p>
              <span className="rounded-md bg-black/25 px-2 py-0.5 text-[9px] font-medium tabular-nums text-white/85">
                {t('stockLeft', { left: stockLeft, total: 400 })}
              </span>
            </div>

            {/* Interactive SVG Wheel */}
            <div className="relative mx-auto my-1 flex size-[138px] items-center justify-center">
              {/* Top Pointer */}
              <div
                aria-hidden="true"
                className="absolute -top-1.5 left-1/2 z-20 -translate-x-1/2 drop-shadow-sm"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 15L2 3h12L8 15Z" fill="#facf4e" stroke="#6f000b" strokeWidth="1.5" />
                </svg>
              </div>

              <svg
                aria-hidden="true"
                viewBox="0 0 120 120"
                className="size-full rounded-full shadow-[0_0_0_4px_#facf4e,0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-900 ease-[cubic-bezier(0.2,0.85,0.25,1)]"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <circle cx="60" cy="60" r="58" fill="#fff7ed" />
                {WHEEL_SLICES.map((slice, idx) => {
                  const startAngle = (idx * 60 - 90) * (Math.PI / 180);
                  const endAngle = ((idx + 1) * 60 - 90) * (Math.PI / 180);
                  const x1 = 60 + 58 * Math.cos(startAngle);
                  const y1 = 60 + 58 * Math.sin(startAngle);
                  const x2 = 60 + 58 * Math.cos(endAngle);
                  const y2 = 60 + 58 * Math.sin(endAngle);
                  const fill = idx % 2 === 0 ? '#dc2626' : '#fef3c7';
                  const dotFill = idx % 2 === 0 ? '#fde68a' : '#dc2626';
                  const midAngle = ((idx + 0.5) * 60 - 90) * (Math.PI / 180);
                  const gx = 60 + 36 * Math.cos(midAngle);
                  const gy = 60 + 36 * Math.sin(midAngle);
                  return (
                    <g key={`${slice.key}-${slice.code}`}>
                      <path
                        d={`M60,60 L${x1},${y1} A58,58 0 0,1 ${x2},${y2} Z`}
                        fill={fill}
                        stroke="#facf4e"
                        strokeWidth="1"
                      />
                      <circle cx={gx} cy={gy} r="5.5" fill={dotFill} />
                    </g>
                  );
                })}
                <circle cx="60" cy="60" r="14" fill="#6f000b" stroke="#facf4e" strokeWidth="3" />
                <circle cx="60" cy="60" r="5" fill="#facf4e" />
              </svg>
            </div>

            {/* Won Voucher Mini Pill + Interactive Spin Button */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-1 rounded-lg bg-black/30 px-2 py-1 text-[9.5px] font-medium text-amber-200">
                <RiGift2Fill className="size-3 shrink-0 text-amber-300" />
                <span className="truncate">
                  {t('wonToast', { prize: prizeLabel, code: currentPrize.code })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTrySpin}
                className={cx(
                  'w-full cursor-pointer rounded-xl bg-[#facf4e] py-1.5 font-display text-[10.5px] font-bold text-[#6f000b] shadow-[0_3px_0_#b45309] transition-transform active:translate-y-0.5',
                  isSpinning && 'opacity-80',
                )}
              >
                {isSpinning ? t('spinning') : t('spinCta')}
              </button>
            </div>
          </div>
        </PhoneMockup>

        {/* Floating Card 2: Business Outcome Metrics (Bottom Left) */}
        <Card className="absolute -bottom-2 left-0 z-20 hidden w-[244px] gap-2 border border-border-button-default bg-background-primary-default/95 p-3.5 shadow-dropdown backdrop-blur-md xl:flex">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-caption-2-semibold text-text-secondary">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>{t('outcomeCardTitle')}</span>
            </span>
            <RiUserHeartLine className="size-3.5 text-accent-600" />
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="m-0 text-body-2-semibold tabular-nums text-text-primary">
                {stockLeft === 312 ? '312' : String(312 + (312 - stockLeft))}
              </p>
              <p className="m-0 truncate text-[10px] text-text-tertiary">{t('outcomeVisits')}</p>
            </div>
            <div>
              <p className="m-0 text-body-2-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                31%
              </p>
              <p className="m-0 truncate text-[10px] text-text-tertiary">{t('outcomeReturning')}</p>
            </div>
            <div>
              <p className="m-0 text-body-2-semibold tabular-nums text-text-primary">4.487đ</p>
              <p className="m-0 truncate text-[10px] text-text-tertiary">
                {t('outcomeCostPerVisit')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Compact Outcome Strip (Always visible on md+) */}
      <Card className="relative z-10 flex-row items-center justify-between gap-3 border border-border-button-default bg-background-primary-default/80 px-4 py-3 backdrop-blur-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600">
            <RiCoupon3Line className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate text-caption-1-semibold text-text-primary">
              {t('counterCardTitle')} · {prizeLabel}
            </p>
            <p className="m-0 truncate text-caption-2-regular text-text-secondary">
              {t('outcomeVisits')}: <strong className="tabular-nums">312</strong> ·{' '}
              {t('outcomeReturning')}: <strong className="tabular-nums">97 (31%)</strong>
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 font-mono text-caption-2-semibold tabular-nums text-text-primary">
          {currentPrize.code}
        </span>
      </Card>
    </div>
  );
}
