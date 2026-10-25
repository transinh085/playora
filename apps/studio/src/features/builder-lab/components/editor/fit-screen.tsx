'use client';

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { type CanvasPrize, CanvasScreen } from '@/features/canvas-editor/components/canvas-screen';
import { useCanvasLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import {
  ARTBOARD_WIDTH,
  type BrandPalette,
  type ScreenDoc,
} from '@/features/canvas-editor/lib/model';

/**
 * A canvas screen scaled to its container. `width` fills the width and crops the bottom
 * (gallery thumbnails); `contain` fits the whole screen (phone preview).
 */
export function FitScreen({
  screen,
  brand,
  stage,
  prizes,
  fit = 'width',
  scroll = false,
  animate,
}: {
  screen: ScreenDoc;
  brand: BrandPalette;
  /** Drawn inside the game stage, usually the idle mechanism. */
  stage?: ReactNode;
  prizes?: CanvasPrize[];
  fit?: 'width' | 'contain';
  /** Let a screen taller than the container scroll (width fit only). */
  scroll?: boolean;
  animate?: number;
}) {
  const labels = useCanvasLabels();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale =
    fit === 'width'
      ? size.w / ARTBOARD_WIDTH
      : Math.min(size.w / ARTBOARD_WIDTH, size.h / screen.height);

  return (
    <div
      ref={ref}
      className={`flex h-full w-full justify-center overflow-x-hidden ${scroll ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
    >
      {scale > 0 && (
        <div className="shrink-0">
          <CanvasScreen
            screen={screen}
            brand={brand}
            scale={scale}
            labels={labels}
            animate={animate}
            runtime={{ renderStage: stage ? () => stage : undefined, prizes }}
          />
        </div>
      )}
    </div>
  );
}
