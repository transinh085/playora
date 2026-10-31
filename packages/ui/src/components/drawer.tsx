'use client';

import { MoreHorizontal, PanelLeft, X } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  showBackdrop?: boolean;
  children: React.ReactNode;
}

export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export interface DrawerSummaryProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  avatar?: React.ReactNode;
  title: React.ReactNode;
  teamAvatars?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface DrawerPropertyRowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  children: React.ReactNode;
}

export interface DrawerMetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  badge?: React.ReactNode;
  badgeColor?: 'default' | 'success' | 'warning' | 'info';
  description?: React.ReactNode;
}

export interface DrawerNoteCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  date?: React.ReactNode;
  author?: React.ReactNode;
  children: React.ReactNode;
  onMore?: () => void;
}

export interface DrawerFileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  name: React.ReactNode;
  size?: React.ReactNode;
  date?: React.ReactNode;
  onDownload?: () => void;
}

// ============================================================================
// Drawer Root
// ============================================================================

export function Drawer({
  open,
  onOpenChange,
  defaultWidth = 612,
  minWidth = 380,
  maxWidth,
  resizable = true,
  showBackdrop = true,
  children,
  className,
  ...props
}: DrawerProps) {
  const [width, setWidth] = React.useState<number>(defaultWidth);
  const [isResizing, setIsResizing] = React.useState<boolean>(false);
  const drawerRef = React.useRef<HTMLElement>(null);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Drag-to-resize handle logic
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const calculatedMax = maxWidth ?? window.innerWidth - 180;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > calculatedMax) newWidth = calculatedMax;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && open && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close drawer backdrop"
          data-slot="drawer-backdrop"
          onClick={() => onOpenChange(false)}
          className={cn(
            'fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 dark:bg-black/50 cursor-default',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
      )}

      {/* Drawer Surface */}
      <aside
        ref={drawerRef}
        data-slot="drawer-surface"
        style={{ width: `${width}px` }}
        className={cn(
          'crm-drawer fixed top-0 right-0 z-50 flex h-full max-w-[calc(100vw-32px)] flex-col border-l border-neutral-200 bg-white dark:border-white/10 dark:bg-[#0A0A0A]',
          open ? 'translate-x-0' : 'translate-x-full',
          isResizing && 'is-resizing select-none',
          className,
        )}
        {...props}
      >
        {/* Left Border Resizer Handle */}
        {resizable && (
          <div
            role="slider"
            aria-orientation="vertical"
            aria-label="Resize drawer"
            aria-valuenow={width}
            aria-valuemin={minWidth}
            aria-valuemax={2000}
            tabIndex={0}
            data-slot="drawer-resizer"
            onMouseDown={handleMouseDown}
            title="Drag to resize drawer"
            className="group absolute top-0 -left-[3px] z-50 h-full w-[6px] cursor-col-resize hover:bg-blue-500/50"
          >
            <div className="mx-auto h-full w-[1px] transition-colors duration-200 group-hover:bg-blue-500" />
          </div>
        )}

        {children}
      </aside>
    </>
  );
}

// ============================================================================
// Drawer Header (Sticky Topbar)
// ============================================================================

export function DrawerHeader({
  breadcrumbs,
  actions,
  onClose,
  children,
  className,
  ...props
}: DrawerHeaderProps) {
  return (
    <header
      data-slot="drawer-header"
      className={cn(
        'sticky top-0 z-20 flex h-[48px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white p-2 dark:border-white/10 dark:bg-[#0A0A0A]',
        className,
      )}
      {...props}
    >
      {/* Left: Breadcrumbs or custom content */}
      <div className="flex h-[32px] items-center gap-2 rounded-md px-2 text-sm">
        {breadcrumbs ?? children}
      </div>

      {/* Right: Actions + Close button */}
      <div className="flex h-[32px] items-center gap-1.5">
        {actions}
        <div className="mx-0.5 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
        <button
          type="button"
          aria-label="Expand view"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
        >
          <PanelLeft className="h-4 w-4 -scale-x-100" />
        </button>
        <button
          type="button"
          aria-label="More options"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 opacity-70 transition-all hover:bg-neutral-100 hover:opacity-100 dark:text-[#737373] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// Drawer Summary (Account / Campaign Profile)
// ============================================================================

export function DrawerSummary({
  avatar,
  title,
  teamAvatars,
  subtitle,
  actions,
  className,
  ...props
}: DrawerSummaryProps) {
  return (
    <section
      data-slot="drawer-summary"
      className={cn(
        'flex shrink-0 flex-col border-b border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-[#0A0A0A]',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col justify-center gap-5 rounded-md px-2 py-3">
        {/* Top: Avatar Badge + Title + Team Avatars */}
        <div className="flex w-full flex-row items-center gap-4">
          {avatar && <div className="shrink-0">{avatar}</div>}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex w-full items-center justify-between gap-2">
              <h2 className="truncate text-[20px] font-medium leading-7 text-neutral-900 dark:text-[#FAFAFA]">
                {title}
              </h2>
              {teamAvatars && (
                <div className="flex shrink-0 items-center opacity-90">{teamAvatars}</div>
              )}
            </div>
            {subtitle && (
              <div className="text-xs text-neutral-500 dark:text-[#737373]">{subtitle}</div>
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
      </div>
    </section>
  );
}

// ============================================================================
// Drawer Tabs System with Animated Sliding Indicator
// ============================================================================

interface DrawerTabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DrawerTabsContext = React.createContext<DrawerTabsContextValue | null>(null);

export function DrawerTabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [tab, setTab] = React.useState<string>(value ?? defaultValue ?? '');

  const activeTab = value ?? tab;
  const setActiveTab = React.useCallback(
    (newTab: string) => {
      if (value === undefined) setTab(newTab);
      onValueChange?.(newTab);
    },
    [value, onValueChange],
  );

  return (
    <DrawerTabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>{children}</div>
    </DrawerTabsContext.Provider>
  );
}

export function DrawerTabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      data-slot="drawer-tabs-list"
      className={cn(
        'relative flex h-[48px] shrink-0 items-center border-b border-neutral-200 bg-neutral-50 px-3 dark:border-white/10 dark:bg-white/5',
        className,
      )}
    >
      {children}
    </nav>
  );
}

export function DrawerTabsTrigger({
  value,
  count,
  children,
  className,
}: {
  value: string;
  count?: number | string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DrawerTabsContext);
  if (!ctx) throw new Error('DrawerTabsTrigger must be used inside DrawerTabs');

  const isActive = ctx.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setActiveTab(value)}
      className={cn(
        'relative flex h-full cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors',
        isActive
          ? 'font-medium text-neutral-900 dark:text-[#FAFAFA]'
          : 'font-normal text-neutral-500 hover:text-neutral-800 dark:text-[#737373] dark:hover:text-[#A3A3A3]',
        className,
      )}
    >
      <span>{children}</span>
      {count !== undefined && <span className="text-xs opacity-70 tabular-nums">({count})</span>}
      {isActive && (
        <div className="absolute inset-x-2 bottom-0 h-[2px] bg-neutral-900 dark:bg-[#FAFAFA]" />
      )}
    </button>
  );
}

export function DrawerTabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DrawerTabsContext);
  if (!ctx) throw new Error('DrawerTabsContent must be used inside DrawerTabs');

  if (ctx.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn('tab-enter flex-1 overflow-y-auto outline-none', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Drawer Property Row (Key-Value Grid)
// ============================================================================

export function DrawerPropertyList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="drawer-property-list"
      className={cn(
        'flex shrink-0 flex-col gap-1 border-b border-neutral-200 bg-white px-3 py-4 dark:border-white/10 dark:bg-[#0A0A0A]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DrawerPropertyRow({
  icon,
  label,
  children,
  className,
  ...props
}: DrawerPropertyRowProps) {
  return (
    <div
      data-slot="drawer-property-row"
      className={cn(
        'group flex h-[36px] w-full items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5',
        className,
      )}
      {...props}
    >
      <div className="flex w-[120px] shrink-0 items-center gap-2 text-sm text-neutral-500 dark:text-[#737373]">
        {icon && <span className="shrink-0 text-neutral-400 dark:text-[#A3A3A3]">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-neutral-900 dark:text-[#FAFAFA]">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Drawer Metric Grid & Card (Overview Section)
// ============================================================================

export function DrawerMetricGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="drawer-metric-grid"
      className={cn('grid grid-cols-1 gap-3 px-1 sm:grid-cols-2', className)}
    >
      {children}
    </div>
  );
}

export function DrawerMetricCard({
  label,
  value,
  badge,
  badgeColor = 'default',
  description,
  className,
  ...props
}: DrawerMetricCardProps) {
  const badgeColorClass =
    badgeColor === 'success'
      ? 'text-green-600 bg-green-500/10 border-green-500/20'
      : badgeColor === 'warning'
        ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
        : badgeColor === 'info'
          ? 'text-blue-600 bg-blue-500/10 border-blue-500/20'
          : 'text-neutral-500 dark:text-[#737373]';

  return (
    <div
      data-slot="drawer-metric-card"
      className={cn(
        'flex h-[142px] flex-col justify-between rounded-lg border border-neutral-200 bg-white p-3.5 shadow-xs transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-[#0A0A0A] dark:hover:border-white/20',
        className,
      )}
      {...props}
    >
      <span className="text-sm font-normal text-neutral-500 dark:text-[#737373]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-normal tracking-tight text-neutral-900 tabular-nums dark:text-[#FAFAFA]">
          {value}
        </span>
        {badge && (
          <div
            className={cn(
              'flex items-center rounded-full border border-neutral-200 bg-white px-2 py-0.5 shadow-2xs dark:border-white/10 dark:bg-[#0A0A0A]',
              badgeColorClass,
            )}
          >
            <span className="text-[10px] font-normal leading-[14px]">{badge}</span>
          </div>
        )}
      </div>
      {description && (
        <p className="line-clamp-2 text-xs font-normal leading-relaxed text-neutral-400 dark:text-[#A3A3A3]">
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Drawer Note Card
// ============================================================================

export function DrawerNoteCard({
  icon,
  title,
  date,
  author,
  children,
  onMore,
  className,
  ...props
}: DrawerNoteCardProps) {
  return (
    <div
      data-slot="drawer-note-card"
      className={cn(
        'flex h-[142px] w-full flex-row items-start gap-4 rounded-lg border border-neutral-200 bg-white p-3.5 shadow-xs transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-transparent dark:hover:border-white/30',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 shadow-2xs dark:border-white/10 dark:bg-white/5">
          {icon}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pt-0.5 pb-1">
        <div className="flex h-5 w-full flex-row items-center justify-between gap-3">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
            {title}
          </span>
          {date && (
            <span className="shrink-0 text-xs text-neutral-500 dark:text-[#737373]">{date}</span>
          )}
        </div>
        <div className="flex w-full flex-col items-start gap-1.5">
          {author && (
            <span className="text-xs font-normal text-neutral-800 dark:text-[#A3A3A3] leading-none">
              {author}
            </span>
          )}
          <div className="line-clamp-2 text-xs font-normal leading-[160%] text-neutral-500 dark:text-[#737373]">
            {children}
          </div>
        </div>
      </div>
      {onMore && (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onMore}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/10"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-neutral-700 dark:text-[#FAFAFA]" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Drawer File Card
// ============================================================================

export function DrawerFileCard({
  icon,
  name,
  size,
  date,
  onDownload,
  className,
  ...props
}: DrawerFileCardProps) {
  return (
    <div
      data-slot="drawer-file-card"
      className={cn(
        'group flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 shadow-xs transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-transparent dark:hover:border-white/30',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-[#A3A3A3]">
            {icon}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
            {name}
          </span>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#737373]">
            {size && <span className="tabular-nums">{size}</span>}
            {size && date && <span>•</span>}
            {date && <span>{date}</span>}
          </div>
        </div>
      </div>
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-white/5"
        >
          <span className="sr-only">Tải về</span>
          <MoreHorizontal className="h-3.5 w-3.5 text-neutral-500" />
        </button>
      )}
    </div>
  );
}
