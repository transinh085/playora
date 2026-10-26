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
    round.finish(result, duration + (reduced ? 400 : 900));
  };

  const fontSize = count <= 6 ? 4.4 : count <= 8 ? 3.8 : 3.2;
  const maxChars = count <= 6 ? 13 : 11;

  return (
    <div
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
          <circle cx="50" cy="51.5" r="49" fill="rgba(0,0,0,.25)" />
          <circle
            cx="50"
            cy="50"
            r="49"
            fill={brand.primary}
            stroke={brand.accent}
            strokeWidth="1"
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
              return (
                <g key={key}>
                  <path
                    d={`M50 50 L${point(a0, R)} A${R} ${R} 0 0 1 ${point(a1, R)} Z`}
                    fill={isPrize ? brand.accent : i % 4 === 1 ? brand.surface : brand.background}
                    stroke={brand.primary}
                    strokeWidth="0.5"
                  />
                  {landed === i && (
                    <path
                      d={`M50 50 L${point(a0, R)} A${R} ${R} 0 0 1 ${point(a1, R)} Z`}
                      fill="#ffffff"
                      style={{ animation: reduced ? undefined : 'mech-wheel-flash 600ms 3' }}
                      opacity={0.3}
                    />
                  )}
                  <g transform={`rotate(${sliceCenter(i, count) - 90} 50 50)`}>
                    {isPrize && slice.prize.image && (
                      <image
                        href={slice.prize.image}
                        x={50 + R - 11}
                        y={50 - 4.5}
                        width="9"
                        height="9"
                        transform={`rotate(90 ${50 + R - 6.5} 50)`}
                      />
                    )}
                    <text
                      x={50 + R - (isPrize && slice.prize.image ? 13 : 4)}
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
                      {truncate(isPrize ? slice.prize.name : labels.luck, maxChars)}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
          {Array.from({ length: count * 2 }, (_, i) => {
            const [x, y] = point((i * 180) / count, 46.6).split(' ');
            return (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bulbs
                key={i}
                cx={x}
                cy={y}
                r="1.1"
                fill={i % 2 ? brand.text : brand.accent}
                style={{
                  animation:
                    spinning && !reduced
                      ? `mech-wheel-bulb 400ms ${(i % 2) * 200}ms infinite alternate`
                      : undefined,
                }}
              />
            );
          })}
          <circle cx="50" cy="50" r="11.5" fill={brand.primary} />
          <circle
            cx="50"
            cy="50"
            r="10"
            fill={brand.accent}
            stroke={brand.text}
            strokeWidth="0.8"
            style={{
              animation:
                round.interactive && !reduced
                  ? 'mech-wheel-pulse 1.4s ease-in-out infinite'
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
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 4.6 }}
          >
            {labels.spin}
          </text>
          <path
            d="M50 13 L44.5 1.5 Q50 -0.5 55.5 1.5 Z"
            fill={brand.text}
            stroke={brand.primary}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
