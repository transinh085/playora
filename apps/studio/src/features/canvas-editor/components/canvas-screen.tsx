'use client';

import { type ReactNode, useEffect, useState } from 'react';
import {
  ARTBOARD_WIDTH,
  type BrandPalette,
  type ButtonElement,
  type CanvasElement,
  DEMO_PRIZES,
  type FormElement,
  type GameStageElement,
  presetSrc,
  resolveColor,
  type ScreenDoc,
} from '../lib/model';

/**
 * Renders one canvas screen (ADR-014 §5). Pure presentation: Play will render the same component,
 * and the Studio editor draws its selection layer on top. Colours here are game content (brand
 * kit), not Studio chrome, so they are resolved from the brand palette rather than antd tokens.
 */
export interface CanvasLabels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  remaining: (count: number) => string;
  fullName: string;
  phone: string;
  consent: string;
  sampleName: string;
  samplePrize: string;
  sampleEvent: string;
}

export interface CanvasPrize {
  name: string;
  image?: string;
  remaining: number;
}

export interface CanvasRuntime {
  /** Draws the template's mechanism inside the game stage (player); a demo wheel otherwise. */
  renderStage?: (element: GameStageElement) => ReactNode;
  /** Draws a real, fillable form inside the form box (player); a static mock otherwise. */
  renderForm?: (element: FormElement) => ReactNode;
  /** Makes buttons interactive (player). */
  onButton?: (element: ButtonElement) => void;
  /** The campaign's prizes for `prizeList` elements; demo prizes otherwise. */
  prizes?: CanvasPrize[];
  /** Real values for `{prize.name}`, `{player.name}`, `{event.name}`; samples from labels otherwise. */
  variables?: Partial<Record<'prize.name' | 'player.name' | 'event.name', string>>;
}

export function CanvasScreen({
  screen,
  brand,
  scale,
  labels,
  animate,
  runtime,
}: {
  screen: ScreenDoc;
  brand: BrandPalette;
  scale: number;
  labels: CanvasLabels;
  /** Change this value to replay enter animations; undefined disables them. */
  animate?: number;
  runtime?: CanvasRuntime;
}) {
  const { background } = screen;
  const from = resolveColor(background.color, brand);
  const to = background.gradientTo ? resolveColor(background.gradientTo, brand) : from;

  return (
    <div
      style={{
        width: ARTBOARD_WIDTH * scale,
        height: screen.height * scale,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(180deg, ${from}, ${to})`,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        key={animate}
        style={{
          width: ARTBOARD_WIDTH,
          height: screen.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {screen.elements.map((element) =>
          element.hidden ? null : (
            <div
              key={element.id}
              style={{
                position: 'absolute',
                left: element.x,
                top: element.y,
                width: element.w,
                height: element.h,
                transform: `rotate(${element.rotation}deg)`,
                opacity: element.opacity,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  animation:
                    animate !== undefined && element.animation.enter !== 'none'
                      ? `canvas-${element.animation.enter} 600ms cubic-bezier(.2,.8,.2,1) ${element.animation.delayMs}ms both`
                      : undefined,
                }}
              >
                <ElementView element={element} brand={brand} labels={labels} runtime={runtime} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const KEYFRAMES = `
@keyframes canvas-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes canvas-slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
@keyframes canvas-zoom { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: none } }
@keyframes canvas-bounce { 0% { opacity: 0; transform: scale(.3) } 60% { opacity: 1; transform: scale(1.08) } 80% { transform: scale(.96) } 100% { transform: none } }
`;

function fillVariables(text: string, labels: CanvasLabels, runtime?: CanvasRuntime) {
  const v = runtime?.variables ?? {};
  return text
    .replaceAll('{prize.name}', v['prize.name'] ?? labels.samplePrize)
    .replaceAll('{player.name}', v['player.name'] ?? labels.sampleName)
    .replaceAll('{event.name}', v['event.name'] ?? labels.sampleEvent);
}

function ElementView({
  element,
  brand,
  labels,
  runtime,
}: {
  element: CanvasElement;
  brand: BrandPalette;
  labels: CanvasLabels;
  runtime?: CanvasRuntime;
}) {
  const c = (value: Parameters<typeof resolveColor>[0]) => resolveColor(value, brand);
  const fill = { width: '100%', height: '100%' } as const;

  switch (element.type) {
    case 'text':
      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              element.align === 'center'
                ? 'center'
                : element.align === 'right'
                  ? 'flex-end'
                  : 'flex-start',
            textAlign: element.align,
            color: c(element.color),
            fontFamily: element.font === 'heading' ? 'var(--font-display)' : 'var(--font-sans)',
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            lineHeight: element.lineHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textShadow: element.font === 'heading' ? '0 2px 0 rgba(0,0,0,.25)' : undefined,
          }}
        >
          {fillVariables(element.content, labels, runtime)}
        </div>
      );
    case 'image':
      return (
        // biome-ignore lint/performance/noImgElement: data-URL stickers and user assets, not Next images
        <img
          src={element.src || presetSrc()}
          alt={element.name}
          draggable={false}
          style={{
            ...fill,
            objectFit: element.fit,
            borderRadius: element.radius,
            display: 'block',
          }}
        />
      );
    case 'button': {
      const style = {
        ...fill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: c(element.background),
        color: c(element.color),
        borderRadius: element.radius,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: element.fontSize,
        boxShadow: '0 5px 0 rgba(0,0,0,.28)',
        letterSpacing: 0.5,
      } as const;
      const onButton = runtime?.onButton;
      return onButton ? (
        <button
          type="button"
          onClick={() => onButton(element)}
          style={{ ...style, border: 0, padding: 0, cursor: 'pointer' }}
        >
          {element.label}
        </button>
      ) : (
        <div style={style}>{element.label}</div>
      );
    }
    case 'shape':
      return (
        <div
          style={{
            ...fill,
            background: c(element.fill),
            borderRadius: element.shape === 'ellipse' ? '50%' : element.radius,
            border: element.borderWidth
              ? `${element.borderWidth}px solid ${c(element.borderColor)}`
              : undefined,
          }}
        />
      );
    case 'countdown':
      return (
        <Countdown color={c(element.color)} background={c(element.background)} labels={labels} />
      );
    case 'prizeList':
      return (
        <div
          style={{
            ...fill,
            display: 'grid',
            gap: 8,
            gridTemplateColumns: element.layout === 'grid' ? 'repeat(3, 1fr)' : '1fr',
            color: c(element.color),
          }}
        >
          {(runtime?.prizes ?? DEMO_PRIZES).slice(0, 6).map((prize: CanvasPrize, i) => (
            <div
              key={prize.name}
              style={{
                display: 'flex',
                flexDirection: element.layout === 'grid' ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 8,
                borderRadius: 12,
                background: 'rgba(0,0,0,.22)',
                border: `1px solid ${c('brand.accent')}55`,
                textAlign: 'center',
                minHeight: 0,
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: built-in sticker */}
              <img
                src={prize.image || presetSrc(['coin', 'envelope', 'logo'][i])}
                alt=""
                style={{ width: 36, height: 36 }}
              />
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{prize.name}</div>
              {element.showRemaining && (
                <div style={{ fontSize: 11, opacity: 0.75 }}>
                  {labels.remaining(prize.remaining)}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case 'gameStage':
      return runtime?.renderStage ? runtime.renderStage(element) : <DemoWheel brand={brand} />;
    case 'form':
      if (runtime?.renderForm) return runtime.renderForm(element);
      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            color: c(element.color),
          }}
        >
          {[labels.fullName, labels.phone].map((label) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
              <div
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.92)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.15)',
                }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: 'rgba(255,255,255,.92)',
              }}
            />
            {labels.consent}
          </div>
        </div>
      );
  }
}

function Countdown({
  color,
  background,
  labels,
}: {
  color: string;
  background: string;
  labels: CanvasLabels;
}) {
  // Demo target: three days from first render.
  const [target] = useState(() => Date.now() + 3 * 86_400_000 + 4 * 3_600_000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.floor((target - now) / 1000));
  const parts = [
    [Math.floor(left / 86_400), labels.days],
    [Math.floor((left % 86_400) / 3600), labels.hours],
    [Math.floor((left % 3600) / 60), labels.minutes],
    [left % 60, labels.seconds],
  ] as const;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 8, color }}>
      {parts.map(([value, label]) => (
        <div
          key={label}
          style={{
            flex: 1,
            borderRadius: 10,
            background,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {String(value).padStart(2, '0')}
          </span>
          <span style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const SLICE_IDS = Array.from({ length: 8 }, (_, i) => `slice-${i}`);

/** Stand-in for the template's mechanism; the real one comes from `packages/templates`. */
function DemoWheel({ brand }: { brand: BrandPalette }) {
  const r = 46;
  const path = (i: number) => {
    const a0 = ((i * 360) / SLICE_IDS.length - 90) * (Math.PI / 180);
    const a1 = (((i + 1) * 360) / SLICE_IDS.length - 90) * (Math.PI / 180);
    const p = (a: number) =>
      `${(50 + r * Math.cos(a)).toFixed(3)} ${(50 + r * Math.sin(a)).toFixed(3)}`;
    return `M50 50 L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`;
  };
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="wheel">
      <circle cx="50" cy="50" r="49" fill={brand.accent} />
      {SLICE_IDS.map((id, i) => (
        <path
          key={id}
          d={path(i)}
          fill={i % 2 ? brand.surface : brand.background}
          stroke={brand.accent}
          strokeWidth="0.6"
        />
      ))}
      <circle cx="50" cy="50" r="9" fill={brand.accent} stroke={brand.surface} strokeWidth="2" />
      <path d="M50 1 L45 12 L55 12 Z" fill={brand.text} stroke={brand.surface} strokeWidth="1" />
    </svg>
  );
}
