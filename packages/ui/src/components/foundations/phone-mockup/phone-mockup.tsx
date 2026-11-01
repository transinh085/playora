import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../../utils/cx';

export type PhoneMockupSize = 'xs' | 'sm' | 'md' | 'lg';
export type PhoneMockupFinish = 'titanium-dark' | 'titanium-natural' | 'titanium-silver';

export interface PhoneMockupProps extends HTMLAttributes<HTMLDivElement> {
  /** Preset physical size of the phone mockup. */
  size?: PhoneMockupSize;
  /** Brushed titanium chassis color finish (inspired by iPhone 16 Pro). */
  finish?: PhoneMockupFinish;
  /** Show the iOS status bar (time, cellular, Wi-Fi, battery) flanking the Dynamic Island. */
  showStatusBar?: boolean;
  /** Show the Dynamic Island pill with TrueDepth camera lens & FaceID sensor. */
  showDynamicIsland?: boolean;
  /** Show the bottom iOS Home Indicator bar. */
  showHomeIndicator?: boolean;
  /** Show a subtle diagonal OLED glass reflection overlay. */
  showGlare?: boolean;
  /** Status bar clock text (defaults to Apple's iconic "9:41"). */
  time?: string;
  /**
   * When true, collapses the hardware bezel/overlays below 480px so the inner content
   * fills a real mobile viewport edge-to-edge (used by Studio/Play fullscreen rehearsal).
   */
  responsiveFrame?: boolean;
  /** Additional classes for the inner OLED screen viewport container. */
  screenClassName?: string;
  children?: ReactNode;
}

interface SizeSpec {
  containerWidth: string;
  aspectRatio?: string;
  outerRadius: string;
  titaniumPadding: string;
  bezelRadius: string;
  bezelPadding: string;
  screenRadius: string;
  statusBarHeight: string;
  statusBarPadding: string;
  timeText: string;
  iconScale: string;
  islandTop: string;
  islandSize: string;
  lensSize: string;
  sensorSize: string;
  homeWidth: string;
  homeHeight: string;
  homeBottom: string;
}

const SIZE_SPECS: Record<PhoneMockupSize, SizeSpec> = {
  xs: {
    containerWidth: 'w-full max-w-[224px]',
    aspectRatio: '9 / 19.2',
    outerRadius: 'rounded-[34px]',
    titaniumPadding: 'p-[2px]',
    bezelRadius: 'rounded-[32px]',
    bezelPadding: 'p-[5px]',
    screenRadius: 'rounded-[27px]',
    statusBarHeight: 'h-6',
    statusBarPadding: 'px-3.5 pt-0.5',
    timeText: 'text-[9px]',
    iconScale: 'scale-[0.72] origin-right',
    islandTop: 'top-[5px]',
    islandSize: 'h-[15px] w-[58px] px-1.5',
    lensSize: 'size-[6px]',
    sensorSize: 'size-[4.5px]',
    homeWidth: 'w-[72px]',
    homeHeight: 'h-[3px]',
    homeBottom: 'bottom-[4px]',
  },
  sm: {
    containerWidth: 'w-full max-w-[308px]',
    aspectRatio: '9 / 19.2',
    outerRadius: 'rounded-[46px]',
    titaniumPadding: 'p-[2.5px]',
    bezelRadius: 'rounded-[43.5px]',
    bezelPadding: 'p-[7.5px]',
    screenRadius: 'rounded-[36px]',
    statusBarHeight: 'h-8',
    statusBarPadding: 'px-5 pt-1',
    timeText: 'text-[11px]',
    iconScale: 'scale-[0.88] origin-right',
    islandTop: 'top-[7px]',
    islandSize: 'h-[21px] w-[82px] px-2',
    lensSize: 'size-[8px]',
    sensorSize: 'size-[6px]',
    homeWidth: 'w-[98px]',
    homeHeight: 'h-[4px]',
    homeBottom: 'bottom-[5px]',
  },
  md: {
    containerWidth: 'w-full max-w-[358px]',
    aspectRatio: '9 / 19.2',
    outerRadius: 'rounded-[52px]',
    titaniumPadding: 'p-[3px]',
    bezelRadius: 'rounded-[49px]',
    bezelPadding: 'p-[8px]',
    screenRadius: 'rounded-[41px]',
    statusBarHeight: 'h-9',
    statusBarPadding: 'px-6 pt-1',
    timeText: 'text-[12px]',
    iconScale: 'scale-95 origin-right',
    islandTop: 'top-[8px]',
    islandSize: 'h-[25px] w-[96px] px-2.5',
    lensSize: 'size-[9.5px]',
    sensorSize: 'size-[7px]',
    homeWidth: 'w-[114px]',
    homeHeight: 'h-[4.5px]',
    homeBottom: 'bottom-[6px]',
  },
  lg: {
    containerWidth: 'w-[398px]',
    outerRadius: 'rounded-[55px]',
    titaniumPadding: 'p-[3px]',
    bezelRadius: 'rounded-[52px]',
    bezelPadding: 'p-[9px]',
    screenRadius: 'rounded-[43px]',
    statusBarHeight: 'h-10',
    statusBarPadding: 'px-7 pt-1',
    timeText: 'text-[13px]',
    iconScale: 'scale-100 origin-right',
    islandTop: 'top-[9px]',
    islandSize: 'h-[27px] w-[104px] px-2.5',
    lensSize: 'size-[10px]',
    sensorSize: 'size-[7.5px]',
    homeWidth: 'w-[126px]',
    homeHeight: 'h-[5px]',
    homeBottom: 'bottom-[7px]',
  },
};

const FINISH_STYLES: Record<
  PhoneMockupFinish,
  { chassis: string; buttonLeft: string; buttonRight: string; outerShadow: string }
> = {
  'titanium-dark': {
    chassis:
      'linear-gradient(145deg, #52525b 0%, #27272a 22%, #63636e 48%, #18181b 76%, #3f3f46 100%)',
    buttonLeft: 'linear-gradient(180deg, #52525b 0%, #27272a 50%, #3f3f46 100%)',
    buttonRight: 'linear-gradient(180deg, #52525b 0%, #27272a 50%, #3f3f46 100%)',
    outerShadow:
      'inset 0 1px 1px rgba(255, 255, 255, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.14), 0 30px 60px -15px rgba(0, 0, 0, 0.45), 0 12px 24px -8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(9, 9, 11, 0.9)',
  },
  'titanium-natural': {
    chassis:
      'linear-gradient(145deg, #969087 0%, #57534e 22%, #b5afa6 48%, #44403c 76%, #78716c 100%)',
    buttonLeft: 'linear-gradient(180deg, #a8a29e 0%, #57534e 50%, #78716c 100%)',
    buttonRight: 'linear-gradient(180deg, #a8a29e 0%, #57534e 50%, #78716c 100%)',
    outerShadow:
      'inset 0 1px 1px rgba(255, 255, 255, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 30px 60px -15px rgba(0, 0, 0, 0.42), 0 12px 24px -8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(28, 25, 23, 0.85)',
  },
  'titanium-silver': {
    chassis:
      'linear-gradient(145deg, #e4e4e7 0%, #a1a1aa 22%, #f4f4f5 48%, #71717a 76%, #d4d4d8 100%)',
    buttonLeft: 'linear-gradient(180deg, #e4e4e7 0%, #a1a1aa 50%, #d4d4d8 100%)',
    buttonRight: 'linear-gradient(180deg, #e4e4e7 0%, #a1a1aa 50%, #d4d4d8 100%)',
    outerShadow:
      'inset 0 1px 1.5px rgba(255, 255, 255, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 30px 60px -15px rgba(0, 0, 0, 0.35), 0 12px 24px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(82, 82, 91, 0.65)',
  },
};

/**
 * Realistic iPhone 16 Pro hardware mockup with concentric curvature:
 * - Multi-layered brushed titanium alloy chassis & specular catchlight
 * - Protruding hardware side buttons (Action, Volume Up/Down, Power, Camera Control)
 * - Antenna band breaks & top earpiece speaker micro-slit
 * - Concentric OLED glass bezel, Dynamic Island with sapphire camera lens glint,
 *   iOS status bar (9:41, cellular, Wi-Fi, battery), and bottom Home Indicator.
 */
export function PhoneMockup({
  size = 'md',
  finish = 'titanium-dark',
  showStatusBar = true,
  showDynamicIsland = true,
  showHomeIndicator = true,
  showGlare = true,
  time = '9:41',
  responsiveFrame = false,
  screenClassName,
  className,
  style,
  children,
  ...props
}: PhoneMockupProps) {
  const spec = SIZE_SPECS[size];
  const finishStyle = FINISH_STYLES[finish];

  const hideOnMobile = responsiveFrame ? 'max-[479px]:hidden' : '';

  return (
    <div
      className={cx(
        'relative shrink-0 select-none transition-all duration-300',
        spec.containerWidth,
        spec.outerRadius,
        spec.titaniumPadding,
        responsiveFrame &&
          'max-[479px]:!h-full max-[479px]:!w-full max-[479px]:!max-w-none max-[479px]:!rounded-none max-[479px]:!p-0 max-[479px]:!shadow-none max-[479px]:![background:none]',
        className,
      )}
      style={
        {
          ...(spec.aspectRatio ? { aspectRatio: spec.aspectRatio } : {}),
          background: finishStyle.chassis,
          boxShadow: finishStyle.outerShadow,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {/* --- Hardware Side Buttons (Left Rail: Action, Volume Up, Volume Down) --- */}
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -left-[2.5px] top-[13.5%] h-[3.6%] w-[3px] rounded-l-[2.5px] shadow-[inset_1px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.5)]',
          hideOnMobile,
        )}
        style={{ background: finishStyle.buttonLeft }}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -left-[2.5px] top-[19.8%] h-[6.8%] w-[3px] rounded-l-[2.5px] shadow-[inset_1px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.5)]',
          hideOnMobile,
        )}
        style={{ background: finishStyle.buttonLeft }}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -left-[2.5px] top-[28.2%] h-[6.8%] w-[3px] rounded-l-[2.5px] shadow-[inset_1px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.5)]',
          hideOnMobile,
        )}
        style={{ background: finishStyle.buttonLeft }}
      />

      {/* --- Hardware Side Buttons (Right Rail: Power/Side + Camera Control) --- */}
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -right-[2.5px] top-[21.5%] h-[9.8%] w-[3px] rounded-r-[2.5px] shadow-[inset_-1px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.5)]',
          hideOnMobile,
        )}
        style={{ background: finishStyle.buttonRight }}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -right-[1.5px] top-[58%] h-[7.2%] w-[2px] rounded-r-[1.5px] opacity-80 shadow-[inset_-0.5px_0_0_rgba(255,255,255,0.22)]',
          hideOnMobile,
        )}
        style={{ background: finishStyle.buttonRight }}
      />

      {/* --- Antenna Band Breaks --- */}
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute left-0 top-[9%] h-[2px] w-[3px] bg-black/45',
          hideOnMobile,
        )}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute right-0 top-[9%] h-[2px] w-[3px] bg-black/45',
          hideOnMobile,
        )}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute bottom-[9%] left-0 h-[2px] w-[3px] bg-black/45',
          hideOnMobile,
        )}
      />
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute bottom-[9%] right-0 h-[2px] w-[3px] bg-black/45',
          hideOnMobile,
        )}
      />

      {/* --- Inner Black Glass Bezel --- */}
      <div
        className={cx(
          'relative size-full bg-[#09090b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_0_1px_rgba(0,0,0,0.95)]',
          spec.bezelRadius,
          spec.bezelPadding,
          responsiveFrame &&
            'max-[479px]:!rounded-none max-[479px]:!bg-transparent max-[479px]:!p-0 max-[479px]:!shadow-none',
        )}
      >
        {/* Top Earpiece Speaker Micro-Slit */}
        <div
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute left-1/2 top-[2.5px] z-40 h-[2.5px] w-[14%] -translate-x-1/2 rounded-full bg-[#18181b] shadow-[inset_0_1px_1px_rgba(0,0,0,0.95),0_0.5px_0_rgba(255,255,255,0.1)]',
            hideOnMobile,
          )}
        />

        {/* --- Concentric OLED Screen Viewport --- */}
        <div
          className={cx(
            'relative size-full overflow-hidden bg-background select-auto',
            spec.screenRadius,
            responsiveFrame && 'max-[479px]:!rounded-none',
            screenClassName,
          )}
        >
          {/* Screen Content */}
          <div className="size-full overflow-hidden">{children}</div>

          {/* Subtle OLED Glass Diagonal Specular Glare */}
          {showGlare && (
            <div
              aria-hidden="true"
              className={cx('pointer-events-none absolute inset-0 z-20', hideOnMobile)}
              style={{
                background:
                  'linear-gradient(118deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.012) 34%, transparent 34.1%, transparent 100%)',
              }}
            />
          )}

          {/* Inner Screen Glass Recess Ring */}
          <div
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
              spec.screenRadius,
              hideOnMobile,
            )}
          />

          {/* iOS Status Bar (Time on Left, Cellular / Wi-Fi / Battery on Right) */}
          {showStatusBar && (
            <div
              aria-hidden="true"
              className={cx(
                'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between text-white select-none',
                spec.statusBarHeight,
                spec.statusBarPadding,
                hideOnMobile,
              )}
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.08) 65%, transparent 100%)',
              }}
            >
              <span
                className={cx(
                  'font-sans font-semibold leading-none tracking-[-0.02em] tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]',
                  spec.timeText,
                )}
              >
                {time}
              </span>

              <div
                className={cx(
                  'flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]',
                  spec.iconScale,
                )}
              >
                {/* Cellular Signal Bars */}
                <svg
                  width="15"
                  height="10"
                  viewBox="0 0 15 10"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <rect x="0.5" y="6.5" width="2.2" height="3.5" rx="0.8" />
                  <rect x="4.1" y="4.5" width="2.2" height="5.5" rx="0.8" />
                  <rect x="7.7" y="2.3" width="2.2" height="7.7" rx="0.8" />
                  <rect x="11.3" y="0" width="2.2" height="10" rx="0.8" />
                </svg>

                {/* Wi-Fi Waves */}
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 16 12"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M8 9.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm-3.35-1.9a.85.85 0 0 1 1.18-.05 3.6 3.6 0 0 1 4.34 0 .85.85 0 0 1 1.13 1.27 5.3 5.3 0 0 0-6.6 0 .85.85 0 0 1-.05-1.22Zm-2.68-2.66a.85.85 0 0 1 1.2-.04 7.45 7.45 0 0 1 9.66 0 .85.85 0 0 1-1.12 1.28 5.75 5.75 0 0 0-7.42 0 .85.85 0 0 1-1.2-.04.85.85 0 0 1-.12-1.2ZM.24 2.18a.85.85 0 0 1 1.2-.05 11.3 11.3 0 0 1 13.12 0 .85.85 0 1 1-1.1 1.3 9.6 9.6 0 0 0-10.92 0 .85.85 0 0 1-1.3-1.25Z" />
                </svg>

                {/* iOS Battery Icon */}
                <svg width="22" height="11" viewBox="0 0 25 12" fill="none" className="shrink-0">
                  <rect
                    x="0.6"
                    y="0.6"
                    width="21"
                    height="10.8"
                    rx="3.2"
                    stroke="currentColor"
                    strokeOpacity="0.45"
                    strokeWidth="1.2"
                  />
                  <rect x="2.3" y="2.3" width="17.6" height="7.4" rx="1.8" fill="currentColor" />
                  <path d="M23 4v4a1.8 1.8 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.5" />
                </svg>
              </div>
            </div>
          )}

          {/* Dynamic Island (TrueDepth Camera System + IR Sensor) */}
          {showDynamicIsland && (
            <div
              aria-hidden="true"
              data-testid="phone-dynamic-island"
              className={cx(
                'pointer-events-none absolute left-1/2 z-40 flex -translate-x-1/2 items-center justify-between rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.45)]',
                spec.islandTop,
                spec.islandSize,
                hideOnMobile,
              )}
            >
              {/* Left FaceID Infrared Illuminator */}
              <span
                className={cx(
                  'rounded-full bg-[#111116] shadow-[inset_0_0_1.5px_rgba(255,255,255,0.12)]',
                  spec.sensorSize,
                )}
              />

              {/* Right TrueDepth Sapphire Camera Lens with Optical Reflection */}
              <span
                className={cx(
                  'relative rounded-full shadow-[inset_0_0_1.5px_rgba(255,255,255,0.22),0_0_0_0.5px_rgba(255,255,255,0.08)]',
                  spec.lensSize,
                )}
                style={{
                  background:
                    'radial-gradient(circle at 35% 35%, #1e293b 0%, #0f172a 48%, #020617 85%)',
                }}
              >
                <span className="absolute left-[22%] top-[22%] size-[28%] rounded-full bg-sky-400/75" />
                <span className="absolute bottom-[22%] right-[22%] size-[18%] rounded-full bg-indigo-400/45" />
              </span>
            </div>
          )}

          {/* Bottom iOS Home Indicator */}
          {showHomeIndicator && (
            <div
              aria-hidden="true"
              data-testid="phone-home-indicator"
              className={cx(
                'pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_1px_3px_rgba(0,0,0,0.45),0_0_0_0.5px_rgba(0,0,0,0.22)]',
                spec.homeWidth,
                spec.homeHeight,
                spec.homeBottom,
                hideOnMobile,
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
