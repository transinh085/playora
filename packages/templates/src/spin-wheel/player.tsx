'use client';

import type { BrandKit, LocalizedText, PlayerProps } from '@playora/game-sdk';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import type { BrandKitTheme, Skin as UiSkin } from '@playora/ui/lib/game-theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpinWheelConfig, SpinWheelDisplay } from './definition';

function pickText(text: LocalizedText | undefined, locale: 'vi' | 'en', fallback: string): string {
  if (!text) return fallback;
  if (locale === 'en' && text.en && text.en.trim().length > 0) {
    return text.en;
  }
  return text.vi || fallback;
}

function toUiSkin(skin?: string): UiSkin {
  if (skin === 'tet' || skin === 'yep' || skin === 'classic') return skin;
  return 'classic';
}

function toBrandTheme(brand: BrandKit): BrandKitTheme {
  return {
    primary: brand.colors.primary,
    accent: brand.colors.accent ?? brand.colors.secondary,
    background: brand.colors.background,
    text: brand.colors.text,
    fontDisplay: brand.fontHeading,
  };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function SpinWheelPlayer({
  config,
  brand,
  assets,
  skin,
  locale,
  session,
  onFinished,
}: PlayerProps<SpinWheelConfig, SpinWheelDisplay>) {
  const segments = config.segments?.length ? config.segments : [];
  const sliceCount = Math.max(segments.length, 1);
  const sliceAngle = 360 / sliceCount;

  const [rotationDeg, setRotationDeg] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedResult, setRevealedResult] = useState(session.result);
  const spinIterationRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const result = session.result;
    if (!result) {
      setRevealedResult(null);
      setIsAnimating(false);
      return;
    }

    const targetIdx = Math.max(0, Math.min(sliceCount - 1, result.display.segmentIndex ?? 0));
    const segmentCenterAngle = targetIdx * sliceAngle + sliceAngle / 2;
    spinIterationRef.current += 1;
    const totalSpins = Math.max(3, config.spins ?? 5) * spinIterationRef.current;
    const nextRotation = totalSpins * 360 + (360 - segmentCenterAngle);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const effectiveDurationMs = prefersReducedMotion ? 0 : Math.max(0, config.durationMs ?? 3000);

    setRotationDeg(nextRotation);

    if (effectiveDurationMs === 0) {
      setIsAnimating(false);
      setRevealedResult(result);
      onFinishedRef.current();
      return;
    }

    setIsAnimating(true);
    setRevealedResult(null);
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setRevealedResult(result);
      onFinishedRef.current();
    }, effectiveDurationMs);

    return () => clearTimeout(timer);
  }, [session.result, sliceCount, sliceAngle, config.spins, config.durationMs]);

  const title = pickText(config.copy?.title, locale, 'Vòng quay may mắn');
  const cta = pickText(config.copy?.cta, locale, 'Quay ngay');
  const bgUrl =
    assets.url('background') ??
    (config.backgroundImage ? assets.url(config.backgroundImage) : undefined);
  const centerLogoUrl =
    assets.url('centerLogo') ??
    (config.centerLogo ? assets.url(config.centerLogo) : undefined) ??
    brand.logoUrl;

  const brandTheme = useMemo(() => toBrandTheme(brand), [brand]);

  const activeResult = revealedResult ?? (!isAnimating ? session.result : null);
  const landedSegment =
    activeResult && segments[activeResult.display.segmentIndex]
      ? segments[activeResult.display.segmentIndex]
      : undefined;

  const canSpin = !isAnimating && session.state !== 'starting' && session.state !== 'blocked';

  return (
    <GameRoot
      data-testid="spin-wheel-player"
      skin={toUiSkin(skin)}
      brand={brandTheme}
      style={
        bgUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, color-mix(in oklch, var(--game-bg) 72%, transparent), color-mix(in oklch, var(--game-bg) 90%, transparent)), url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className="flex min-h-dvh flex-col items-center justify-between px-4 py-6 text-game-fg"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-game text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      </header>

      <div className="relative my-4 flex items-center justify-center">
        {/* Pointer arrow at top */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 z-20 h-0 w-0 border-x-12 border-t-20 border-x-transparent border-t-game-accent drop-shadow-md"
        />

        <div className="relative size-72 rounded-full border-8 border-game-border bg-game-surface p-2 shadow-2xl sm:size-80">
          <svg
            viewBox="0 0 200 200"
            className="size-full rounded-full"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: isAnimating
                ? `transform ${config.durationMs ?? 3000}ms cubic-bezier(0.16, 1, 0.3, 1)`
                : 'none',
            }}
          >
            <title>{title}</title>
            {segments.map((seg, idx) => {
              const startAngle = idx * sliceAngle;
              const endAngle = startAngle + sliceAngle;
              const midAngle = startAngle + sliceAngle / 2;
              const labelPos = polarToCartesian(100, 100, 62, midAngle);
              const segLabel = pickText(seg.label, locale, `#${idx + 1}`);

              return (
                <g key={`${seg.prizeSlot}-${startAngle}`}>
                  <path
                    d={describeSlice(100, 100, 98, startAngle, endAngle)}
                    fill={seg.color || 'var(--game-primary)'}
                    stroke="var(--game-border)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fill="var(--game-fg)"
                    fontSize="8"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {segLabel.slice(0, 16)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center hub */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border-4 border-game-border bg-game-surface shadow-md">
              {centerLogoUrl ? (
                <img src={centerLogoUrl} alt="" className="size-11 object-contain" />
              ) : (
                <span className="font-game text-xs font-bold text-game-primary">★</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex w-full max-w-sm flex-col items-center gap-3">
        {activeResult ? (
          <div
            data-testid="spin-wheel-result"
            data-outcome={activeResult.outcome.kind}
            className="w-full rounded-game border border-game-border bg-game-surface px-4 py-3 text-center backdrop-blur-sm"
          >
            <p className="font-game text-base font-bold">
              {activeResult.outcome.kind === 'win'
                ? pickText(
                    activeResult.outcome.prize.name,
                    locale,
                    'Chúc mừng bạn đã trúng thưởng!',
                  )
                : activeResult.outcome.kind === 'out_of_stock'
                  ? locale === 'en'
                    ? 'Out of stock'
                    : 'Đã hết quà'
                  : locale === 'en'
                    ? 'Better luck next time'
                    : 'Chúc bạn may mắn lần sau'}
            </p>
            {landedSegment ? (
              <p className="mt-1 text-xs opacity-80">{pickText(landedSegment.label, locale, '')}</p>
            ) : null}
          </div>
        ) : null}

        <GameButton
          type="button"
          data-testid="spin-wheel-start"
          variant="primary"
          size="lg"
          disabled={!canSpin}
          onClick={() => {
            void session.start();
          }}
          className="w-full"
        >
          {cta}
        </GameButton>
      </footer>
    </GameRoot>
  );
}
