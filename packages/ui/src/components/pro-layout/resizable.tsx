/* biome-ignore-all lint: HeroUI Pro vendor implementation */
'use client';

import { tv } from '@heroui/react';
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { composeSlotClassName, IconGripDotsHorizontal, IconGripDotsVertical } from './shared';

export type ResizableOrientation = 'horizontal' | 'vertical';
export type ResizableHandleType = 'line' | 'pill' | 'drag' | 'handle';
export type ResizableHandleVariant = 'primary' | 'secondary' | 'tertiary';
export type ResizableSize = number | string;
export type ResizableResizeBehavior = 'preserve-relative-size' | 'preserve-pixel-size';

export interface ResizablePanelHandle {
  collapse: () => void;
  expand: () => void;
  isCollapsed: () => boolean;
}

export const resizableVariants = tv({
  defaultVariants: {
    orientation: 'horizontal',
    type: 'line',
    variant: 'primary',
  },
  slots: {
    base: 'resizable',
    handle: 'resizable__handle',
    handleBar: 'resizable__handle-bar',
    handleHitArea: 'resizable__handle-hit-area',
    indicator: 'resizable__handle-indicator',
    panel: 'resizable__panel',
  },
  variants: {
    orientation: {
      horizontal: {
        base: 'resizable--horizontal',
        handle: 'resizable__handle--horizontal',
        handleBar: 'resizable__handle-bar--horizontal',
        handleHitArea: 'resizable__handle-hit-area--horizontal',
      },
      vertical: {
        base: 'resizable--vertical',
        handle: 'resizable__handle--vertical',
        handleBar: 'resizable__handle-bar--vertical',
        handleHitArea: 'resizable__handle-hit-area--vertical',
      },
    },
    type: {
      drag: {
        handle: 'resizable__handle--drag',
        indicator: 'resizable__handle-indicator--drag',
      },
      handle: {
        handle: 'resizable__handle--handle',
        indicator: 'resizable__handle-indicator--pill',
      },
      line: {
        handle: 'resizable__handle--line',
      },
      pill: {
        handle: 'resizable__handle--pill',
        indicator: 'resizable__handle-indicator--pill',
      },
    },
    variant: {
      primary: {
        handle: 'resizable__handle--primary',
      },
      secondary: {
        handle: 'resizable__handle--secondary',
      },
      tertiary: {
        handle: 'resizable__handle--tertiary',
      },
    },
  },
});

export type ResizableSlots = ReturnType<typeof resizableVariants>;

interface ResizableContextValue {
  autoSaveId?: string;
  getSavedSize: (panelId: string) => string | undefined;
  orientation: ResizableOrientation;
  savePanelSize: (panelId: string, cssSize: string) => void;
  slots: ResizableSlots;
}

const ResizableContext = createContext<ResizableContextValue | null>(null);

function useResizableContext(): ResizableContextValue {
  const ctx = useContext(ResizableContext);
  if (!ctx) {
    throw new Error('Resizable subcomponents must be rendered inside <Resizable>.');
  }
  return ctx;
}

function normalizeCssSize(size: ResizableSize | undefined): string | undefined {
  if (size == null) return undefined;
  return typeof size === 'number' ? `${size}%` : size;
}

function parsePixelConstraint(
  value: ResizableSize | undefined,
  containerPx: number,
): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') {
    return (value / 100) * containerPx;
  }
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return undefined;
  if (value.endsWith('%')) return (num / 100) * containerPx;
  if (value.endsWith('rem')) return num * 16;
  return num;
}

export interface ResizableProps extends ComponentProps<'div'> {
  autoSaveId?: string;
  orientation?: ResizableOrientation;
}

function ResizableRoot({
  autoSaveId,
  children,
  className,
  orientation = 'horizontal',
  style,
  ...rest
}: ResizableProps) {
  const slots = useMemo(() => resizableVariants({ orientation }), [orientation]);
  const storageKey = autoSaveId ? `heroui-pro:resizable:${autoSaveId}` : undefined;

  const getSavedSize = useCallback(
    (panelId: string): string | undefined => {
      if (!storageKey || typeof window === 'undefined') return undefined;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw) as Record<string, string>;
        return typeof parsed?.[panelId] === 'string' ? parsed[panelId] : undefined;
      } catch {
        return undefined;
      }
    },
    [storageKey],
  );

  const savePanelSize = useCallback(
    (panelId: string, cssSize: string) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(storageKey);
        const existing = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        existing[panelId] = cssSize;
        window.localStorage.setItem(storageKey, JSON.stringify(existing));
      } catch {
        // Ignore storage write errors
      }
    },
    [storageKey],
  );

  const contextValue = useMemo<ResizableContextValue>(
    () => ({
      autoSaveId,
      getSavedSize,
      orientation,
      savePanelSize,
      slots,
    }),
    [autoSaveId, getSavedSize, orientation, savePanelSize, slots],
  );

  return (
    <ResizableContext.Provider value={contextValue}>
      <div
        className={composeSlotClassName(slots.base, className)}
        data-orientation={orientation}
        data-slot="resizable"
        style={style}
        {...rest}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export interface ResizableIndicatorProps extends ComponentProps<'span'> {
  type?: 'pill' | 'drag';
}

function ResizableIndicator({
  children,
  className,
  type = 'pill',
  ...rest
}: ResizableIndicatorProps) {
  const { orientation, slots } = useResizableContext();
  if (children) {
    return (
      <span
        className={composeSlotClassName(slots.indicator, className)}
        data-slot="resizable-handle-indicator"
        {...rest}
      >
        {children}
      </span>
    );
  }
  if (type === 'drag') {
    const Icon = orientation === 'horizontal' ? IconGripDotsVertical : IconGripDotsHorizontal;
    return (
      <span
        aria-hidden="true"
        className={composeSlotClassName(slots.indicator, className, { type: 'drag' })}
        data-slot="resizable-handle-indicator"
        {...rest}
      >
        <Icon
          className="resizable__handle-indicator-icon"
          data-slot="resizable-handle-indicator-icon"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={composeSlotClassName(slots.indicator, className, { type: 'pill' })}
      data-slot="resizable-handle-indicator"
      {...rest}
    />
  );
}

export interface ResizableHandleProps extends ComponentProps<'div'> {
  disabled?: boolean;
  type?: ResizableHandleType;
  variant?: ResizableHandleVariant;
  withIndicator?: boolean;
}

function ResizableHandle({
  'aria-label': ariaLabel = 'Resize handle',
  children,
  className,
  disabled,
  id,
  onPointerDown,
  type = 'line',
  variant = 'primary',
  withIndicator,
  ...rest
}: ResizableHandleProps) {
  const { orientation } = useResizableContext();
  const handleSlots = useMemo(
    () => resizableVariants({ orientation, type, variant }),
    [orientation, type, variant],
  );
  const [isDragging, setIsDragging] = useState(false);
  const showIndicator = children == null && (withIndicator ?? type !== 'line');
  const indicatorType = type === 'drag' ? 'drag' : 'pill';

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented) return;

    const handleEl = event.currentTarget;
    const prevPanel = handleEl.previousElementSibling as HTMLElement | null;
    const nextPanel = handleEl.nextElementSibling as HTMLElement | null;
    const groupEl = handleEl.parentElement;
    if (!prevPanel || !nextPanel || !groupEl) return;

    const isHorizontal = orientation === 'horizontal';
    const startCoord = isHorizontal ? event.clientX : event.clientY;
    const prevRect = prevPanel.getBoundingClientRect();
    const nextRect = nextPanel.getBoundingClientRect();
    const prevIsFixed = prevPanel.dataset.resizableFixed === 'true';
    const nextIsFixed = nextPanel.dataset.resizableFixed === 'true';
    const targetPanel = prevIsFixed ? prevPanel : nextIsFixed ? nextPanel : prevPanel;
    const sign = targetPanel === prevPanel ? 1 : -1;
    const startSize =
      targetPanel === prevPanel
        ? isHorizontal
          ? prevRect.width
          : prevRect.height
        : isHorizontal
          ? nextRect.width
          : nextRect.height;

    setIsDragging(true);
    handleEl.setPointerCapture?.(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const currentCoord = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = (currentCoord - startCoord) * sign;
      targetPanel.dispatchEvent(
        new CustomEvent('heroui-resizable-drag', {
          detail: { sizePx: Math.max(0, startSize + delta) },
        }),
      );
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={composeSlotClassName(handleSlots.handle, className)}
      data-disabled={disabled ? '' : undefined}
      data-resize-handle-active={isDragging ? 'pointer' : undefined}
      data-resize-handle-state={isDragging ? 'drag' : 'inactive'}
      data-slot="resizable-handle"
      data-type={type}
      data-variant={variant}
      id={id}
      onPointerDown={handlePointerDown}
      role="separator"
      tabIndex={disabled ? undefined : 0}
      {...rest}
    >
      {children}
      {showIndicator ? <ResizableIndicator type={indicatorType} /> : null}
    </div>
  );
}

export interface ResizablePanelProps extends ComponentProps<'div'> {
  collapsedSize?: ResizableSize;
  collapsible?: boolean;
  defaultSize?: ResizableSize;
  groupResizeBehavior?: ResizableResizeBehavior;
  handleRef?: Ref<ResizablePanelHandle | null>;
  maxSize?: ResizableSize;
  minSize?: ResizableSize;
  onCollapse?: () => void;
  onExpand?: () => void;
  onResize?: (size: number) => void;
}

function ResizablePanel({
  children,
  className,
  collapsedSize = 0,
  collapsible = false,
  defaultSize,
  groupResizeBehavior: _groupResizeBehavior,
  handleRef,
  id: propId,
  maxSize,
  minSize,
  onCollapse,
  onExpand,
  onResize,
  style,
  ...rest
}: ResizablePanelProps) {
  const { getSavedSize, orientation, savePanelSize, slots } = useResizableContext();
  const fallbackId = useId();
  const panelId = propId ?? fallbackId;
  const panelRef = useRef<HTMLDivElement | null>(null);

  const initialCssSize = useMemo(
    () => getSavedSize(panelId) ?? normalizeCssSize(defaultSize),
    [defaultSize, getSavedSize, panelId],
  );

  const [sizeCss, setSizeCss] = useState<string | undefined>(initialCssSize);
  const [collapsed, setCollapsed] = useState(false);
  const lastExpandedSizeRef = useRef<string | undefined>(
    initialCssSize ?? normalizeCssSize(minSize) ?? '260px',
  );

  const collapse = useCallback(() => {
    if (!collapsible) return;
    setCollapsed((prev) => {
      if (!prev) {
        onCollapse?.();
      }
      return true;
    });
  }, [collapsible, onCollapse]);

  const expand = useCallback(() => {
    setCollapsed((prev) => {
      if (prev) {
        setSizeCss((curr) => curr ?? lastExpandedSizeRef.current);
        onExpand?.();
      }
      return false;
    });
  }, [onExpand]);

  useImperativeHandle(
    handleRef,
    () => ({
      collapse,
      expand,
      isCollapsed: () => collapsed,
    }),
    [collapse, collapsed, expand],
  );

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const handleDrag = (event: Event) => {
      const detail = (event as CustomEvent<{ sizePx: number }>).detail;
      const groupEl = el.parentElement;
      const containerPx = groupEl
        ? orientation === 'horizontal'
          ? groupEl.clientWidth
          : groupEl.clientHeight
        : 1000;

      const minPx = parsePixelConstraint(minSize, containerPx) ?? 0;
      const maxPx = parsePixelConstraint(maxSize, containerPx) ?? containerPx;
      const rawPx = detail.sizePx;

      if (collapsible && rawPx < minPx * 0.5) {
        collapse();
        return;
      }

      if (collapsed && rawPx >= minPx * 0.5) {
        setCollapsed(false);
        onExpand?.();
      }

      const clampedPx = Math.min(maxPx, Math.max(minPx, rawPx));
      const nextCss = `${Math.round(clampedPx)}px`;
      lastExpandedSizeRef.current = nextCss;
      setSizeCss(nextCss);
      savePanelSize(panelId, nextCss);
      onResize?.(clampedPx);
    };

    el.addEventListener('heroui-resizable-drag', handleDrag);
    return () => el.removeEventListener('heroui-resizable-drag', handleDrag);
  }, [
    collapse,
    collapsed,
    collapsible,
    maxSize,
    minSize,
    onExpand,
    onResize,
    orientation,
    panelId,
    savePanelSize,
  ]);

  const isFixedPanel = defaultSize !== undefined || minSize !== undefined || maxSize !== undefined;
  const resolvedBasis = collapsed ? (normalizeCssSize(collapsedSize) ?? '0px') : sizeCss;

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      flexBasis: resolvedBasis ?? '0%',
      flexGrow: isFixedPanel ? 0 : 1,
      flexShrink: isFixedPanel ? 0 : 1,
      ...(collapsed
        ? orientation === 'horizontal'
          ? { maxWidth: resolvedBasis, minWidth: 0, width: resolvedBasis }
          : { height: resolvedBasis, maxHeight: resolvedBasis, minHeight: 0 }
        : resolvedBasis
          ? orientation === 'horizontal'
            ? { width: resolvedBasis }
            : { height: resolvedBasis }
          : undefined),
      ...style,
    }),
    [collapsed, isFixedPanel, orientation, resolvedBasis, style],
  );

  return (
    <div
      ref={panelRef}
      className={composeSlotClassName(slots.panel, className)}
      data-collapsed={collapsed || undefined}
      data-resizable-fixed={isFixedPanel ? 'true' : undefined}
      data-slot="resizable-panel"
      id={panelId}
      style={panelStyle}
      {...rest}
    >
      {children}
    </div>
  );
}

export const Resizable = Object.assign(ResizableRoot, {
  Handle: ResizableHandle,
  Indicator: ResizableIndicator,
  Panel: ResizablePanel,
  Root: ResizableRoot,
});
