'use client';

import { useTranslations } from 'next-intl';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import type { BrandPalette } from '@/features/canvas-editor/lib/model';
import type { PlayResult } from '../mock/types';
import type { MechanismProps } from './mechanism';
import { clearedRatio, REVEAL_THRESHOLD } from './scratch-math';
import { usePlayRound, useReducedMotion } from './use-play-round';

function drawFoil(canvas: HTMLCanvasElement, brand: BrandPalette, label: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.globalCompositeOperation = 'source-over';
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, brand.accent);
  gradient.addColorStop(0.5, '#fff6d6');
  gradient.addColorStop(1, brand.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  // Diagonal sheen stripes.
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = Math.max(2, w / 60);
  for (let x = -h; x < w; x += w / 10) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }
  const font =
    getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() ||
    'sans-serif';
  ctx.fillStyle = brand.primary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(Math.min(w / 11, h / 5))}px ${font}`;
  ctx.fillText(label, w / 2, h / 2);
}

/** Scratch-off card: the hidden layer shows the server's result under a canvas foil. */
export function ScratchCard({ brand, play }: Omit<MechanismProps, 'mechanism'>) {
  const t = useTranslations('builderLab.mechanisms');
  const reduced = useReducedMotion();
  const round = usePlayRound(play);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const touched = useRef(false);
  const [cleared, setCleared] = useState(false);
  const finished = useRef(false);
  const canScratch = Boolean(play && !play.disabled) && round.phase !== 'done' && !cleared;
  const label = t('scratchHere');

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

  // Reveal once enough is scratched and the server has answered.
  const { result, finish } = round;
  useEffect(() => {
    if (cleared && result && !finished.current) {
      finished.current = true;
      finish(result, reduced ? 300 : 1100);
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
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.min(canvas.width, canvas.height) * 0.16;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
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

  return (
    <div
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
        <ResultFace result={round.result} brand={brand} reduced={reduced} />
        {/* biome-ignore lint/a11y/useSemanticElements: the scratch surface has to be a canvas */}
        <canvas
          ref={canvasRef}
          role="button"
          tabIndex={canScratch ? 0 : -1}
          aria-label={t('scratchLabel')}
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
            opacity: cleared ? 0 : 1,
            transition: reduced ? undefined : 'opacity 500ms ease-out',
            pointerEvents: canScratch ? 'auto' : 'none',
          }}
        />
      </div>
    </div>
  );
}

function ResultFace({
  result,
  brand,
  reduced,
}: {
  result: PlayResult | null;
  brand: BrandPalette;
  reduced: boolean;
}) {
  const t = useTranslations('builderLab.mechanisms');
  if (!result) return null;
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
        animation: reduced ? undefined : 'mech-pop 500ms ease-out both',
      }}
    >
      {win && result.prize?.image ? (
        // biome-ignore lint/performance/noImgElement: data-URL prize images
        <img
          src={result.prize.image}
          alt=""
          style={{ width: '34cqmin', height: '34cqmin', objectFit: 'contain' }}
        />
      ) : null}
      {win && (
        <div style={{ fontSize: '7cqmin', fontWeight: 600, opacity: 0.8 }}>{t('winTitle')}</div>
      )}
      <div style={{ fontSize: win ? '11cqmin' : '9cqmin', fontWeight: 800, lineHeight: 1.15 }}>
        {win ? result.prize?.name : t('loseTitle')}
      </div>
    </div>
  );
}
