'use client';

import type { PlayResult } from '@playora/contracts';
import { useState } from 'react';
import type { MechanismLabels } from './labels';
import type { MechanismProps } from './mechanism';
import type { BrandPalette } from './model';
import { usePlayRound, useReducedMotion } from './use-play-round';

const BOXES = [0, 1, 2] as const;
/** Minimum shake before the lid comes off, so a fast server still feels like a reveal. */
const SHAKE_MS = 800;

/** Three gift boxes: the player picks one, the server decides what's inside. */
export function GiftBox({ brand, play, labels }: Omit<MechanismProps, 'mechanism'>) {
  const reduced = useReducedMotion();
  const round = usePlayRound(play);
  const [chosen, setChosen] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);

  const pick = async (index: number) => {
    if (!round.interactive) return;
    setChosen(index);
    const startedAt = Date.now();
    const result = await round.start();
    if (!result) {
      setChosen(null);
      return;
    }
    const wait = reduced ? 0 : Math.max(0, SHAKE_MS - (Date.now() - startedAt));
    setTimeout(() => setOpened(true), wait);
    round.finish(result, wait + (reduced ? 600 : 1900));
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        containerType: 'size',
        opacity: play?.disabled ? 0.55 : 1,
        transition: 'opacity 200ms',
      }}
    >
      <fieldset
        aria-label={labels.pickBox}
        style={{
          all: 'unset',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4cqw',
        }}
      >
        {BOXES.map((i) => {
          const isChosen = chosen === i;
          const shaking = isChosen && !opened && !reduced;
          return (
            <button
              key={i}
              type="button"
              aria-label={labels.boxLabel(i + 1)}
              disabled={!round.interactive}
              onClick={() => pick(i)}
              style={{
                all: 'unset',
                width: 'min(29cqw, 80cqh)',
                aspectRatio: '1',
                cursor: round.interactive ? 'pointer' : 'default',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                opacity: chosen !== null && !isChosen ? 0.35 : 1,
                transform: isChosen && opened ? 'scale(1.08)' : undefined,
                transition: 'opacity 300ms, transform 300ms',
                animation:
                  round.interactive && !reduced
                    ? `mech-float 2.4s ease-in-out ${i * 0.3}s infinite`
                    : undefined,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transformOrigin: '50% 90%',
                  animation: shaking ? 'mech-shake 400ms ease-in-out infinite' : undefined,
                }}
              >
                <BoxArt brand={brand} variant={i} open={isChosen && opened} reduced={reduced} />
              </div>
            </button>
          );
        })}
      </fieldset>
      {opened && round.result && (
        <Reveal result={round.result} brand={brand} reduced={reduced} labels={labels} />
      )}
    </div>
  );
}

function BoxArt({
  brand,
  variant,
  open,
  reduced,
}: {
  brand: BrandPalette;
  variant: number;
  open: boolean;
  reduced: boolean;
}) {
  const body = variant === 1 ? brand.surface : brand.background;
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="50" cy="96" rx="40" ry="4" fill="rgba(0,0,0,.25)" />
      <rect
        x="12"
        y="42"
        width="76"
        height="52"
        rx="5"
        fill={body}
        stroke={brand.accent}
        strokeWidth="2"
      />
      <rect x="12" y="42" width="76" height="10" fill="rgba(0,0,0,.18)" />
      <rect x="44" y="42" width="12" height="52" fill={brand.accent} />
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '50px 40px',
          animation: open
            ? reduced
              ? undefined
              : 'mech-lid-off 700ms cubic-bezier(.3,.7,.3,1) forwards'
            : undefined,
          opacity: open && reduced ? 0 : 1,
        }}
      >
        <rect
          x="6"
          y="28"
          width="88"
          height="17"
          rx="4"
          fill={body}
          stroke={brand.accent}
          strokeWidth="2"
        />
        <rect x="44" y="28" width="12" height="17" fill={brand.accent} />
        <path
          d="M50 28 C38 6 18 12 30 26 Z M50 28 C62 6 82 12 70 26 Z"
          fill={brand.accent}
          stroke={brand.primary}
          strokeWidth="1.2"
        />
        <circle
          cx="50"
          cy="27"
          r="4"
          fill={brand.accent}
          stroke={brand.primary}
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}

function Reveal({
  result,
  brand,
  reduced,
  labels,
}: {
  result: PlayResult;
  brand: BrandPalette;
  reduced: boolean;
  labels: MechanismLabels;
}) {
  const win = result.outcome === 'win' && result.prize;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {!reduced && win && (
        <div
          style={{
            position: 'absolute',
            width: '90cqmin',
            height: '90cqmin',
            borderRadius: '50%',
            background: `repeating-conic-gradient(${brand.accent}66 0 12deg, transparent 12deg 30deg)`,
            maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)',
            animation: 'mech-rays 8s linear infinite',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          minWidth: '46cqw',
          maxWidth: '78cqw',
          padding: '5cqmin 7cqmin',
          borderRadius: '6cqmin',
          background: brand.text,
          color: brand.primary,
          border: `1.4cqmin solid ${brand.accent}`,
          boxShadow: '0 8px 0 rgba(0,0,0,.25)',
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2cqmin',
          animation: reduced ? undefined : 'mech-pop 500ms ease-out both',
        }}
      >
        {win && result.prize?.image && (
          <img
            src={result.prize.image}
            alt=""
            style={{ width: '28cqmin', height: '28cqmin', objectFit: 'contain' }}
          />
        )}
        {win && (
          <div style={{ fontSize: '6cqmin', fontWeight: 600, opacity: 0.8 }}>{labels.winTitle}</div>
        )}
        <div style={{ fontSize: win ? '9cqmin' : '8cqmin', fontWeight: 800, lineHeight: 1.15 }}>
          {win ? result.prize?.name : labels.loseTitle}
        </div>
      </div>
    </div>
  );
}
