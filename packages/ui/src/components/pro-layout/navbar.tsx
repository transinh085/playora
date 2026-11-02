/* biome-ignore-all lint: HeroUI Pro vendor implementation */
'use client';

import { Separator, type SeparatorProps, tv, useMediaQuery } from '@heroui/react';
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react';
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button as RACButton, type ButtonProps as RACButtonProps } from 'react-aria-components';
import { composeSlotClassName, composeTwRenderProps } from './shared';

const HTTP_REGEX = /^https?:\/\//i;

export type NavbarMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type NavbarPosition = 'static' | 'sticky' | 'floating';

export const navbarVariants = tv({
  defaultVariants: {
    isBlurred: true,
    isBordered: false,
    maxWidth: 'xl',
    position: 'sticky',
  },
  slots: {
    base: 'navbar',
    brand: 'navbar__brand',
    content: 'navbar__content',
    header: 'navbar__header',
    item: 'navbar__item',
    label: 'navbar__label',
    menu: 'navbar__menu',
    menuItem: 'navbar__menu-item',
    menuToggle: 'navbar__menu-toggle',
    menuToggleIcon: 'navbar__menu-toggle-icon',
    separator: 'navbar__separator',
    spacer: 'navbar__spacer',
  },
  variants: {
    isBlurred: {
      false: {
        base: 'navbar--unblurred',
      },
      true: {},
    },
    isBordered: {
      false: {},
      true: {
        base: 'navbar--bordered',
      },
    },
    maxWidth: {
      '2xl': {
        base: 'navbar--max-w-2xl',
      },
      full: {
        base: 'navbar--max-w-full',
      },
      lg: {
        base: 'navbar--max-w-lg',
      },
      md: {
        base: 'navbar--max-w-md',
      },
      sm: {
        base: 'navbar--max-w-sm',
      },
      xl: {
        base: 'navbar--max-w-xl',
      },
    },
    position: {
      floating: {
        base: 'navbar--floating',
      },
      static: {
        base: 'navbar--static',
      },
      sticky: {
        base: 'navbar--sticky',
      },
    },
  },
});

export type NavbarSlots = ReturnType<typeof navbarVariants>;

export interface NavbarContextValue {
  hrefConfig?: (href: string) => string;
  isHidden: boolean;
  isMenuOpen: boolean;
  isMobile: boolean;
  isScrolled: boolean;
  menuId: string;
  navHeight: number;
  navigate?: (path: string, routerOptions: undefined) => void;
  reduceMotion: boolean;
  setMenuOpen: (open: boolean) => void;
  slots: NavbarSlots;
  toggleMenu: () => void;
}

const NavbarContext = createContext<NavbarContextValue | null>(null);

/**
 * Shared context set by AppLayout so Navbar automatically adapts when placed inside AppLayout.
 */
export const NavbarAppLayoutBridgeContext = createContext<unknown>(null);

export function useNavbar(): NavbarContextValue {
  const ctx = useContext(NavbarContext);
  if (!ctx) {
    throw new Error('Navbar components must be used within Navbar.');
  }
  return ctx;
}

function shouldClientNavigate(
  event: ReactMouseEvent<HTMLElement>,
  href: string | undefined,
  target: string | undefined,
): boolean {
  return Boolean(
    href &&
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      (!target || target === '_self') &&
      !HTTP_REGEX.test(href),
  );
}

const HIDE_ON_SCROLL_VARIANTS = {
  hidden: { y: '-100%' },
  visible: { y: '0%' },
};

const HIDE_ON_SCROLL_TRANSITION = {
  duration: 0.3,
  ease: [0.23, 1, 0.32, 1] as const,
};

const MENU_MOTION_VARIANTS = {
  closed: {
    opacity: 0,
    transition: {
      opacity: { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
      y: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
    },
    y: -8,
  },
  open: {
    opacity: 1,
    transition: {
      opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
      y: { bounce: 0, duration: 0.26, type: 'spring' as const },
    },
    y: 0,
  },
};

export interface NavbarProps extends ComponentProps<'nav'> {
  defaultMenuOpen?: boolean;
  height?: number | string;
  hrefConfig?: (href: string) => string;
  isBlurred?: boolean;
  isBordered?: boolean;
  isMenuOpen?: boolean;
  maxWidth?: NavbarMaxWidth;
  navigate?: (path: string, routerOptions: undefined) => void;
  onMenuOpenChange?: (isOpen: boolean) => void;
  onScrollPositionChange?: (scrollPosition: number) => void;
  parentRef?: RefObject<HTMLElement | null>;
  position?: NavbarPosition;
  reduceMotion?: boolean;
  shouldBlockScroll?: boolean;
  shouldHideOnScroll?: boolean;
}

function NavbarRoot({
  children,
  className,
  defaultMenuOpen = false,
  height,
  hrefConfig,
  isBlurred = true,
  isBordered = false,
  isMenuOpen: controlledMenuOpen,
  maxWidth: propMaxWidth,
  navigate,
  onMenuOpenChange,
  onScrollPositionChange,
  parentRef,
  position: propPosition,
  reduceMotion: propReduceMotion,
  shouldBlockScroll = true,
  shouldHideOnScroll: propShouldHideOnScroll,
  style,
  ...rest
}: NavbarProps) {
  const isInAppLayout = useContext(NavbarAppLayoutBridgeContext) !== null;
  const maxWidth = propMaxWidth ?? (isInAppLayout ? 'full' : 'xl');
  const position = propPosition ?? 'sticky';
  const shouldHideOnScroll = propShouldHideOnScroll ?? false;

  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = useState(defaultMenuOpen);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  const navRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const isMobile = useMediaQuery('(width < 48rem)');
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = propReduceMotion ?? Boolean(prefersReducedMotion);
  const menuId = useId();

  const isControlled = controlledMenuOpen !== undefined;
  const isMenuOpen = isControlled ? controlledMenuOpen : uncontrolledMenuOpen;
  const isMenuOpenRef = useRef(isMenuOpen);
  isMenuOpenRef.current = isMenuOpen;

  const setMenuOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledMenuOpen(next);
      }
      onMenuOpenChange?.(next);
    },
    [isControlled, onMenuOpenChange],
  );

  const toggleMenu = useCallback(() => {
    setMenuOpen(!isMenuOpenRef.current);
  }, [setMenuOpen]);

  useEffect(() => {
    if (!isMobile && isMenuOpenRef.current) {
      setMenuOpen(false);
    }
  }, [isMobile, setMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, setMenuOpen]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const updateHeight = () => {
      setNavHeight(el.offsetHeight);
    };
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScrollPositionChangeRef = useRef(onScrollPositionChange);
  onScrollPositionChangeRef.current = onScrollPositionChange;

  useEffect(() => {
    const target = parentRef?.current ?? (typeof window !== 'undefined' ? window : null);
    if (!target) return;

    const getScrollY = () =>
      target === window ? window.scrollY : (target as HTMLElement).scrollTop;

    lastScrollYRef.current = getScrollY();
    setIsScrolled(lastScrollYRef.current > 0);

    const handleScroll = () => {
      const currentY = Math.max(0, getScrollY());
      const prevY = lastScrollYRef.current;
      const delta = currentY - prevY;
      lastScrollYRef.current = currentY;

      setIsScrolled((prev) => {
        const next = currentY > 0;
        return prev === next ? prev : next;
      });
      onScrollPositionChangeRef.current?.(currentY);

      if (!shouldHideOnScroll) return;
      if (isMenuOpenRef.current) {
        setIsHidden(false);
        return;
      }
      const threshold = navRef.current?.offsetHeight || 64;
      if (currentY <= threshold) {
        setIsHidden(false);
      } else if (delta > 4) {
        setIsHidden(true);
      } else if (delta < -4) {
        setIsHidden(false);
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [parentRef, shouldHideOnScroll]);

  useEffect(() => {
    if (!shouldHideOnScroll) {
      setIsHidden(false);
    }
  }, [shouldHideOnScroll]);

  useEffect(() => {
    if (!isMenuOpen || !shouldBlockScroll || typeof document === 'undefined') return;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [isMenuOpen, shouldBlockScroll]);

  const slots = useMemo(
    () => navbarVariants({ isBlurred, isBordered, maxWidth, position }),
    [isBlurred, isBordered, maxWidth, position],
  );

  const contextValue = useMemo<NavbarContextValue>(
    () => ({
      hrefConfig,
      isHidden,
      isMenuOpen,
      isMobile,
      isScrolled,
      menuId,
      navHeight,
      navigate,
      reduceMotion,
      setMenuOpen,
      slots,
      toggleMenu,
    }),
    [
      hrefConfig,
      isHidden,
      isMenuOpen,
      isMobile,
      isScrolled,
      menuId,
      navHeight,
      navigate,
      reduceMotion,
      setMenuOpen,
      slots,
      toggleMenu,
    ],
  );

  const resolvedStyle = useMemo<CSSProperties | undefined>(() => {
    if (height == null) return style;
    return {
      ...style,
      '--navbar-height': typeof height === 'number' ? `${height}px` : height,
    } as CSSProperties;
  }, [height, style]);

  const baseClassName = composeSlotClassName(slots.base, className);
  const animateHide = shouldHideOnScroll && !reduceMotion;

  return (
    <NavbarContext.Provider value={contextValue}>
      {animateHide ? (
        <LazyMotion features={domAnimation}>
          <m.nav
            ref={navRef}
            animate={isHidden ? 'hidden' : 'visible'}
            className={baseClassName}
            data-hidden={isHidden || undefined}
            data-in-app-layout={isInAppLayout || undefined}
            data-menu-open={isMenuOpen || undefined}
            data-scrolled={isScrolled || undefined}
            data-slot="navbar"
            initial={false}
            style={resolvedStyle}
            transition={HIDE_ON_SCROLL_TRANSITION}
            variants={HIDE_ON_SCROLL_VARIANTS}
            {...(rest as ComponentProps<typeof m.nav>)}
          >
            {children}
          </m.nav>
        </LazyMotion>
      ) : (
        <nav
          ref={navRef}
          className={baseClassName}
          data-hidden={isHidden || undefined}
          data-in-app-layout={isInAppLayout || undefined}
          data-menu-open={isMenuOpen || undefined}
          data-scrolled={isScrolled || undefined}
          data-slot="navbar"
          style={resolvedStyle}
          {...rest}
        >
          {children}
        </nav>
      )}
    </NavbarContext.Provider>
  );
}

export type NavbarHeaderProps = ComponentProps<'header'>;

function NavbarHeader({ children, className, ...rest }: NavbarHeaderProps) {
  const { slots } = useNavbar();
  return (
    <header
      className={composeSlotClassName(slots.header, className)}
      data-slot="navbar-header"
      {...rest}
    >
      {children}
    </header>
  );
}

export interface NavbarBrandProps extends Omit<ComponentProps<'a'>, 'children'> {
  children?: ReactNode;
  render?: (props: Record<string, unknown>) => ReactElement;
}

function NavbarBrand({
  children,
  className,
  href,
  onClick,
  rel,
  render,
  target,
  ...rest
}: NavbarBrandProps) {
  const { hrefConfig, navigate, slots } = useNavbar();
  const isExternal = typeof href === 'string' && HTTP_REGEX.test(href);
  const resolvedTarget = target ?? (isExternal ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);
  const resolvedHref = href && !isExternal && hrefConfig ? hrefConfig(href) : href;
  const resolvedClassName = composeSlotClassName(slots.brand, className);

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    onClick?.(event as ReactMouseEvent<HTMLAnchorElement>);
    if (navigate && href && shouldClientNavigate(event, href, resolvedTarget)) {
      event.preventDefault();
      navigate(href, undefined);
    }
  };

  if (render) {
    return render({
      children,
      className: resolvedClassName,
      'data-slot': 'navbar-brand',
      href: resolvedHref,
      onClick: handleClick,
      rel: resolvedRel,
      target: resolvedTarget,
      ...rest,
    });
  }

  if (href) {
    return (
      <a
        className={resolvedClassName}
        data-slot="navbar-brand"
        href={resolvedHref}
        onClick={handleClick}
        rel={resolvedRel}
        target={resolvedTarget}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <div
      className={resolvedClassName}
      data-slot="navbar-brand"
      onClick={onClick as unknown as ComponentProps<'div'>['onClick']}
      {...(rest as ComponentProps<'div'>)}
    >
      {children}
    </div>
  );
}

export type NavbarContentProps = ComponentProps<'div'>;

function NavbarContent({ children, className, ...rest }: NavbarContentProps) {
  const { slots } = useNavbar();
  return (
    <div
      className={composeSlotClassName(slots.content, className)}
      data-slot="navbar-content"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface NavbarItemProps extends Omit<ComponentProps<'a'>, 'children'> {
  children?: ReactNode;
  closeMenuOnPress?: boolean;
  isCurrent?: boolean;
  isDisabled?: boolean;
  onPress?: (event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => void;
  render?: (props: Record<string, unknown>) => ReactElement;
}

function NavbarItem({
  children,
  className,
  closeMenuOnPress = true,
  href,
  isCurrent,
  isDisabled,
  onClick,
  onKeyDown,
  onPress,
  rel,
  render,
  target,
  ...rest
}: NavbarItemProps) {
  const { hrefConfig, isMenuOpen, navigate, setMenuOpen, slots } = useNavbar();
  const isExternal = typeof href === 'string' && HTTP_REGEX.test(href);
  const resolvedTarget = target ?? (isExternal ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);
  const resolvedHref = href && !isExternal && hrefConfig ? hrefConfig(href) : href;
  const resolvedClassName = composeSlotClassName(slots.item, className);

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event as ReactMouseEvent<HTMLAnchorElement>);
    onPress?.(event);
    if (navigate && href && shouldClientNavigate(event, href, resolvedTarget)) {
      event.preventDefault();
      navigate(href, undefined);
    }
    if (isMenuOpen && closeMenuOnPress) {
      setMenuOpen(false);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event as ReactKeyboardEvent<HTMLAnchorElement>);
    if (isDisabled) return;
    if (!href && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onPress?.(event);
      if (isMenuOpen && closeMenuOnPress) {
        setMenuOpen(false);
      }
    }
  };

  const sharedProps = {
    'aria-current': isCurrent ? ('page' as const) : undefined,
    'aria-disabled': isDisabled || undefined,
    className: resolvedClassName,
    'data-current': isCurrent || undefined,
    'data-disabled': isDisabled || undefined,
    'data-slot': 'navbar-item',
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    ...rest,
  };

  if (render) {
    return render({
      ...sharedProps,
      children,
      href: isDisabled ? undefined : resolvedHref,
      rel: resolvedRel,
      target: resolvedTarget,
    });
  }

  if (href) {
    return (
      <a
        {...sharedProps}
        href={isDisabled ? undefined : resolvedHref}
        rel={resolvedRel}
        tabIndex={isDisabled ? -1 : rest.tabIndex}
        target={resolvedTarget}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      {...(sharedProps as unknown as ComponentProps<'button'>)}
      disabled={isDisabled}
      type="button"
    >
      {children}
    </button>
  );
}

export type NavbarLabelProps = ComponentProps<'span'>;

function NavbarLabel({ children, className, ...rest }: NavbarLabelProps) {
  const { slots } = useNavbar();
  return (
    <span
      className={composeSlotClassName(slots.label, className)}
      data-slot="navbar-label"
      {...rest}
    >
      {children}
    </span>
  );
}

export type NavbarSeparatorProps = SeparatorProps;

function NavbarSeparator({ className, orientation = 'vertical', ...rest }: NavbarSeparatorProps) {
  const { slots } = useNavbar();
  return (
    <Separator
      className={composeSlotClassName(slots.separator, className)}
      data-slot="navbar-separator"
      orientation={orientation}
      {...rest}
    />
  );
}

export type NavbarSpacerProps = ComponentProps<'div'>;

function NavbarSpacer({ className, ...rest }: NavbarSpacerProps) {
  const { slots } = useNavbar();
  return (
    <div
      aria-hidden="true"
      className={composeSlotClassName(slots.spacer, className)}
      data-slot="navbar-spacer"
      {...rest}
    />
  );
}

export interface NavbarMenuToggleProps extends Omit<RACButtonProps, 'children'> {
  children?: ReactNode | ((isOpen: boolean) => ReactNode);
  srOnlyText?: string;
}

function NavbarMenuToggle({
  'aria-label': ariaLabel,
  children,
  className,
  onPress,
  srOnlyText,
  ...rest
}: NavbarMenuToggleProps) {
  const { isMenuOpen, menuId, slots, toggleMenu } = useNavbar();
  const resolvedAriaLabel =
    ariaLabel ?? srOnlyText ?? (isMenuOpen ? 'Close navigation menu' : 'Open navigation menu');

  const content =
    typeof children === 'function'
      ? children(isMenuOpen)
      : (children ?? (
          <span
            aria-hidden="true"
            className={slots.menuToggleIcon()}
            data-open={isMenuOpen || undefined}
            data-slot="navbar-menu-toggle-icon"
          >
            <span className="navbar__menu-toggle-bar" />
            <span className="navbar__menu-toggle-bar" />
          </span>
        ));

  return (
    <RACButton
      aria-controls={menuId}
      aria-expanded={isMenuOpen}
      aria-label={resolvedAriaLabel}
      className={composeTwRenderProps(className, slots.menuToggle())}
      data-open={isMenuOpen || undefined}
      data-slot="navbar-menu-toggle"
      onPress={(event) => {
        toggleMenu();
        onPress?.(event);
      }}
      {...rest}
    >
      {content}
    </RACButton>
  );
}

export interface NavbarMenuProps extends ComponentProps<'div'> {
  reduceMotion?: boolean;
}

function NavbarMenu({
  children,
  className,
  reduceMotion: propReduceMotion,
  style,
  ...rest
}: NavbarMenuProps) {
  const { isMenuOpen, menuId, navHeight, reduceMotion: ctxReduceMotion, slots } = useNavbar();
  const shouldReduceMotion = propReduceMotion ?? ctxReduceMotion;
  const resolvedClassName = composeSlotClassName(slots.menu, className);

  const resolvedStyle = useMemo<CSSProperties | undefined>(() => {
    if (!navHeight) return style;
    return {
      '--navbar-menu-top': `${navHeight}px`,
      ...style,
    } as CSSProperties;
  }, [navHeight, style]);

  if (shouldReduceMotion) {
    if (!isMenuOpen) return null;
    return (
      <div
        aria-label={rest['aria-label'] ?? 'Mobile navigation'}
        className={resolvedClassName}
        data-open="true"
        data-slot="navbar-menu"
        id={menuId}
        role="region"
        style={resolvedStyle}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {isMenuOpen ? (
          <m.div
            key="navbar-menu"
            animate="open"
            aria-label={rest['aria-label'] ?? 'Mobile navigation'}
            className={resolvedClassName}
            data-open="true"
            data-slot="navbar-menu"
            exit="closed"
            id={menuId}
            initial="closed"
            role="region"
            style={resolvedStyle}
            variants={MENU_MOTION_VARIANTS}
            {...(rest as ComponentProps<typeof m.div>)}
          >
            {children}
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}

export type NavbarMenuItemProps = NavbarItemProps;

function NavbarMenuItem({ className, ...rest }: NavbarMenuItemProps) {
  const { slots } = useNavbar();
  return (
    <NavbarItem
      className={composeSlotClassName(slots.menuItem, className)}
      data-slot="navbar-menu-item"
      {...rest}
    />
  );
}

export const Navbar = Object.assign(NavbarRoot, {
  Brand: NavbarBrand,
  Content: NavbarContent,
  Header: NavbarHeader,
  Item: NavbarItem,
  Label: NavbarLabel,
  Menu: NavbarMenu,
  MenuItem: NavbarMenuItem,
  MenuToggle: NavbarMenuToggle,
  Root: NavbarRoot,
  Separator: NavbarSeparator,
  Spacer: NavbarSpacer,
});
