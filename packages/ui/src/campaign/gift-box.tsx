'use client';

import type { CampaignSkinKey } from '@playora/contracts';
import { useState } from 'react';
import type { MechanismProps } from './mechanism';
import type { BrandPalette } from './model';
import { usePlayRound, useReducedMotion } from './use-play-round';

const BOXES = [0, 1, 2] as const;
/** Minimum shake before the lid comes off, so a fast server still feels like a reveal. */
const SHAKE_MS = 650;

/**
 * Three interactive mystery items (GAM-04, BLD-06):
 * - `tet`: Bao Lì Xì Đại Cát (red & gold lucky envelopes)
 * - `grand-opening`: Trứng Vàng Phú Quý (golden eggs on festive pedestals)
 * - `everyday` (default): Hộp Quà Bí Mật (3D ribboned gift boxes)
 */
export function GiftBox({
  brand,
  skinKey = 'everyday',
  play,
  labels,
}: Omit<MechanismProps, 'mechanism'>) {
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
    // Transition directly to resultWin / resultLose once the open animation finishes (no duplicate card overlay).
    round.finish(result, wait + (reduced ? 250 : 650));
  };

  return (
    <div
      data-testid="gift-box-stage"
      data-skin-variant={skinKey}
      data-phase={round.phase}
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
              data-testid={`gift-item-${i}`}
              data-skin-variant={skinKey}
              aria-label={labels.boxLabel(i + 1)}
              disabled={!round.interactive}
              onClick={() => pick(i)}
              style={{
                all: 'unset',
                width: 'min(29cqw, 82cqh)',
                aspectRatio: '1',
                cursor: round.interactive ? 'pointer' : 'default',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                opacity: chosen !== null && !isChosen ? 0.32 : 1,
                transform: isChosen && opened ? 'scale(1.12)' : undefined,
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
                  animation: shaking ? 'mech-shake 360ms ease-in-out infinite' : undefined,
                }}
              >
                <SkinItemArt
                  skinKey={skinKey}
                  brand={brand}
                  variant={i}
                  open={isChosen && opened}
                  reduced={reduced}
                />
              </div>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

function SkinItemArt({
  skinKey,
  brand,
  variant,
  open,
  reduced,
}: {
  skinKey: CampaignSkinKey;
  brand: BrandPalette;
  variant: number;
  open: boolean;
  reduced: boolean;
}) {
  if (skinKey === 'tet') {
    return <LuckyEnvelopeArt brand={brand} variant={variant} open={open} reduced={reduced} />;
  }
  if (skinKey === 'grand-opening') {
    return <GoldenEggArt brand={brand} variant={variant} open={open} reduced={reduced} />;
  }
  return <BoxArt brand={brand} variant={variant} open={open} reduced={reduced} />;
}

/** `tet` skin: Bao Lì Xì Đại Cát with gold coin seal & rising glow. */
function LuckyEnvelopeArt({
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
  const seals = ['LỘC', 'PHÚC', 'TÀI'] as const;
  const sealText = seals[variant % seals.length] ?? 'LỘC';
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="50" cy="95" rx="34" ry="4" fill="rgba(0,0,0,.28)" />
      {/* Envelope body */}
      <rect
        x="18"
        y="16"
        width="64"
        height="76"
        rx="8"
        fill="#d91b2b"
        stroke={brand.accent}
        strokeWidth="2.2"
      />
      {/* Ornamental inner gold border */}
      <rect
        x="22"
        y="20"
        width="56"
        height="68"
        rx="5"
        fill="none"
        stroke="#ffd43b"
        strokeWidth="0.9"
        strokeDasharray="3 2"
        opacity="0.8"
      />
      {/* Rising gold card when opened */}
      {open && (
        <g
          style={{
            animation: reduced ? undefined : 'mech-pop 400ms ease-out both',
          }}
        >
          <rect
            x="26"
            y="4"
            width="48"
            height="34"
            rx="4"
            fill="#fff8dc"
            stroke="#ffd43b"
            strokeWidth="1.8"
          />
          <circle cx="50" cy="20" r="8" fill="#ffd43b" opacity="0.45" />
        </g>
      )}
      {/* Top flap */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '50px 18px',
          animation:
            open && !reduced ? 'mech-lid-off 620ms cubic-bezier(.3,.7,.3,1) forwards' : undefined,
          opacity: open && reduced ? 0 : 1,
        }}
      >
        <path
          d="M18 20 Q50 52 82 20 L82 18 Q82 16 78 16 L22 16 Q18 16 18 18 Z"
          fill="#b81422"
          stroke="#ffd43b"
          strokeWidth="2"
        />
      </g>
      {/* Gold coin emblem */}
      <circle cx="50" cy="48" r="13" fill="#ffd43b" stroke="#fff3bf" strokeWidth="1.5" />
      <circle cx="50" cy="48" r="10" fill="none" stroke="#b81422" strokeWidth="0.8" />
      <text
        x="50"
        y="49"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#9e111d"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 7.2 }}
      >
        {sealText}
      </text>
    </svg>
  );
}

/** `grand-opening` skin: Trứng Vàng Phú Quý on festive red cushion pedestal. */
function GoldenEggArt({
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
  const id = `egg-grad-${variant}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fff9db" />
          <stop offset="45%" stopColor="#ffd43b" />
          <stop offset="100%" stopColor="#e67700" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="94" rx="38" ry="4.5" fill="rgba(0,0,0,.28)" />
      {/* Festive pedestal base */}
      <path
        d="M20 78 Q50 86 80 78 L74 91 Q50 96 26 91 Z"
        fill="#c92a2a"
        stroke={brand.accent}
        strokeWidth="2"
      />
      <ellipse cx="50" cy="78" rx="30" ry="6" fill="#e03131" stroke="#ffd43b" strokeWidth="1.5" />
      {/* Lower egg shell */}
      <path
        d="M24 54 C24 74 36 82 50 82 C64 82 76 74 76 54 L66 50 L58 57 L50 49 L42 57 L34 50 Z"
        fill={`url(#${id})`}
        stroke="#fff3bf"
        strokeWidth="1.5"
      />
      {/* Light burst when cracked open */}
      {open && (
        <circle
          cx="50"
          cy="44"
          r="20"
          fill="#fff9db"
          opacity="0.85"
          style={{ animation: reduced ? undefined : 'mech-pop 400ms ease-out both' }}
        />
      )}
      {/* Upper egg shell that cracks and lifts off */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '50px 42px',
          animation:
            open && !reduced ? 'mech-lid-off 620ms cubic-bezier(.3,.7,.3,1) forwards' : undefined,
          opacity: open && reduced ? 0 : 1,
        }}
      >
        <path
          d="M24 54 C24 28 37 14 50 14 C63 14 76 28 76 54 L66 50 L58 57 L50 49 L42 57 L34 50 Z"
          fill={`url(#${id})`}
          stroke="#fff3bf"
          strokeWidth="1.5"
        />
        {/* Specular highlight */}
        <ellipse
          cx="41"
          cy="32"
          rx="5"
          ry="9"
          transform="rotate(-18 41 32)"
          fill="rgba(255,255,255,.55)"
        />
      </g>
    </svg>
  );
}

/** `everyday` skin: 3D Mystery Gift Box with satin ribbon & bow. */
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
      {open && (
        <circle
          cx="50"
          cy="36"
          r="18"
          fill="#fff9db"
          opacity="0.8"
          style={{ animation: reduced ? undefined : 'mech-pop 400ms ease-out both' }}
        />
      )}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '50px 40px',
          animation: open
            ? reduced
              ? undefined
              : 'mech-lid-off 650ms cubic-bezier(.3,.7,.3,1) forwards'
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
