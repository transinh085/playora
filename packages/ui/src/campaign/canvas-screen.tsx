'use client';

import {
  ArrowRight,
  Flame,
  Gift,
  Globe,
  Megaphone,
  MessageCircle,
  MousePointer,
  PhoneCall,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  Zap,
} from '@playora/ui/icons';
import { memo, type ReactNode, useEffect, useState } from 'react';
import type { CanvasLabels } from './labels';
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
} from './model';

export type { CanvasLabels };

/**
 * Renders one canvas screen (ADR-014 §5). Pure presentation: Play renders it through
 * `CampaignPlayer`, and the Studio editor draws its selection layer on top. Colours here are game content (brand
 * kit), not Studio chrome, so they are resolved from the brand palette rather than theme tokens.
 */
export interface CanvasPrize {
  name: string;
  image?: string;
  /** Unknown on the public player (stock is never exposed); the count is then hidden. */
  remaining?: number;
}

export type CanvasVariable = 'prize.name' | 'player.name' | 'event.name' | 'turns.left';

export interface CanvasRuntime {
  /** Draws the template's mechanism inside the game stage (player); a demo wheel otherwise. */
  renderStage?: (element: GameStageElement) => ReactNode;
  /** Draws a real, fillable form inside the form box (player); a static mock otherwise. */
  renderForm?: (element: FormElement) => ReactNode;
  /** Makes buttons interactive (player). */
  onButton?: (element: ButtonElement) => void;
  /** The campaign's prizes for `prizeList` elements; demo prizes otherwise. */
  prizes?: CanvasPrize[];
  /**
   * Real values for `{prize.name}`, `{player.name}`, `{event.name}`; samples from labels otherwise.
   * `{turns.left}` is only replaced when the player knows it.
   */
  variables?: Partial<Record<CanvasVariable, string>>;
}

export const CanvasScreen = memo(function CanvasScreen({
  screen,
  brand,
  scale,
  labels,
  animate,
  still = false,
  runtime,
}: {
  screen: ScreenDoc;
  brand: BrandPalette;
  scale: number;
  labels: CanvasLabels;
  /** Change this value to replay enter animations; undefined disables them. */
  animate?: number;
  /** Editing surface: freeze loop animations so the artboard does not repaint every frame. */
  still?: boolean;
  runtime?: CanvasRuntime;
}) {
  const { background } = screen;
  const from = resolveColor(background.color, brand);
  const to = background.gradientTo ? resolveColor(background.gradientTo, brand) : from;

  return (
    <div
      data-canvas-still={still || undefined}
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
            <ElementNode
              key={element.id}
              element={element}
              brand={brand}
              labels={labels}
              runtime={runtime}
              animate={animate !== undefined}
            />
          ),
        )}
      </div>
    </div>
  );
});

/** One positioned element. Memoized: the editor keeps unchanged elements' identity, so a drag only re-renders the dragged one. */
const ElementNode = memo(function ElementNode({
  element,
  brand,
  labels,
  runtime,
  animate,
}: {
  element: CanvasElement;
  brand: BrandPalette;
  labels: CanvasLabels;
  runtime?: CanvasRuntime;
  animate: boolean;
}) {
  return (
    <div
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
            animate && element.animation.enter !== 'none'
              ? `canvas-${element.animation.enter} 600ms cubic-bezier(.2,.8,.2,1) ${element.animation.delayMs}ms both`
              : undefined,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            animation:
              element.animation.loop && element.animation.loop !== 'none'
                ? `canvas-loop-${element.animation.loop} 2.5s ease-in-out infinite`
                : undefined,
          }}
        >
          <ElementView element={element} brand={brand} labels={labels} runtime={runtime} />
        </div>
      </div>
    </div>
  );
});

const KEYFRAMES = `
[data-canvas-still] * { animation-play-state: paused !important; }
@keyframes canvas-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes canvas-slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
@keyframes canvas-zoom { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: none } }
@keyframes canvas-bounce { 0% { opacity: 0; transform: scale(.3) } 60% { opacity: 1; transform: scale(1.08) } 80% { transform: scale(.96) } 100% { transform: none } }
@keyframes canvas-loop-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes canvas-loop-wiggle { 0%, 100% { transform: rotate(0deg); } 20% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-2deg); } }
@keyframes canvas-loop-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes canvas-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes canvas-badge-pulse { 0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } 50% { opacity: 0.95; transform: scale(1.03); filter: drop-shadow(0 0 6px rgba(255,215,0,0.8)); } }
`;

function fillVariables(text: string, labels: CanvasLabels, runtime?: CanvasRuntime) {
  const v = runtime?.variables ?? {};
  const turns = v['turns.left'];
  return (turns === undefined ? text : text.replaceAll('{turns.left}', turns))
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
    case 'text': {
      let shadowCss: string | undefined;
      if (element.textShadow === 'soft') {
        shadowCss = '0 2px 8px rgba(0,0,0,0.45)';
      } else if (element.textShadow === 'retro3d') {
        shadowCss = '2px 2px 0px rgba(0,0,0,0.85), 4px 4px 0px rgba(0,0,0,0.3)';
      } else if (element.textShadow === 'glow') {
        shadowCss = '0 0 10px rgba(255,215,0,0.8), 0 0 20px rgba(255,215,0,0.4)';
      } else if (element.textShadow === 'outline') {
        shadowCss = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
      } else if (element.font === 'heading') {
        shadowCss = '0 2px 0 rgba(0,0,0,.25)';
      }

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
            letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
            textTransform:
              element.textTransform && element.textTransform !== 'none'
                ? element.textTransform
                : undefined,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textShadow: shadowCss,
          }}
        >
          {fillVariables(element.content, labels, runtime)}
        </div>
      );
    }
    case 'image': {
      let shadowCss: string | undefined;
      if (element.shadow === 'soft') shadowCss = '0 4px 12px rgba(0,0,0,0.2)';
      else if (element.shadow === 'strong') shadowCss = '0 8px 24px rgba(0,0,0,0.4)';
      else if (element.shadow === 'glow') shadowCss = '0 0 16px rgba(255,215,0,0.6)';

      return (
        <img
          src={element.src || presetSrc()}
          alt={element.name}
          draggable={false}
          style={{
            ...fill,
            objectFit: element.fit,
            borderRadius: element.radius,
            display: 'block',
            boxShadow: shadowCss,
            border:
              element.borderWidth && element.borderColor
                ? `${element.borderWidth}px solid ${c(element.borderColor)}`
                : undefined,
          }}
        />
      );
    }
    case 'button': {
      let bgCss: string = c(element.background);
      let shadowCss: string = '0 5px 0 rgba(0,0,0,.28)';

      if (element.variant === 'game3d') {
        shadowCss = '0 6px 0 rgba(0,0,0,.38), 0 10px 14px rgba(0,0,0,.25)';
      } else if (element.variant === 'flat') {
        shadowCss = 'none';
      } else if (element.variant === 'glow') {
        shadowCss = `0 0 16px ${c(element.background)}cc, 0 4px 8px rgba(0,0,0,.2)`;
      } else if (element.variant === 'gradient') {
        bgCss = `linear-gradient(180deg, ${c('brand.accent')}, ${c('brand.primary')})`;
      }

      const style = {
        ...fill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: bgCss,
        color: c(element.color),
        borderRadius: element.radius,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: element.fontSize,
        boxShadow: shadowCss,
        letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 0.5,
      } as const;

      const IconComponent =
        element.icon === 'zap'
          ? Zap
          : element.icon === 'gift'
            ? Gift
            : element.icon === 'pointer'
              ? MousePointer
              : element.icon === 'arrow'
                ? ArrowRight
                : element.icon === 'star'
                  ? Star
                  : null;

      const content = (
        <>
          {IconComponent && <IconComponent className="size-4 shrink-0" />}
          <span>{element.label}</span>
        </>
      );

      const onButton = runtime?.onButton;
      return onButton ? (
        <button
          type="button"
          onClick={() => onButton(element)}
          style={{ ...style, border: 0, padding: '0 12px', cursor: 'pointer' }}
        >
          {content}
        </button>
      ) : (
        <div style={{ ...style, padding: '0 12px' }}>{content}</div>
      );
    }
    case 'shape': {
      let bg = c(element.fill);
      if (element.fillGradientTo) {
        bg = `linear-gradient(135deg, ${c(element.fill)}, ${c(element.fillGradientTo)})`;
      }
      let rad: string | number = element.radius;
      if (element.shape === 'ellipse') rad = '50%';
      else if (element.shape === 'pill') rad = 9999;
      else if (element.shape === 'card') rad = Math.max(16, element.radius);

      let shadowCss: string | undefined;
      if (element.shadow === 'soft' || element.shape === 'card')
        shadowCss = '0 6px 18px rgba(0,0,0,0.22)';
      else if (element.shadow === 'glow') shadowCss = `0 0 16px ${c(element.fill)}aa`;

      return (
        <div
          style={{
            ...fill,
            background: bg,
            borderRadius: rad,
            border: element.borderWidth
              ? `${element.borderWidth}px solid ${c(element.borderColor)}`
              : undefined,
            boxShadow: shadowCss,
          }}
        />
      );
    }
    case 'badge': {
      const isOutline = element.variant === 'outline';
      const isGradient = element.variant === 'gradient';
      const bg = isOutline
        ? 'transparent'
        : isGradient
          ? `linear-gradient(135deg, ${c(element.background)}, ${c('brand.primary')})`
          : c(element.background);

      const IconComp =
        element.icon === 'flame'
          ? Flame
          : element.icon === 'gift'
            ? Gift
            : element.icon === 'sparkles'
              ? Sparkles
              : element.icon === 'trophy'
                ? Trophy
                : element.icon === 'zap'
                  ? Zap
                  : element.icon === 'star'
                    ? Star
                    : null;

      return (
        <div
          style={{
            ...fill,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '0 12px',
            background: bg,
            color: c(element.color),
            borderRadius: element.radius,
            border: `1.5px solid ${c(element.borderColor ?? element.background)}`,
            fontSize: element.fontSize,
            fontWeight: 800,
            letterSpacing: 0.5,
            boxShadow: element.pulse
              ? '0 0 10px rgba(255,215,0,0.5)'
              : '0 2px 4px rgba(0,0,0,0.15)',
            animation: element.pulse ? 'canvas-badge-pulse 2s infinite ease-in-out' : undefined,
            userSelect: 'none',
          }}
        >
          {IconComp && <IconComp className="size-4 shrink-0" />}
          <span>{element.text}</span>
        </div>
      );
    }
    case 'marquee': {
      const IconComp =
        element.icon === 'trophy'
          ? Trophy
          : element.icon === 'sparkles'
            ? Sparkles
            : element.icon === 'flame'
              ? Flame
              : Megaphone;

      const duration = element.speed === 'fast' ? '10s' : element.speed === 'slow' ? '24s' : '16s';

      return (
        <div
          style={{
            ...fill,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            background: c(element.background),
            color: c(element.color),
            borderRadius: element.radius,
            padding: '0 10px',
            fontSize: element.fontSize,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          <IconComp className="size-3.5 shrink-0 mr-2 opacity-90" />
          <div
            style={{
              display: 'inline-flex',
              whiteSpace: 'nowrap',
              animation: `canvas-marquee ${duration} linear infinite`,
            }}
          >
            <span style={{ paddingRight: 40 }}>{element.text}</span>
            <span style={{ paddingRight: 40 }}>{element.text}</span>
          </div>
        </div>
      );
    }
    case 'divider': {
      const OrnamentIcon =
        element.ornament === 'star'
          ? Star
          : element.ornament === 'diamond'
            ? Sparkles
            : element.ornament === 'flower'
              ? Sparkles
              : null;

      const borderStyle =
        element.style === 'dashed' ? 'dashed' : element.style === 'dotted' ? 'dotted' : 'solid';
      const col = c(element.color);

      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: element.thickness,
              background:
                element.style === 'gradient'
                  ? `linear-gradient(90deg, transparent, ${col}, transparent)`
                  : element.style === 'solid'
                    ? col
                    : 'none',
              borderTop:
                element.style === 'dashed' || element.style === 'dotted'
                  ? `${element.thickness}px ${borderStyle} ${col}`
                  : undefined,
            }}
          />
          {OrnamentIcon && (
            <div
              style={{
                position: 'relative',
                background: c('brand.background'),
                padding: '0 8px',
                color: col,
              }}
            >
              <OrnamentIcon className="size-4" />
            </div>
          )}
        </div>
      );
    }
    case 'audio': {
      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: c(element.background),
            color: c(element.color),
            borderRadius: element.radius,
            boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
          }}
        >
          <Volume2 className="size-4 shrink-0" />
          {element.label ? (
            <span style={{ fontSize: 12, fontWeight: 700 }}>{element.label}</span>
          ) : null}
        </div>
      );
    }
    case 'social': {
      const isPhone = element.channel === 'phone';
      const isFb = element.channel === 'facebook';
      const IconComp = isPhone ? PhoneCall : isFb ? Globe : MessageCircle;

      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0 12px',
            background: c(element.background),
            color: c(element.color),
            borderRadius: element.radius,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
            cursor: 'pointer',
          }}
        >
          <IconComp className="size-4 shrink-0" />
          <span>{element.label}</span>
        </div>
      );
    }
    case 'countdown':
      return (
        <Countdown
          variant={element.variant}
          title={element.title}
          showDays={element.showDays}
          showSeconds={element.showSeconds}
          color={c(element.color)}
          background={c(element.background)}
          labels={labels}
        />
      );
    case 'prizeList':
      return (
        <div
          style={{
            ...fill,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {element.title ? (
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textAlign: 'center',
                color: c(element.color),
                letterSpacing: 0.5,
              }}
            >
              {element.title}
            </div>
          ) : null}
          <div
            style={{
              flex: 1,
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
                  background: element.cardBackground
                    ? c(element.cardBackground)
                    : 'rgba(0,0,0,.22)',
                  border: element.cardBorder ? `1px solid ${c('brand.accent')}55` : 'none',
                  textAlign: 'center',
                  minHeight: 0,
                }}
              >
                <img
                  src={prize.image || presetSrc(['coin', 'envelope', 'logo'][i])}
                  alt=""
                  style={{ width: 34, height: 34 }}
                />
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{prize.name}</div>
                {element.showRemaining && prize.remaining !== undefined && (
                  <div style={{ fontSize: 11, opacity: 0.75 }}>
                    {labels.remaining(prize.remaining)}
                  </div>
                )}
              </div>
            ))}
          </div>
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
  variant = 'cards',
  title,
  showDays = true,
  showSeconds = true,
  color,
  background,
  labels,
}: {
  variant?: 'cards' | 'pill' | 'minimal';
  title?: string;
  showDays?: boolean;
  showSeconds?: boolean;
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
  const rawParts = [
    ...(showDays ? [[Math.floor(left / 86_400), labels.days] as const] : []),
    [Math.floor((left % 86_400) / 3600), labels.hours] as const,
    [Math.floor((left % 3600) / 60), labels.minutes] as const,
    ...(showSeconds ? [[left % 60, labels.seconds] as const] : []),
  ];

  if (variant === 'minimal') {
    const timeStr = rawParts.map(([v]) => String(v).padStart(2, '0')).join(' : ');
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {title && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
            {title}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>
          {timeStr}
        </div>
      </div>
    );
  }

  if (variant === 'pill') {
    const timeStr = rawParts.map(([v, l]) => `${String(v).padStart(2, '0')} ${l}`).join(' • ');
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          color,
          borderRadius: 9999,
          padding: '0 16px',
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {title ? `${title}: ` : ''}
        {timeStr}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        color,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.5,
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, gap: 6, minHeight: 0 }}>
        {rawParts.map(([value, label]) => (
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
              boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 20,
                lineHeight: 1,
              }}
            >
              {String(value).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>{label}</span>
          </div>
        ))}
      </div>
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
