/* biome-ignore-all lint: HeroUI Pro vendor implementation */
'use client';

import {
  Button,
  type ButtonProps,
  ScrollShadow,
  type ScrollShadowProps,
  Separator,
  type SeparatorProps,
  Sheet,
  SurfaceContext,
  Tooltip,
  type TooltipContentProps,
  type TooltipProps,
  tv,
  useMediaQuery,
} from '@heroui/react';
import { domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react';
import {
  Children,
  type ComponentProps,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type Key,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Collection,
  Button as RACButton,
  type ButtonProps as RACButtonProps,
  RouterProvider,
  Tree,
  TreeHeader,
  TreeItem,
  TreeItemContent,
  type TreeItemProps,
  type TreeProps,
  TreeSection,
} from 'react-aria-components';
import {
  composeSlotClassName,
  composeTwRenderProps,
  IconChevronRight,
  IconLayoutSideContentLeft,
  IconLayoutSideContentRight,
  isEditableTarget,
  matchesShortcut,
  parseShortcut,
  setCookie,
  TreeCollectionAnimation,
} from './shared';

const SUBMENU_SYMBOL = Symbol.for('heroui-pro.sidebar.submenu');
const MENU_ICON_SYMBOL = Symbol.for('heroui-pro.sidebar.menu-icon');
const MENU_ITEM_CONTENT_SYMBOL = Symbol.for('heroui-pro.sidebar.menu-item-content');
const MENU_TRIGGER_SYMBOL = Symbol.for('heroui-pro.sidebar.menu-trigger');

const HTTP_REGEX = /^https?:\/\//i;

export type SidebarCollapsible = 'icon' | 'offcanvas' | 'none';
export type SidebarSide = 'left' | 'right';
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';
export type SidebarGuideLines = boolean | 'hover';

export const sidebarVariants = tv({
  defaultVariants: {
    side: 'left',
    variant: 'sidebar',
  },
  slots: {
    base: 'sidebar',
    content: 'sidebar__content',
    footer: 'sidebar__footer',
    group: 'sidebar__group',
    groupLabel: 'sidebar__group-label',
    header: 'sidebar__header',
    main: 'sidebar__main',
    menu: 'sidebar__menu',
    menuAction: 'sidebar__menu-action',
    menuActions: 'sidebar__menu-actions',
    menuChip: 'sidebar__menu-chip',
    menuHeader: 'sidebar__menu-header',
    menuIcon: 'sidebar__menu-icon',
    menuIndicator: 'sidebar__menu-indicator',
    menuItem: 'sidebar__menu-item',
    menuItemContent: 'sidebar__menu-item-content',
    menuLabel: 'sidebar__menu-label',
    menuLabelText: 'sidebar__menu-label-text',
    menuSection: 'sidebar__menu-section',
    menuTrigger: 'sidebar__menu-trigger',
    mobile: 'sidebar__mobile',
    mobileDialog: 'sidebar__mobile-dialog',
    mobileSheet: 'sidebar__mobile-sheet',
    page: 'sidebar__page',
    pages: 'sidebar__pages',
    provider: 'sidebar__provider',
    rail: 'sidebar__rail',
    separator: 'sidebar__separator',
    tooltip: 'sidebar__tooltip',
    trigger: 'sidebar__trigger',
  },
  variants: {
    side: {
      left: {},
      right: {
        base: 'sidebar--right',
      },
    },
    variant: {
      floating: {
        base: 'sidebar--floating',
      },
      inset: {
        base: 'sidebar--inset',
      },
      sidebar: {},
    },
  },
});

export type SidebarSlots = ReturnType<typeof sidebarVariants>;

export interface SidebarContextValue {
  collapsible: SidebarCollapsible;
  isMobile: boolean;
  isMobileOpen: boolean;
  isOpen: boolean;
  reduceMotion?: boolean;
  setMobileOpen: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  side: SidebarSide;
  slots: SidebarSlots;
  toggleSidebar: () => void;
  variant: SidebarVariant;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarMobileContextValue {
  closeMobileOnAction: boolean;
}

const SidebarMobileContext = createContext<SidebarMobileContextValue | null>(null);

export interface SidebarPagesContextValue {
  activeValue: string | undefined;
  reduceMotion?: boolean;
  setActiveValue: (value: string) => void;
}

const SidebarPagesContext = createContext<SidebarPagesContextValue | null>(null);

interface SidebarPageItemContextValue {
  activeIndex: number;
  index: number;
}

const SidebarPageItemContext = createContext<SidebarPageItemContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('Sidebar components must be used within Sidebar.Provider.');
  }
  return ctx;
}

export function useSidebarPages(): SidebarPagesContextValue {
  const ctx = useContext(SidebarPagesContext);
  if (!ctx) {
    throw new Error('Sidebar.Page components must be used within Sidebar.Pages.');
  }
  return ctx;
}

export interface SidebarProviderProps extends ComponentProps<'div'> {
  collapsible?: SidebarCollapsible;
  defaultOpen?: boolean;
  hrefConfig?: (href: string) => string;
  navigate?: (path: string, routerOptions: undefined) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  reduceMotion?: boolean;
  side?: SidebarSide;
  toggleShortcut?: string | false;
  variant?: SidebarVariant;
}

function SidebarProvider({
  children,
  className,
  collapsible = 'icon',
  defaultOpen = true,
  hrefConfig,
  navigate,
  onOpenChange,
  open: controlledOpen,
  reduceMotion,
  side = 'left',
  toggleShortcut = 'mod+b',
  variant = 'sidebar',
  ...rest
}: SidebarProviderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(width < 48rem)');
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
        setCookie('sidebar_state', String(next));
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }
    if (collapsible !== 'none') {
      setOpen(!isOpenRef.current);
    }
  }, [collapsible, isMobile, setOpen]);

  const parsedShortcut = useMemo(
    () => (toggleShortcut === false ? null : parseShortcut(toggleShortcut)),
    [toggleShortcut],
  );

  useEffect(() => {
    if (!parsedShortcut) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        !isEditableTarget(event.target) &&
        matchesShortcut(event, parsedShortcut)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedShortcut, toggleSidebar]);

  const slots = useMemo(() => sidebarVariants({ side, variant }), [side, variant]);

  const contextValue = useMemo<SidebarContextValue>(
    () => ({
      collapsible,
      isMobile,
      isMobileOpen,
      isOpen,
      reduceMotion,
      setMobileOpen,
      setOpen,
      side,
      slots,
      toggleSidebar,
      variant,
    }),
    [
      collapsible,
      isMobile,
      isMobileOpen,
      isOpen,
      reduceMotion,
      setOpen,
      side,
      slots,
      toggleSidebar,
      variant,
    ],
  );

  const content = (
    <div
      className={composeSlotClassName(slots.provider, className)}
      data-slot="sidebar-provider"
      data-variant={variant}
      {...rest}
    >
      {children}
    </div>
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      {navigate ? (
        <RouterProvider navigate={navigate} useHref={hrefConfig}>
          {content}
        </RouterProvider>
      ) : (
        content
      )}
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends ComponentProps<'aside'> {
  collapsible?: SidebarCollapsible;
  side?: SidebarSide;
  variant?: SidebarVariant;
}

function SidebarRoot({
  children,
  className,
  collapsible: propCollapsible,
  side: propSide,
  variant: propVariant,
  ...rest
}: SidebarProps) {
  const ctx = useSidebar();
  const collapsible = propCollapsible ?? ctx.collapsible;
  const side = propSide ?? ctx.side;
  const variant = propVariant ?? ctx.variant;
  const state = collapsible === 'none' || ctx.isOpen ? 'expanded' : 'collapsed';

  const slots = useMemo(() => sidebarVariants({ side, variant }), [side, variant]);
  const surfaceVariant = variant === 'inset' ? 'default' : 'transparent';

  const aside = (
    <SurfaceContext.Provider value={{ variant: surfaceVariant }}>
      <aside
        className={composeSlotClassName(slots.base, className)}
        data-collapsible={collapsible}
        data-side={side}
        data-slot="sidebar"
        data-state={state}
        data-variant={variant}
        {...rest}
      >
        {children}
      </aside>
    </SurfaceContext.Provider>
  );

  if (collapsible === 'offcanvas') {
    return (
      <div className="sidebar__offcanvas-wrapper" data-side={side} data-state={state}>
        {aside}
      </div>
    );
  }

  return aside;
}

export type SidebarHeaderProps = ComponentProps<'div'>;

function SidebarHeader({ children, className, ...rest }: SidebarHeaderProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.header, className)}
      data-slot="sidebar-header"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface SidebarContentProps extends Omit<ScrollShadowProps, 'orientation'> {
  hideScrollBar?: boolean;
  showShadow?: boolean;
  size?: number;
}

function SidebarContent({
  children,
  className,
  hideScrollBar = false,
  showShadow = true,
  size = 12,
  ...rest
}: SidebarContentProps) {
  const { slots } = useSidebar();
  return (
    <ScrollShadow
      className={composeSlotClassName(slots.content, className)}
      data-slot="sidebar-content"
      hideScrollBar={hideScrollBar}
      isEnabled={showShadow}
      orientation="vertical"
      size={size}
      {...rest}
    >
      {children}
    </ScrollShadow>
  );
}

export type SidebarFooterProps = ComponentProps<'div'>;

function SidebarFooter({ children, className, ...rest }: SidebarFooterProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.footer, className)}
      data-slot="sidebar-footer"
      {...rest}
    >
      {children}
    </div>
  );
}

export type SidebarGroupProps = ComponentProps<'div'>;

function SidebarGroup({ children, className, ...rest }: SidebarGroupProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.group, className)}
      data-slot="sidebar-group"
      {...rest}
    >
      {children}
    </div>
  );
}

export type SidebarGroupLabelProps = ComponentProps<'div'>;

function SidebarGroupLabel({ children, className, ...rest }: SidebarGroupLabelProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.groupLabel, className)}
      data-slot="sidebar-group-label"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface SidebarMenuProps<T extends object = object> extends TreeProps<T> {
  reduceMotion?: boolean;
  showGuideLines?: SidebarGuideLines;
}

function SidebarMenu<T extends object = object>({
  children,
  className,
  reduceMotion: propReduceMotion,
  selectionMode = 'none',
  showGuideLines = true,
  ...rest
}: SidebarMenuProps<T>) {
  const { reduceMotion: ctxReduceMotion, slots } = useSidebar();
  const resolvedReduceMotion = propReduceMotion ?? ctxReduceMotion;
  const guideLinesAttr = showGuideLines === 'hover' ? 'hover' : showGuideLines ? 'true' : 'false';

  return (
    <TreeCollectionAnimation reduceMotion={resolvedReduceMotion}>
      <Tree
        className={composeTwRenderProps(className, slots.menu())}
        data-guide-lines={guideLinesAttr}
        data-sidebar="menu"
        data-slot="sidebar-menu"
        selectionMode={selectionMode}
        {...rest}
      >
        {children}
      </Tree>
    </TreeCollectionAnimation>
  );
}

export type SidebarMenuSectionProps<T extends object = object> = ComponentProps<
  typeof TreeSection<T>
>;

function SidebarMenuSection<T extends object = object>({
  children,
  className,
  ...rest
}: SidebarMenuSectionProps<T>) {
  const { slots } = useSidebar();
  return (
    <TreeSection
      className={composeSlotClassName(slots.menuSection, className)}
      data-slot="sidebar-menu-section"
      {...rest}
    >
      {children}
    </TreeSection>
  );
}

export type SidebarMenuHeaderProps = ComponentProps<typeof TreeHeader>;

function SidebarMenuHeader({ children, className, ...rest }: SidebarMenuHeaderProps) {
  const { slots } = useSidebar();
  return (
    <TreeHeader
      className={composeSlotClassName(slots.menuHeader, className)}
      data-slot="sidebar-menu-header"
      {...rest}
    >
      {children}
    </TreeHeader>
  );
}

export type SidebarMenuIconProps = ComponentProps<'span'>;

function SidebarMenuIcon({ children, className, ...rest }: SidebarMenuIconProps) {
  const { slots } = useSidebar();
  return (
    <span
      className={composeSlotClassName(slots.menuIcon, className)}
      data-slot="sidebar-menu-icon"
      {...rest}
    >
      {children}
    </span>
  );
}
(SidebarMenuIcon as unknown as Record<symbol, boolean>)[MENU_ICON_SYMBOL] = true;

export type SidebarMenuLabelProps = ComponentProps<'span'>;

function SidebarMenuLabel({ children, className, ...rest }: SidebarMenuLabelProps) {
  const { slots } = useSidebar();
  const labelNodes: ReactNode[] = [];
  const triggerNodes: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isMarkedElement<SidebarMenuTriggerProps>(child, MENU_TRIGGER_SYMBOL)) {
      triggerNodes.push(child);
    } else {
      labelNodes.push(child);
    }
  });

  return (
    <span
      className={composeSlotClassName(slots.menuLabel, className)}
      data-sidebar="label"
      data-slot="sidebar-menu-label"
      {...rest}
    >
      <span className={slots.menuLabelText()} data-slot="sidebar-menu-label-text">
        {labelNodes}
      </span>
      {triggerNodes}
    </span>
  );
}

export type SidebarMenuChipProps = ComponentProps<'span'>;

function SidebarMenuChip({ children, className, ...rest }: SidebarMenuChipProps) {
  const { slots } = useSidebar();
  return (
    <span
      className={composeSlotClassName(slots.menuChip, className)}
      data-slot="sidebar-menu-chip"
      {...rest}
    >
      {children}
    </span>
  );
}

export type SidebarMenuActionsProps = ComponentProps<'div'>;

function SidebarMenuActions({ children, className, ...rest }: SidebarMenuActionsProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.menuActions, className)}
      data-slot="sidebar-menu-actions"
      {...rest}
    >
      {children}
    </div>
  );
}

export type SidebarMenuActionProps = RACButtonProps;

function SidebarMenuAction({ children, className, ...rest }: SidebarMenuActionProps) {
  const { slots } = useSidebar();
  return (
    <RACButton
      className={composeTwRenderProps(className, slots.menuAction())}
      data-slot="sidebar-menu-action"
      {...rest}
    >
      {children}
    </RACButton>
  );
}

export type SidebarMenuTriggerProps = ComponentProps<'span'>;

function SidebarMenuTrigger({ children, className, ...rest }: SidebarMenuTriggerProps) {
  const { slots } = useSidebar();
  return (
    <span
      className={composeSlotClassName(slots.menuTrigger, className)}
      data-slot="sidebar-menu-trigger"
      {...rest}
    >
      {children}
    </span>
  );
}
(SidebarMenuTrigger as unknown as Record<symbol, boolean>)[MENU_TRIGGER_SYMBOL] = true;

export type SidebarMenuIndicatorProps = ComponentProps<'span'>;

function SidebarMenuIndicator({ children, className, ...rest }: SidebarMenuIndicatorProps) {
  const { slots } = useSidebar();
  return (
    <span
      aria-hidden="true"
      className={composeSlotClassName(slots.menuIndicator, className)}
      data-slot="sidebar-menu-indicator"
      {...rest}
    >
      {children ?? <IconChevronRight />}
    </span>
  );
}

export type SidebarMenuItemContentProps = ComponentProps<'div'>;

function SidebarMenuItemContent({ children, className, ...rest }: SidebarMenuItemContentProps) {
  const { slots } = useSidebar();
  return (
    <div
      className={composeSlotClassName(slots.menuItemContent, className)}
      data-slot="sidebar-menu-item-content"
      {...rest}
    >
      {children}
    </div>
  );
}
(SidebarMenuItemContent as unknown as Record<symbol, boolean>)[MENU_ITEM_CONTENT_SYMBOL] = true;

export interface SidebarSubmenuProps<T extends object = object> {
  children?: ReactNode | ((item: T) => ReactNode);
  items?: Iterable<T>;
}

function SidebarSubmenu<T extends object = object>(
  _props: SidebarSubmenuProps<T>,
): ReactElement | null {
  return null;
}
(SidebarSubmenu as unknown as Record<symbol, boolean>)[SUBMENU_SYMBOL] = true;

export interface SidebarTooltipProps extends Omit<TooltipProps, 'children'> {
  children: ReactNode;
  className?: string;
  content?: ReactNode;
  offset?: TooltipContentProps['offset'];
  placement?: TooltipContentProps['placement'];
  showArrow?: boolean;
}

function SidebarTooltip({
  children,
  className,
  content,
  delay = 0,
  isDisabled,
  offset,
  placement,
  showArrow,
  ...rest
}: SidebarTooltipProps) {
  const { collapsible, isMobile, isOpen, side, slots } = useSidebar();
  const shouldDisable = isDisabled ?? (collapsible !== 'icon' || isMobile || isOpen || !content);
  const resolvedPlacement = placement ?? (side === 'right' ? 'left' : 'right');

  return (
    <Tooltip delay={delay} isDisabled={shouldDisable} {...rest}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content
        className={composeSlotClassName(slots.tooltip, className)}
        offset={offset}
        placement={resolvedPlacement}
      >
        {showArrow ? <Tooltip.Arrow /> : null}
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}

function isMarkedElement<P>(node: ReactNode, marker: symbol): node is ReactElement<P> {
  if (!isValidElement(node)) return false;
  const typeObj = node.type as unknown as Record<symbol, boolean> | null;
  return Boolean(typeObj && typeof typeObj === 'function' && typeObj[marker]);
}

function replaceMenuTriggers(children: ReactNode, triggerSlotClass?: string): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; className?: string }>(child)) {
      return child;
    }
    if (isMarkedElement<SidebarMenuTriggerProps>(child, MENU_TRIGGER_SYMBOL)) {
      const {
        children: triggerChildren,
        className: triggerClassName,
        ...triggerRest
      } = child.props;
      return (
        <RACButton
          key={child.key}
          className={composeTwRenderProps(triggerClassName, triggerSlotClass)}
          data-slot="sidebar-menu-trigger"
          slot="chevron"
          {...(triggerRest as unknown as RACButtonProps)}
        >
          {triggerChildren}
        </RACButton>
      );
    }
    if (child.props.children) {
      return cloneElement(child, {
        children: replaceMenuTriggers(child.props.children, triggerSlotClass),
      });
    }
    return child;
  });
}

function wrapMenuIconsWithTooltip(
  children: ReactNode,
  tooltipContent: ReactNode,
  tooltipProps?: Partial<SidebarTooltipProps>,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return child;
    }
    if (isMarkedElement<SidebarMenuIconProps>(child, MENU_ICON_SYMBOL)) {
      return (
        <SidebarTooltip key={child.key} content={tooltipContent} {...tooltipProps}>
          {child}
        </SidebarTooltip>
      );
    }
    if (child.props.children) {
      return cloneElement(child, {
        children: wrapMenuIconsWithTooltip(child.props.children, tooltipContent, tooltipProps),
      });
    }
    return child;
  });
}

export interface SidebarMenuItemProps<T extends object = object>
  extends Omit<TreeItemProps<T>, 'children'> {
  children?: ReactNode;
  closeMobileOnAction?: boolean;
  forceReload?: boolean;
  isCurrent?: boolean;
  tooltip?: ReactNode | false;
  tooltipProps?: Partial<SidebarTooltipProps>;
}

function SidebarMenuItem<T extends object = object>({
  children,
  className,
  closeMobileOnAction: propCloseMobileOnAction,
  forceReload,
  href,
  isCurrent,
  onAction,
  rel,
  target,
  textValue,
  tooltip,
  tooltipProps,
  ...rest
}: SidebarMenuItemProps<T>) {
  const { collapsible, isMobile, isOpen, setMobileOpen, slots } = useSidebar();
  const mobileCtx = useContext(SidebarMobileContext);
  const shouldCloseMobile = propCloseMobileOnAction ?? mobileCtx?.closeMobileOnAction ?? true;

  const isExternal = typeof href === 'string' && HTTP_REGEX.test(href);
  const resolvedTarget = target ?? (isExternal ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);
  const passHrefToTreeItem = !isExternal && !forceReload ? href : undefined;

  const contentChildren: ReactNode[] = [];
  const submenuElements: ReactElement<SidebarSubmenuProps<T>>[] = [];

  Children.forEach(children, (child) => {
    if (isMarkedElement<SidebarSubmenuProps<T>>(child, SUBMENU_SYMBOL)) {
      submenuElements.push(child);
    } else {
      contentChildren.push(child);
    }
  });

  const hasSubmenu = submenuElements.length > 0;
  let itemContentProps: SidebarMenuItemContentProps | undefined;
  let resolvedContentNodes: ReactNode = contentChildren;

  if (
    contentChildren.length === 1 &&
    isMarkedElement<SidebarMenuItemContentProps>(contentChildren[0], MENU_ITEM_CONTENT_SYMBOL)
  ) {
    const { children: innerChildren, ...restContentProps } = contentChildren[0].props;
    itemContentProps = restContentProps;
    resolvedContentNodes = innerChildren;
  }

  const { className: contentClassName, ...restItemContentProps } = itemContentProps ?? {};
  const processedContent = replaceMenuTriggers(resolvedContentNodes, slots.menuTrigger());
  const resolvedTooltip = tooltip === false ? null : (tooltip ?? textValue);
  const isIconCollapsed = collapsible === 'icon' && !isMobile && !isOpen;
  const finalContent =
    isIconCollapsed && resolvedTooltip
      ? wrapMenuIconsWithTooltip(processedContent, resolvedTooltip, tooltipProps)
      : processedContent;

  const handleAction = useCallback(() => {
    onAction?.();
    if (!hasSubmenu && href && (isExternal || forceReload)) {
      if (resolvedTarget === '_blank') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(href);
      }
    }
    if (isMobile && shouldCloseMobile && !hasSubmenu) {
      setMobileOpen(false);
    }
  }, [
    forceReload,
    hasSubmenu,
    href,
    isExternal,
    isMobile,
    onAction,
    resolvedTarget,
    setMobileOpen,
    shouldCloseMobile,
  ]);

  const hasAction = Boolean(
    onAction ||
      (!hasSubmenu && href && (isExternal || forceReload)) ||
      (isMobile && shouldCloseMobile && !hasSubmenu),
  );

  return (
    <TreeItem
      aria-current={isCurrent ? 'page' : undefined}
      className={composeTwRenderProps(className, slots.menuItem())}
      data-current={isCurrent || undefined}
      data-slot="sidebar-menu-item"
      href={passHrefToTreeItem}
      onAction={hasAction ? handleAction : undefined}
      rel={passHrefToTreeItem ? resolvedRel : undefined}
      target={passHrefToTreeItem ? resolvedTarget : undefined}
      textValue={textValue}
      {...rest}
    >
      <TreeItemContent>
        {(renderProps) => (
          <div
            className={composeSlotClassName(slots.menuItemContent, contentClassName)}
            data-current={isCurrent || undefined}
            data-expanded={renderProps.isExpanded || undefined}
            data-has-child-items={renderProps.hasChildItems || undefined}
            data-slot="sidebar-menu-item-content"
            {...restItemContentProps}
          >
            {finalContent}
          </div>
        )}
      </TreeItemContent>
      {submenuElements.map((submenu, index) => {
        const key = submenu.key ?? index;
        const { children: submenuChildren, items: submenuItems } = submenu.props;
        if (typeof submenuChildren === 'function') {
          return (
            <Collection key={key} items={submenuItems}>
              {submenuChildren}
            </Collection>
          );
        }
        return <Fragment key={key}>{submenuChildren}</Fragment>;
      })}
    </TreeItem>
  );
}

export type SidebarSeparatorProps = SeparatorProps;

function SidebarSeparator({ className, ...rest }: SidebarSeparatorProps) {
  const { slots } = useSidebar();
  return (
    <Separator
      className={composeSlotClassName(slots.separator, className)}
      data-slot="sidebar-separator"
      {...rest}
    />
  );
}

export type SidebarRailProps = ComponentProps<'button'>;

function SidebarRail({
  'aria-label': ariaLabel = 'Toggle Sidebar',
  className,
  onClick,
  tabIndex = -1,
  title = 'Toggle Sidebar',
  ...rest
}: SidebarRailProps) {
  const { collapsible, isOpen, side, slots, toggleSidebar } = useSidebar();
  if (collapsible === 'none') return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    toggleSidebar();
    onClick?.(event);
  };

  return (
    <button
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      className={composeSlotClassName(slots.rail, className)}
      data-side={side}
      data-slot="sidebar-rail"
      onClick={handleClick}
      tabIndex={tabIndex}
      title={title}
      type="button"
      {...rest}
    />
  );
}

export type SidebarTriggerProps = ButtonProps;

function SidebarTrigger({
  'aria-label': ariaLabel = 'Toggle Sidebar',
  children,
  className,
  isIconOnly = true,
  onPress,
  size = 'sm',
  variant = 'ghost',
  ...rest
}: SidebarTriggerProps) {
  const { side, slots, toggleSidebar } = useSidebar();
  const Icon = side === 'right' ? IconLayoutSideContentRight : IconLayoutSideContentLeft;

  return (
    <Button
      aria-label={ariaLabel}
      className={composeTwRenderProps(className, slots.trigger())}
      data-slot="sidebar-trigger"
      isIconOnly={isIconOnly}
      onPress={(event) => {
        toggleSidebar();
        onPress?.(event);
      }}
      size={size}
      variant={variant}
      {...rest}
    >
      {children ?? <Icon />}
    </Button>
  );
}

export type SidebarMainProps = ComponentProps<'main'>;

function SidebarMain({ children, className, ...rest }: SidebarMainProps) {
  const { slots } = useSidebar();
  return (
    <main
      className={composeSlotClassName(slots.main, className)}
      data-slot="sidebar-main"
      {...rest}
    >
      {children}
    </main>
  );
}

export interface SidebarPagesProps extends ComponentProps<'div'> {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  reduceMotion?: boolean;
  value?: string;
}

function SidebarPages({
  children,
  className,
  defaultValue,
  onValueChange,
  reduceMotion: propReduceMotion,
  value: controlledValue,
  ...rest
}: SidebarPagesProps) {
  const { reduceMotion: ctxReduceMotion, slots } = useSidebar();
  const prefersReducedMotion = useReducedMotion();

  const pageValues = useMemo(() => {
    const values: string[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement<{ value?: string }>(child) && typeof child.props.value === 'string') {
        values.push(child.props.value);
      }
    });
    return values;
  }, [children]);

  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(
    () => defaultValue ?? pageValues[0],
  );
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const setActiveValue = useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const activeIndex = useMemo(() => {
    if (!activeValue) return 0;
    const idx = pageValues.indexOf(activeValue);
    return idx === -1 ? 0 : idx;
  }, [activeValue, pageValues]);

  const resolvedReduceMotion = propReduceMotion ?? ctxReduceMotion ?? Boolean(prefersReducedMotion);

  const pagesContextValue = useMemo<SidebarPagesContextValue>(
    () => ({
      activeValue,
      reduceMotion: resolvedReduceMotion,
      setActiveValue,
    }),
    [activeValue, resolvedReduceMotion, setActiveValue],
  );

  let pageCursor = 0;

  return (
    <SidebarPagesContext.Provider value={pagesContextValue}>
      <LazyMotion features={domAnimation}>
        <div
          className={composeSlotClassName(slots.pages, className)}
          data-slot="sidebar-pages"
          {...rest}
        >
          {Children.map(children, (child) => {
            if (
              !isValidElement<{ value?: string }>(child) ||
              typeof child.props.value !== 'string'
            ) {
              return child;
            }
            const index = pageCursor++;
            return (
              <SidebarPageItemContext.Provider
                key={child.key ?? child.props.value}
                value={{ activeIndex, index }}
              >
                {child}
              </SidebarPageItemContext.Provider>
            );
          })}
        </div>
      </LazyMotion>
    </SidebarPagesContext.Provider>
  );
}

export interface SidebarPageProps {
  children?: ReactNode;
  className?: string;
  value: string;
}

function SidebarPage({ children, className, value }: SidebarPageProps) {
  const { slots } = useSidebar();
  const { activeValue, reduceMotion } = useSidebarPages();
  const itemCtx = useContext(SidebarPageItemContext);
  const index = itemCtx?.index ?? 0;
  const activeIndex = itemCtx?.activeIndex ?? 0;
  const isActive = activeValue === value;
  const offsetPercent = `${(index - activeIndex) * 100}%`;

  return (
    <m.div
      animate={{ opacity: isActive ? 1 : 0, x: offsetPercent }}
      aria-hidden={!isActive || undefined}
      className={composeSlotClassName(slots.page, className)}
      data-active={isActive || undefined}
      data-slot="sidebar-page"
      data-value={value}
      inert={!isActive}
      initial={false}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </m.div>
  );
}

export interface SidebarMobileProps extends ComponentProps<'div'> {
  backdrop?: 'opaque' | 'blur' | 'transparent';
  closeMobileOnAction?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

function SidebarMobile({
  backdrop = 'opaque',
  children,
  className,
  closeMobileOnAction = true,
  isOpen: propIsOpen,
  onOpenChange: propOnOpenChange,
  ...rest
}: SidebarMobileProps) {
  const { isMobile, isMobileOpen, setMobileOpen, side, slots } = useSidebar();
  const isOpen = propIsOpen ?? isMobileOpen;
  const onOpenChange = propOnOpenChange ?? setMobileOpen;

  const mobileCtx = useMemo<SidebarMobileContextValue>(
    () => ({ closeMobileOnAction }),
    [closeMobileOnAction],
  );

  if (!isMobile) return null;

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} placement={side}>
      <Sheet.Backdrop variant={backdrop}>
        <Sheet.Content className={slots.mobileSheet()}>
          <Sheet.Dialog aria-label="Navigation" className={slots.mobileDialog()}>
            <SidebarMobileContext.Provider value={mobileCtx}>
              <SurfaceContext.Provider value={{ variant: 'default' }}>
                <div
                  className={composeSlotClassName(slots.mobile, className)}
                  data-slot="sidebar-mobile"
                  {...rest}
                >
                  {children}
                </div>
              </SurfaceContext.Provider>
            </SidebarMobileContext.Provider>
          </Sheet.Dialog>
          <div
            className="sidebar__mobile-overlay-container"
            data-slot="sidebar-mobile-overlay-container"
          />
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export type SidebarKey = Key;

export const Sidebar = Object.assign(SidebarRoot, {
  Content: SidebarContent,
  Footer: SidebarFooter,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  Header: SidebarHeader,
  Main: SidebarMain,
  Menu: SidebarMenu,
  MenuAction: SidebarMenuAction,
  MenuActions: SidebarMenuActions,
  MenuChip: SidebarMenuChip,
  MenuHeader: SidebarMenuHeader,
  MenuIcon: SidebarMenuIcon,
  MenuIndicator: SidebarMenuIndicator,
  MenuItem: SidebarMenuItem,
  MenuItemContent: SidebarMenuItemContent,
  MenuLabel: SidebarMenuLabel,
  MenuSection: SidebarMenuSection,
  MenuTrigger: SidebarMenuTrigger,
  Mobile: SidebarMobile,
  Page: SidebarPage,
  Pages: SidebarPages,
  Provider: SidebarProvider,
  Rail: SidebarRail,
  Root: SidebarRoot,
  Separator: SidebarSeparator,
  Submenu: SidebarSubmenu,
  Tooltip: SidebarTooltip,
  Trigger: SidebarTrigger,
});
