'use client';

import type { PlayResult } from '@playora/contracts';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import type { MechanismLabels } from './labels';
import type { MechanismProps } from './mechanism';
import type { BrandPalette } from './model';
import { clearedRatio, REVEAL_THRESHOLD } from './scratch-math';
import { usePlayRound, useReducedMotion } from './use-play-round';

function drawFoil(canvas: HTMLCanvasElement, brand: BrandPalette, label: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.globalCompositeOperation = 'source-over';
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, brand.accent);
  gradient.addColorStop(0.32, '#fff8dc');
  gradient.addColorStop(0.55, brand.accent);
  gradient.addColorStop(0.82, '#fff1b8');
  gradient.addColorStop(1, brand.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Diagonal metallic sheen stripes.
  ctx.strokeStyle = 'rgba(255,255,255,.32)';
  ctx.lineWidth = Math.max(2, w / 55);
  for (let x = -h; x < w; x += w / 9) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }

  // Inner ornamental frame on the foil.
  const inset = Math.max(8, Math.min(w, h) * 0.06);
  ctx.strokeStyle = `${brand.primary}33`;
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.012);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

  const font =
    getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() ||
    'sans-serif';
  ctx.fillStyle = brand.primary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.round(Math.min(w / 11, h / 5));
  ctx.font = `800 ${fontSize}px ${font}`;
  ctx.fillText(label, w / 2, h / 2);
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Scratch-off card: the hidden layer shows the server's result under a canvas foil. */
export function ScratchCard({ brand, play, labels }: Omit<MechanismProps, 'mechanism'>) {
  const reduced = useReducedMotion();
  const round = usePlayRound(play);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const touched = useRef(false);
  const [cleared, setCleared] = useState(false);
  const finished = useRef(false);
  const canScratch = Boolean(play && !play.disabled) && round.phase !== 'done' && !cleared;
  const label = labels.scratchHere;

  // Draw (and redraw on resize) until the first scratch.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      if (touched.current) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(canvas.offsetWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.offsetHeight * ratio));
      drawFoil(canvas, brand, label);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [brand, label]);

  // Reveal once enough is scratched and the server has answered; transition cleanly to result screen.
  const { result, finish } = round;
  useEffect(() => {
    if (cleared && result && !finished.current) {
      finished.current = true;
      finish(result, reduced ? 200 : 450);
    }
  }, [cleared, result, finish, reduced]);

  const begin = () => {
    if (round.phase === 'idle') void round.start();
  };

  const toCanvas = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const scratch = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const brush = Math.min(canvas.width, canvas.height) * 0.16;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brush;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
    if (!reduced && moves.current % 3 === 0) {
      drawSparkle(ctx, to.x + (Math.random() - 0.5) * brush, to.y, brush, '#ffffff');
    }
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (clearedRatio(data) >= REVEAL_THRESHOLD) setCleared(true);
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canScratch) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    touched.current = true;
    begin();
    const p = toCanvas(e);
    last.current = p;
    scratch(p, p);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canScratch || !last.current) return;
    const p = toCanvas(e);
    scratch(last.current, p);
    last.current = p;
    moves.current += 1;
    if (moves.current % 10 === 0) checkProgress();
  };
  const onUp = () => {
    if (!last.current) return;
    last.current = null;
    checkProgress();
  };

  const showFoil = !cleared || !round.result;

  return (
    <div
      data-testid="scratch-card-stage"
      data-phase={round.phase}
      style={{
        width: '100%',
        height: '100%',
        containerType: 'size',
        opacity: play?.disabled ? 0.55 : 1,
        transition: 'opacity 200ms',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '6cqmin',
          overflow: 'hidden',
          background: brand.text,
          border: `1.6cqmin solid ${brand.accent}`,
          boxShadow: '0 6px 0 rgba(0,0,0,.25)',
          boxSizing: 'border-box',
        }}
      >
        <ResultFace
          result={round.result}
          pending={round.phase === 'pending' || (cleared && !round.result)}
          brand={brand}
          reduced={reduced}
          labels={labels}
        />
        {/* biome-ignore lint/a11y/useSemanticElements: the scratch surface has to be a canvas */}
        <canvas
          ref={canvasRef}
          role="button"
          tabIndex={canScratch ? 0 : -1}
          aria-label={labels.scratchLabel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={(e) => {
            // Keyboard / switch users reveal without scratching.
            if (canScratch && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              touched.current = true;
              begin();
              setCleared(true);
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: canScratch ? 'grab' : 'default',
            opacity: showFoil ? 1 : 0,
            transition: reduced ? undefined : 'opacity 320ms ease-out',
            pointerEvents: canScratch ? 'auto' : 'none',
          }}
        />
      </div>
    </div>
  );
}

function ResultFace({
  result,
  pending,
  brand,
  reduced,
  labels,
}: {
  result: PlayResult | null;
  pending: boolean;
  brand: BrandPalette;
  reduced: boolean;
  labels: MechanismLabels;
}) {
  if (!result) {
    return (
      <div
        data-testid="scratch-pending-shimmer"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5cqmin',
          padding: '6cqmin',
          textAlign: 'center',
          color: brand.primary,
          fontFamily: 'var(--font-display)',
          background: `linear-gradient(110deg, ${brand.text} 25%, ${brand.accent}55 50%, ${brand.text} 75%)`,
          backgroundSize: '200% 100%',
          animation: !reduced && pending ? 'mech-shimmer 1.4s linear infinite' : undefined,
        }}
      >
        <div style={{ fontSize: '8cqmin', fontWeight: 800, opacity: 0.85 }}>
          {pending ? 'Đang mở quà…' : labels.scratchHere}
        </div>
      </div>
    );
  }
  const win = result.outcome === 'win' && result.prize;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3cqmin',
        padding: '6cqmin',
        textAlign: 'center',
        color: brand.primary,
        fontFamily: 'var(--font-display)',
        background: `radial-gradient(circle at 50% 40%, ${brand.text}, ${brand.accent}55)`,
        animation: reduced ? undefined : 'mech-pop 380ms ease-out both',
      }}
    >
      {win && result.prize?.image ? (
        <img
          src={result.prize.image}
          alt=""
          style={{ width: '34cqmin', height: '34cqmin', objectFit: 'contain' }}
        />
      ) : null}
      {win && (
        <div style={{ fontSize: '7cqmin', fontWeight: 600, opacity: 0.8 }}>{labels.winTitle}</div>
      )}
      <div style={{ fontSize: win ? '11cqmin' : '9cqmin', fontWeight: 800, lineHeight: 1.15 }}>
        {win ? result.prize?.name : labels.loseTitle}
      </div>
    </div>
  );
}
