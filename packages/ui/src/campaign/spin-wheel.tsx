'use client';

import { useMemo, useState } from 'react';
import type { MechanismProps } from './mechanism';
import { usePlayRound, useReducedMotion } from './use-play-round';
import { buildSlices, sliceCenter, targetRotation, targetSliceIndex } from './wheel-math';

const SPIN_MS = 4800;
const R = 44;

const point = (deg: number, radius: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(50 + radius * Math.cos(a)).toFixed(3)} ${(50 + radius * Math.sin(a)).toFixed(3)}`;
};

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Wraps a radial wheel slice label across up to 2 balanced lines (`<= 22` chars total) so
 * Vietnamese F&B prize names ("Free 1 Ly Trà Sữa", "Mua 1 Tặng 1") stay legible without harsh
 * 11-char single-line truncation (GAM-04).
 */
export function wrapWheelLabel(text: string, maxPerLine = 11): [string] | [string, string] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxPerLine) return [clean];

  const words = clean.split(' ');
  if (words.length === 1) {
    return [clean.slice(0, maxPerLine), truncate(clean.slice(maxPerLine), maxPerLine)];
  }

  let line1 = '';
  let splitIdx = 0;
  for (let i = 0; i < words.length; i++) {
    const candidate = line1 ? `${line1} ${words[i]}` : (words[i] ?? '');
    if (candidate.length <= maxPerLine || i === 0) {
      line1 = candidate;
      splitIdx = i + 1;
    } else {
      break;
    }
  }

  if (splitIdx >= words.length) {
    return [truncate(line1, maxPerLine)];
  }

  const rest = words.slice(splitIdx).join(' ');
  return [truncate(line1, maxPerLine), truncate(rest, maxPerLine)];
}

/** SVG prize wheel: slices = prizes interleaved with "good luck"; lands on the server's result. */
export function SpinWheel({ brand, prizes, play, labels }: Omit<MechanismProps, 'mechanism'>) {
  const reduced = useReducedMotion();
  const slices = useMemo(() => buildSlices(prizes), [prizes]);
  const count = slices.length;
  const sliceDeg = 360 / count;
  const [rotation, setRotation] = useState(() => -sliceCenter(0, count));
  const [landed, setLanded] = useState<number | null>(null);
  const round = usePlayRound(play);
  const spinning = round.phase === 'reveal' && landed === null;
  const pending = round.phase === 'pending';
  const duration = reduced ? 0 : SPIN_MS;

  const spin = async () => {
    if (!round.interactive) return;
    const result = await round.start();
    if (!result) return;
    const index = targetSliceIndex(slices, result);
    const turns = 4 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * 0.6;
    setRotation((current) => targetRotation(current, index, count, turns, jitter));
    setTimeout(() => setLanded(index), duration + 50);
    round.finish(result, duration + (reduced ? 350 : 700));
  };

  const fontSize = count <= 6 ? 3.9 : count <= 8 ? 3.4 : 2.95;
  const maxLineChars = count <= 6 ? 12 : 11;

  return (
    <div
      data-testid="spin-wheel-stage"
      data-phase={round.phase}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: play?.disabled ? 0.55 : 1,
        transition: 'opacity 200ms',
      }}
    >
      <button
        type="button"
        onClick={spin}
        disabled={!round.interactive}
        aria-label={labels.wheelLabel}
        style={{
          all: 'unset',
          width: '100%',
          height: '100%',
          cursor: round.interactive ? 'pointer' : 'default',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
          <title>{labels.wheelLabel}</title>
          <defs>
            <radialGradient id="wheel-rim-glow" cx="50%" cy="50%" r="50%">
              <stop offset="82%" stopColor={brand.primary} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="51.8" r="49" fill="rgba(0,0,0,.28)" />
          <circle
            cx="50"
            cy="50"
            r="49"
            fill={brand.primary}
            stroke={brand.accent}
            strokeWidth="1.2"
          />
          <circle
            cx="50"
            cy="50"
            r="44.8"
            fill="none"
            stroke={brand.accent}
            strokeWidth="0.6"
            opacity="0.65"
          />
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformBox: 'view-box',
              transformOrigin: '50px 50px',
              transition: `transform ${duration}ms cubic-bezier(.12,.6,.08,1)`,
            }}
          >
            {slices.map((slice, i) => {
              const a0 = i * sliceDeg;
              const a1 = (i + 1) * sliceDeg;
              const isPrize = slice.kind === 'prize';
              const key = `${i}-${isPrize ? slice.prize.id : 'luck'}`;
              const rawLabel = isPrize ? slice.prize.name : labels.luck;
              const lines = wrapWheelLabel(rawLabel, maxLineChars);
              const textX = 50 + R - (isPrize && slice.prize.image ? 12.5 : 3.5);
              return (
                <g key={key}>
                  <path
                    d={`M50 50 L${point(a0, R)} A${R} ${R} 0 0 1 ${point(a1, R)} Z`}
                    fill={isPrize ? brand.accent : i % 4 === 1 ? brand.surface : brand.background}
                    stroke={brand.primary}
                    strokeWidth="0.55"
                  />
                  {landed === i && (
                    <path
                      d={`M50 50 L${point(a0, R)} A${R} ${R} 0 0 1 ${point(a1, R)} Z`}
                      fill="#ffffff"
                      style={{ animation: reduced ? undefined : 'mech-wheel-flash 500ms 3' }}
                      opacity={0.35}
                    />
                  )}
                  <g transform={`rotate(${sliceCenter(i, count) - 90} 50 50)`}>
                    {isPrize && slice.prize.image && (
                      <image
                        href={slice.prize.image}
                        x={50 + R - 10.8}
                        y={50 - 4.2}
                        width="8.4"
                        height="8.4"
                        transform={`rotate(90 ${50 + R - 6.6} 50)`}
                      />
                    )}
                    <text
                      x={textX}
                      y={50}
                      textAnchor="end"
                      dominantBaseline="central"
                      fill={isPrize ? brand.primary : brand.text}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize,
                      }}
                    >
                      {lines.length === 1 ? (
                        lines[0]
                      ) : (
                        <>
                          <tspan x={textX} dy="-0.55em">
                            {lines[0]}
                          </tspan>
                          <tspan x={textX} dy="1.15em">
                            {lines[1]}
                          </tspan>
                        </>
                      )}
                    </text>
                  </g>
                </g>
              );
            })}
            {/* Metallic slice divider pegs */}
            {slices.map((_, i) => {
              const [px, py] = point(i * sliceDeg, R - 0.6).split(' ');
              return (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed slice pegs
                  key={`peg-${i}`}
                  cx={px}
                  cy={py}
                  r="0.85"
                  fill={brand.text}
                  stroke={brand.primary}
                  strokeWidth="0.3"
                />
              );
            })}
          </g>
          {/* Outer rim marquee bulbs */}
          <g data-testid="wheel-rim-pegs">
            {Array.from({ length: count * 2 }, (_, i) => {
              const [x, y] = point((i * 180) / count, 46.8).split(' ');
              return (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bulbs
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.15"
                  fill={i % 2 ? brand.text : brand.accent}
                  style={{
                    animation:
                      (spinning || pending) && !reduced
                        ? `mech-wheel-bulb 320ms ${(i % 2) * 160}ms infinite alternate`
                        : undefined,
                  }}
                />
              );
            })}
          </g>
          {/* Center hub */}
          <circle cx="50" cy="50" r="12" fill={brand.primary} />
          <circle
            cx="50"
            cy="50"
            r="10.2"
            fill={brand.accent}
            stroke={brand.text}
            strokeWidth="0.9"
            style={{
              animation:
                (round.interactive || pending) && !reduced
                  ? `mech-wheel-pulse ${pending ? '0.6s' : '1.4s'} ease-in-out infinite`
                  : undefined,
              transformBox: 'view-box',
              transformOrigin: '50px 50px',
            }}
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill={brand.primary}
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 4.5 }}
          >
            {pending ? '…' : labels.spin}
          </text>
          {/* Spring-deflecting pointer */}
          <g
            data-testid="wheel-pointer"
            style={{
              transformBox: 'view-box',
              transformOrigin: '50px 2px',
              animation:
                spinning && !reduced ? 'mech-pointer-tick 220ms ease-in-out infinite' : undefined,
            }}
          >
            <path
              d="M50 13.5 L44.2 1.8 Q50 -0.6 55.8 1.8 Z"
              fill={brand.text}
              stroke={brand.primary}
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="3.8" r="1.6" fill={brand.accent} />
          </g>
        </svg>
      </button>
    </div>
  );
}
