/* biome-ignore-all lint: HeroUI Pro vendor implementation */
'use client';

import {
  Button,
  type ButtonProps,
  Sheet,
  ToggleButton,
  type ToggleButtonProps,
  Tooltip,
  type TooltipContentProps,
  type TooltipProps,
  tv,
  useMediaQuery,
} from '@heroui/react';
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NavbarAppLayoutBridgeContext } from './navbar';
import {
  Resizable,
  type ResizablePanelHandle,
  type ResizableResizeBehavior,
  type ResizableSize,
} from './resizable';
import {
  composeSlotClassName,
  composeTwRenderProps,
  IconBars3,
  IconLayoutSideContentRight,
  isEditableTarget,
  matchesShortcut,
  parseShortcut,
  setCookie,
} from './shared';
import {
  Sidebar,
  type SidebarCollapsible,
  type SidebarProviderProps,
  type SidebarSide,
  type SidebarVariant,
  useSidebar,
} from './sidebar';

const MOBILE_ASIDE_SYMBOL = Symbol.for('heroui-pro.app-layout.mobile-aside');

export type AppLayoutAsideMobile = 'hidden' | 'sheet';
export type AppLayoutScrollMode = 'page' | 'content';

export const appLayoutVariants = tv({
  defaultVariants: {
    scrollMode: 'page',
  },
  slots: {
    aside: 'app-layout__aside',
    asideInner: 'app-layout__aside-inner',
    asideMobileDialog: 'app-layout__aside-mobile-dialog',
    asideMobileSheet: 'app-layout__aside-mobile-sheet',
    asideTrigger: 'app-layout__aside-trigger',
    base: 'app-layout',
    body: 'app-layout__body',
    footer: 'app-layout__footer',
    header: 'app-layout__header',
    main: 'app-layout__main',
    menuToggle: 'app-layout__menu-toggle',
    toolbar: 'app-layout__toolbar',
  },
  variants: {
    scrollMode: {
      content: {
        base: 'app-layout--content-scroll',
      },
      page: {},
    },
  },
});

export type AppLayoutSlots = ReturnType<typeof appLayoutVariants>;

export interface AppLayoutContextValue {
  asideAriaLabel: string;
  asideMobile: AppLayoutAsideMobile;
  isAsideMobile: boolean;
  isAsideOpen: boolean;
  setAsideOpen: (open: boolean) => void;
  slots: AppLayoutSlots;
  toggleAside: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function useAppLayout(): AppLayoutContextValue | null {
  return useContext(AppLayoutContext);
}

export interface AppLayoutTooltipProps extends Omit<TooltipProps, 'children'> {
  className?: string;
  offset?: TooltipContentProps['offset'];
  placement?: TooltipContentProps['placement'];
  showArrow?: boolean;
}

export interface AppLayoutMobileAsideProps {
  children?: ReactNode;
}

function AppLayoutMobileAside(_props: AppLayoutMobileAsideProps): ReactElement | null {
  return null;
}
(AppLayoutMobileAside as unknown as Record<symbol, boolean>)[MOBILE_ASIDE_SYMBOL] = true;

function isMobileAsideElement(node: ReactNode): node is ReactElement<AppLayoutMobileAsideProps> {
  if (!isValidElement(node)) return false;
  const typeObj = node.type as unknown as Record<symbol, boolean> | null;
  return Boolean(typeObj && typeof typeObj === 'function' && typeObj[MOBILE_ASIDE_SYMBOL]);
}

function extractMobileAside(children: ReactNode): {
  mainChildren: ReactNode[];
  mobileAsideNodes: ReactNode[];
} {
  const mainChildren: ReactNode[] = [];
  const mobileAsideNodes: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isMobileAsideElement(child)) {
      mobileAsideNodes.push(child.props.children);
    } else {
      mainChildren.push(child);
    }
  });

  return { mainChildren, mobileAsideNodes };
}

function isSidebarMobileElement(node: ReactNode): boolean {
  return isValidElement(node) && node.type === Sidebar.Mobile;
}

function splitDesktopAndMobileSidebar(sidebar: ReactNode): {
  desktopSidebar: ReactNode[];
  mobileSidebar: ReactNode[];
} {
  const desktopSidebar: ReactNode[] = [];
  const mobileSidebar: ReactNode[] = [];

  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) {
        if (child != null && typeof child !== 'boolean') {
          desktopSidebar.push(child);
        }
        return;
      }
      if (child.type === Fragment) {
        visit(child.props.children);
        return;
      }
      if (isSidebarMobileElement(child)) {
        mobileSidebar.push(child);
      } else {
        desktopSidebar.push(child);
      }
    });
  };

  visit(sidebar);
  return { desktopSidebar, mobileSidebar };
}

interface ResizableAppLayoutBodyProps {
  aside?: ReactNode;
  asideAriaLabel: string;
  asideDefaultSize: ResizableSize;
  asideMaxSize: ResizableSize;
  asideMinSize: ResizableSize;
  asideResizable: boolean;
  asideResizeBehavior?: ResizableResizeBehavior;
  bodyElement: ReactNode;
  isAsideOpen: boolean;
  resizableAutoSaveId?: string;
  setAsideOpen: (open: boolean) => void;
  sidebar?: ReactNode;
  sidebarCollapsible: SidebarCollapsible;
  sidebarDefaultSize: ResizableSize;
  sidebarMaxSize: ResizableSize;
  sidebarMinSize: ResizableSize;
  sidebarResizable: boolean;
  sidebarResizeBehavior?: ResizableResizeBehavior;
  sidebarSide: SidebarSide;
  slots: AppLayoutSlots;
}

function ResizableAppLayoutBody({
  aside,
  asideAriaLabel,
  asideDefaultSize,
  asideMaxSize,
  asideMinSize,
  asideResizable,
  asideResizeBehavior,
  bodyElement,
  isAsideOpen,
  resizableAutoSaveId,
  setAsideOpen,
  sidebar,
  sidebarCollapsible,
  sidebarDefaultSize,
  sidebarMaxSize,
  sidebarMinSize,
  sidebarResizable,
  sidebarResizeBehavior,
  sidebarSide,
  slots,
}: ResizableAppLayoutBodyProps) {
  const { isMobile, isOpen: isSidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const isBelowLg = useMediaQuery('(width < 64rem)');

  const sidebarHandleRef = useRef<ResizablePanelHandle | null>(null);
  const asideHandleRef = useRef<ResizablePanelHandle | null>(null);

  const canResizeSidebar =
    sidebarResizable && sidebar != null && !isMobile && sidebarCollapsible !== 'icon';
  const canResizeAside = asideResizable && aside != null && !isBelowLg;

  const { desktopSidebar, mobileSidebar } = useMemo(
    () =>
      canResizeSidebar
        ? splitDesktopAndMobileSidebar(sidebar)
        : { desktopSidebar: [], mobileSidebar: [] },
    [canResizeSidebar, sidebar],
  );

  const isSidebarCollapsible = sidebarCollapsible === 'offcanvas';

  useEffect(() => {
    if (!canResizeSidebar || !isSidebarCollapsible) return;
    const handle = sidebarHandleRef.current;
    if (!handle) return;
    if (isSidebarOpen && handle.isCollapsed()) {
      handle.expand();
    } else if (!isSidebarOpen && !handle.isCollapsed()) {
      handle.collapse();
    }
  }, [canResizeSidebar, isSidebarCollapsible, isSidebarOpen]);

  useEffect(() => {
    if (!canResizeAside) return;
    const handle = asideHandleRef.current;
    if (!handle) return;
    if (isAsideOpen && handle.isCollapsed()) {
      handle.expand();
    } else if (!isAsideOpen && !handle.isCollapsed()) {
      handle.collapse();
    }
  }, [canResizeAside, isAsideOpen]);

  const handleSidebarCollapse = useCallback(() => {
    if (isSidebarCollapsible && isSidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isSidebarCollapsible, isSidebarOpen, setSidebarOpen]);

  const handleSidebarExpand = useCallback(() => {
    if (isSidebarCollapsible && !isSidebarOpen) {
      setSidebarOpen(true);
    }
  }, [isSidebarCollapsible, isSidebarOpen, setSidebarOpen]);

  const handleAsideCollapse = useCallback(() => {
    if (isAsideOpen) {
      setAsideOpen(false);
    }
  }, [isAsideOpen, setAsideOpen]);

  const handleAsideExpand = useCallback(() => {
    if (!isAsideOpen) {
      setAsideOpen(true);
    }
  }, [isAsideOpen, setAsideOpen]);

  const sidebarPanelStyle = useMemo(() => ({ '--sidebar-width': '100%' }) as CSSProperties, []);

  const sidebarPanel = canResizeSidebar ? (
    <Resizable.Panel
      key="sidebar"
      collapsedSize={0}
      collapsible={isSidebarCollapsible}
      defaultSize={sidebarDefaultSize}
      groupResizeBehavior={sidebarResizeBehavior}
      handleRef={sidebarHandleRef}
      id="app-layout-sidebar"
      maxSize={sidebarMaxSize}
      minSize={sidebarMinSize}
      onCollapse={handleSidebarCollapse}
      onExpand={handleSidebarExpand}
      style={sidebarPanelStyle}
    >
      {desktopSidebar}
    </Resizable.Panel>
  ) : null;

  const sidebarHandle = canResizeSidebar ? (
    <Resizable.Handle
      key="sidebar-handle"
      aria-label="Resize sidebar"
      disabled={isSidebarCollapsible && !isSidebarOpen}
      id="app-layout-sidebar-handle"
    />
  ) : null;

  const mainPanel = (
    <Resizable.Panel key="body" className="app-layout__resizable-body" id="app-layout-body">
      {bodyElement}
    </Resizable.Panel>
  );

  const asideHandle = canResizeAside ? (
    <Resizable.Handle
      key="aside-handle"
      aria-label="Resize aside"
      disabled={!isAsideOpen}
      id="app-layout-aside-handle"
    />
  ) : null;

  const asidePanel = canResizeAside ? (
    <Resizable.Panel
      key="aside"
      collapsedSize={0}
      collapsible
      defaultSize={asideDefaultSize}
      groupResizeBehavior={asideResizeBehavior}
      handleRef={asideHandleRef}
      id="app-layout-aside"
      maxSize={asideMaxSize}
      minSize={asideMinSize}
      onCollapse={handleAsideCollapse}
      onExpand={handleAsideExpand}
    >
      <aside
        aria-label={asideAriaLabel}
        className="app-layout__aside app-layout__aside--resizable"
        data-slot="app-layout-aside"
        data-state={isAsideOpen ? 'open' : 'closed'}
      >
        <div className={slots.asideInner()}>{aside}</div>
      </aside>
    </Resizable.Panel>
  ) : null;

  const staticAside =
    !canResizeAside && aside != null ? (
      <aside
        aria-label={asideAriaLabel}
        className={slots.aside()}
        data-slot="app-layout-aside"
        data-state={isAsideOpen ? 'open' : 'closed'}
      >
        <div className={slots.asideInner()}>{aside}</div>
      </aside>
    ) : null;

  if (!canResizeSidebar && !canResizeAside) {
    return (
      <>
        {sidebar}
        {bodyElement}
        {staticAside}
      </>
    );
  }

  return (
    <>
      {!canResizeSidebar ? sidebar : mobileSidebar}
      <Resizable
        autoSaveId={resizableAutoSaveId}
        className="app-layout__resizable"
        orientation="horizontal"
      >
        {sidebarSide === 'left' ? (
          <>
            {sidebarPanel}
            {sidebarHandle}
            {mainPanel}
            {asideHandle}
            {asidePanel}
          </>
        ) : (
          <>
            {mainPanel}
            {asideHandle}
            {asidePanel}
            {sidebarHandle}
            {sidebarPanel}
          </>
        )}
      </Resizable>
      {staticAside}
    </>
  );
}

export interface AppLayoutProps
  extends Omit<
    SidebarProviderProps,
    'collapsible' | 'defaultOpen' | 'onOpenChange' | 'open' | 'side' | 'variant'
  > {
  aside?: ReactNode;
  asideAriaLabel?: string;
  asideDefaultSize?: ResizableSize;
  asideMaxSize?: ResizableSize;
  asideMinSize?: ResizableSize;
  asideMobile?: AppLayoutAsideMobile;
  asideMobileBackdrop?: 'opaque' | 'blur' | 'transparent';
  asideOpen?: boolean;
  asideResizable?: boolean;
  asideResizeBehavior?: ResizableResizeBehavior;
  asideToggleShortcut?: string | false;
  defaultAsideOpen?: boolean;
  defaultSidebarOpen?: boolean;
  footer?: ReactNode;
  navbar?: ReactNode;
  onAsideOpenChange?: (open: boolean) => void;
  onSidebarOpenChange?: (open: boolean) => void;
  resizableAutoSaveId?: string;
  scrollMode?: AppLayoutScrollMode;
  sidebar?: ReactNode;
  sidebarCollapsible?: SidebarCollapsible;
  sidebarDefaultSize?: ResizableSize;
  sidebarMaxSize?: ResizableSize;
  sidebarMinSize?: ResizableSize;
  sidebarOpen?: boolean;
  sidebarResizable?: boolean;
  sidebarResizeBehavior?: ResizableResizeBehavior;
  sidebarSide?: SidebarSide;
  sidebarVariant?: SidebarVariant;
  toolbar?: ReactNode;
}

function AppLayoutRoot({
  aside,
  asideAriaLabel = 'Complementary',
  asideDefaultSize = 20,
  asideMaxSize = 40,
  asideMinSize = 14,
  asideMobile = 'hidden',
  asideMobileBackdrop = 'opaque',
  asideOpen: controlledAsideOpen,
  asideResizable = false,
  asideResizeBehavior,
  asideToggleShortcut = false,
  children,
  className,
  defaultAsideOpen = true,
  defaultSidebarOpen = true,
  footer,
  hrefConfig,
  navbar,
  navigate,
  onAsideOpenChange,
  onSidebarOpenChange,
  reduceMotion,
  resizableAutoSaveId,
  scrollMode = 'page',
  sidebar,
  sidebarCollapsible = 'icon',
  sidebarDefaultSize = 18,
  sidebarMaxSize = 32,
  sidebarMinSize = 12,
  sidebarOpen,
  sidebarResizable = false,
  sidebarResizeBehavior,
  sidebarSide = 'left',
  sidebarVariant = 'sidebar',
  toggleShortcut = 'mod+b',
  toolbar,
  ...rest
}: AppLayoutProps) {
  const [uncontrolledAsideOpen, setUncontrolledAsideOpen] = useState(defaultAsideOpen);
  const isAsideControlled = controlledAsideOpen !== undefined;
  const isAsideOpen = isAsideControlled ? controlledAsideOpen : uncontrolledAsideOpen;
  const isAsideOpenRef = useRef(isAsideOpen);
  isAsideOpenRef.current = isAsideOpen;

  const isAsideMobile = useMediaQuery('(width < 64rem)');

  const setAsideOpen = useCallback(
    (next: boolean) => {
      if (!isAsideControlled) {
        setUncontrolledAsideOpen(next);
        setCookie('aside_state', String(next));
      }
      onAsideOpenChange?.(next);
    },
    [isAsideControlled, onAsideOpenChange],
  );

  const toggleAside = useCallback(() => {
    setAsideOpen(!isAsideOpenRef.current);
  }, [setAsideOpen]);

  const parsedAsideShortcut = useMemo(
    () =>
      asideToggleShortcut === false || !asideToggleShortcut
        ? null
        : parseShortcut(asideToggleShortcut),
    [asideToggleShortcut],
  );

  useEffect(() => {
    if (!parsedAsideShortcut) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        !isEditableTarget(event.target) &&
        matchesShortcut(event, parsedAsideShortcut)
      ) {
        event.preventDefault();
        toggleAside();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedAsideShortcut, toggleAside]);

  const slots = useMemo(() => appLayoutVariants({ scrollMode }), [scrollMode]);

  const contextValue = useMemo<AppLayoutContextValue>(
    () => ({
      asideAriaLabel,
      asideMobile,
      isAsideMobile,
      isAsideOpen,
      setAsideOpen,
      slots,
      toggleAside,
    }),
    [asideAriaLabel, asideMobile, isAsideMobile, isAsideOpen, setAsideOpen, slots, toggleAside],
  );

  const { mainChildren, mobileAsideNodes } = useMemo(
    () => extractMobileAside(children),
    [children],
  );

  const shouldUseResizable =
    (sidebarResizable && sidebar != null && sidebarCollapsible !== 'icon') ||
    (asideResizable && aside != null);

  const bodyElement = (
    <div className={slots.body()} data-slot="app-layout-body">
      {navbar != null ? (
        <div className={slots.header()} data-slot="app-layout-header">
          {navbar}
        </div>
      ) : null}
      {toolbar != null ? (
        <div className={slots.toolbar()} data-slot="app-layout-toolbar">
          {toolbar}
        </div>
      ) : null}
      <main className={slots.main()} data-slot="app-layout-main">
        {mainChildren}
      </main>
      {footer != null ? (
        <footer className={slots.footer()} data-slot="app-layout-footer">
          {footer}
        </footer>
      ) : null}
    </div>
  );

  const layoutContent = shouldUseResizable ? (
    <ResizableAppLayoutBody
      aside={aside}
      asideAriaLabel={asideAriaLabel}
      asideDefaultSize={asideDefaultSize}
      asideMaxSize={asideMaxSize}
      asideMinSize={asideMinSize}
      asideResizable={asideResizable}
      asideResizeBehavior={asideResizeBehavior}
      bodyElement={bodyElement}
      isAsideOpen={isAsideOpen}
      resizableAutoSaveId={resizableAutoSaveId}
      setAsideOpen={setAsideOpen}
      sidebar={sidebar}
      sidebarCollapsible={sidebarCollapsible}
      sidebarDefaultSize={sidebarDefaultSize}
      sidebarMaxSize={sidebarMaxSize}
      sidebarMinSize={sidebarMinSize}
      sidebarResizable={sidebarResizable}
      sidebarResizeBehavior={sidebarResizeBehavior}
      sidebarSide={sidebarSide}
      slots={slots}
    />
  ) : (
    <>
      {sidebar}
      {bodyElement}
      {aside != null ? (
        <aside
          aria-label={asideAriaLabel}
          className={slots.aside()}
          data-slot="app-layout-aside"
          data-state={isAsideOpen ? 'open' : 'closed'}
        >
          <div className={slots.asideInner()}>{aside}</div>
        </aside>
      ) : null}
    </>
  );

  const mobileAsideSheet =
    aside != null && asideMobile === 'sheet' && isAsideMobile ? (
      <Sheet isOpen={isAsideOpen} onOpenChange={setAsideOpen} placement="right">
        <Sheet.Backdrop variant={asideMobileBackdrop}>
          <Sheet.Content className={slots.asideMobileSheet()}>
            <Sheet.Dialog aria-label={asideAriaLabel} className={slots.asideMobileDialog()}>
              <div className={slots.asideInner()} data-slot="app-layout-aside-mobile">
                {mobileAsideNodes.length > 0 ? mobileAsideNodes : aside}
              </div>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    ) : null;

  return (
    <NavbarAppLayoutBridgeContext.Provider value={contextValue}>
      <AppLayoutContext.Provider value={contextValue}>
        <Sidebar.Provider
          className={composeSlotClassName(slots.base, className)}
          collapsible={sidebarCollapsible}
          data-app-layout=""
          data-aside-mobile={asideMobile}
          data-scroll-mode={scrollMode}
          defaultOpen={defaultSidebarOpen}
          hrefConfig={hrefConfig}
          navigate={navigate}
          onOpenChange={onSidebarOpenChange}
          open={sidebarOpen}
          reduceMotion={reduceMotion}
          side={sidebarSide}
          toggleShortcut={toggleShortcut}
          variant={sidebarVariant}
          {...(rest as ComponentProps<'div'>)}
        >
          {layoutContent}
          {mobileAsideSheet}
        </Sidebar.Provider>
      </AppLayoutContext.Provider>
    </NavbarAppLayoutBridgeContext.Provider>
  );
}

export interface AppLayoutMenuToggleProps extends ButtonProps {
  tooltip?: ReactNode | false;
  tooltipProps?: AppLayoutTooltipProps;
}

function AppLayoutMenuToggle({
  'aria-label': ariaLabel = 'Open navigation menu',
  children,
  className,
  isIconOnly = true,
  onPress,
  size = 'sm',
  tooltip,
  tooltipProps,
  variant = 'ghost',
  ...rest
}: AppLayoutMenuToggleProps) {
  const { setMobileOpen } = useSidebar();
  const appLayoutCtx = useAppLayout();

  const button = (
    <Button
      aria-label={ariaLabel}
      className={composeTwRenderProps(className, appLayoutCtx?.slots.menuToggle())}
      data-slot="app-layout-menu-toggle"
      isIconOnly={isIconOnly}
      onPress={(event) => {
        setMobileOpen(true);
        onPress?.(event);
      }}
      size={size}
      variant={variant}
      {...rest}
    >
      {children ?? <IconBars3 />}
    </Button>
  );

  if (!tooltip) return button;

  const {
    className: tooltipClassName,
    offset,
    placement = 'bottom',
    showArrow,
    ...restTooltip
  } = tooltipProps ?? {};

  return (
    <Tooltip delay={0} {...restTooltip}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content className={tooltipClassName} offset={offset} placement={placement}>
        {showArrow ? <Tooltip.Arrow /> : null}
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}

export interface AppLayoutAsideTriggerProps extends ToggleButtonProps {
  closedTooltip?: ReactNode;
  openTooltip?: ReactNode;
  tooltip?: ReactNode | false;
  tooltipProps?: AppLayoutTooltipProps;
}

function AppLayoutAsideTrigger({
  'aria-label': ariaLabel = 'Toggle details panel',
  children,
  className,
  closedTooltip,
  isIconOnly = true,
  isSelected,
  onChange,
  openTooltip,
  size = 'sm',
  tooltip,
  tooltipProps,
  variant = 'ghost',
  ...rest
}: AppLayoutAsideTriggerProps) {
  const appLayoutCtx = useAppLayout();
  const isAsideOpen = appLayoutCtx?.isAsideOpen ?? false;

  const button = (
    <ToggleButton
      aria-label={ariaLabel}
      className={composeTwRenderProps(className, appLayoutCtx?.slots.asideTrigger())}
      data-slot="app-layout-aside-trigger"
      isIconOnly={isIconOnly}
      isSelected={isSelected ?? isAsideOpen}
      onChange={(selected) => {
        appLayoutCtx?.setAsideOpen(selected);
        onChange?.(selected);
      }}
      size={size}
      variant={variant}
      {...rest}
    >
      {children ?? <IconLayoutSideContentRight />}
    </ToggleButton>
  );

  const resolvedTooltip =
    tooltip === false ? null : (tooltip ?? (isAsideOpen ? openTooltip : closedTooltip) ?? null);

  if (!resolvedTooltip) return button;

  const {
    className: tooltipClassName,
    offset,
    placement = 'bottom',
    showArrow,
    ...restTooltip
  } = tooltipProps ?? {};

  return (
    <Tooltip delay={0} {...restTooltip}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content className={tooltipClassName} offset={offset} placement={placement}>
        {showArrow ? <Tooltip.Arrow /> : null}
        {resolvedTooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}

export const AppLayout = Object.assign(AppLayoutRoot, {
  AsideTrigger: AppLayoutAsideTrigger,
  MenuToggle: AppLayoutMenuToggle,
  MobileAside: AppLayoutMobileAside,
  Root: AppLayoutRoot,
});
