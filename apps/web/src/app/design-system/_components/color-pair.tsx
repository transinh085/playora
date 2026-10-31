'use client';

import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

function toRgb(color: string, backdrop = '#ffffff'): [number, number, number] | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.fillStyle = backdrop;
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1).data;
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export function ColorPair({
  name,
  role,
  background,
  foreground,
  className,
}: {
  name: string;
  role: string;
  background: string;
  foreground: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [info, setInfo] = React.useState<{ ratio: number; bg: string; fg: string } | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const style = getComputedStyle(element);
      const page = getComputedStyle(document.body).backgroundColor;
      const bg = toRgb(style.backgroundColor, page);
      if (!bg) {
        return;
      }
      const fg = toRgb(style.color, toHex(bg));
      if (fg) {
        setInfo({ ratio: contrast(bg, fg), bg: toHex(bg), fg: toHex(fg) });
      }
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  const level = !info
    ? ''
    : info.ratio >= 7
      ? 'AAA'
      : info.ratio >= 4.5
        ? 'AA'
        : info.ratio >= 3
          ? 'AA Large'
          : 'Fail';

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs',
        className,
      )}
    >
      <div
        ref={ref}
        style={{
          backgroundColor: `var(--${background})`,
          color: `var(--${foreground})`,
        }}
        className="flex h-24 items-end justify-between p-4 transition-colors"
      >
        <span className="text-2xl font-bold tracking-tight">Aa Tiếng Việt</span>
        {info && (
          <span className="rounded-full border border-current/25 bg-black/10 px-2.5 py-0.5 font-mono text-[11px] font-medium backdrop-blur-xs">
            {info.ratio.toFixed(1)}:1 · {level}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          {info && (
            <span className="font-mono text-[11px] text-muted-foreground uppercase">{info.bg}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{role}</span>
        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
          --{background} / --{foreground}
        </span>
      </div>
    </div>
  );
}
