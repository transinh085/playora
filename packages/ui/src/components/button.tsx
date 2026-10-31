'use client';

import { cn } from '@playora/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'white'
  | 'destructive'
  | 'link';

export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Keep the button focusable while disabled. */
  focusableWhenDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Animate the left icon on hover. */
  leftIconMotion?: 'trash' | 'mail';
  /** Animate the right icon on hover. */
  rightIconMotion?: 'arrow' | 'download';
}

const base =
  'wensity-button relative inline-flex shrink-0 transform-gpu items-center justify-center gap-2 whitespace-nowrap rounded-xl ' +
  'text-sm font-medium select-none touch-manipulation ' +
  'transition-[background-color,border-color,box-shadow,color,opacity,translate] [transition-duration:var(--primitive-motion-fast),var(--primitive-motion-fast),var(--primitive-motion-moderate),var(--primitive-motion-fast),var(--primitive-motion-fast),var(--primitive-motion-moderate)] active:[transition-duration:var(--primitive-motion-fast)] ease-[var(--primitive-ease,cubic-bezier(0.23,1,0.32,1))] motion-reduce:transition-[background-color,border-color,box-shadow,color,opacity] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primitive-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ' +
  'disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45 ' +
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 ' +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const pressable =
  "active:translate-y-px data-[preview~='active']:translate-y-px motion-reduce:active:translate-y-0 disabled:active:translate-y-0 data-disabled:active:translate-y-0";

/**
 * Surface role per variant (`data-surface`).
 */
export const buttonSurface: Record<string, string | undefined> = {
  default: 'fill',
  secondary: 'control',
  outline: 'control',
  ghost: 'flat',
  white: 'fill',
  destructive: 'fill',
  link: undefined,
};

const variants = {
  default: cn(
    pressable,
    'text-[var(--primitive-control-solid-foreground)] ' +
      'hover:[--surface-face:var(--primitive-control-solid-hover)] active:[--surface-face:var(--primitive-control-solid-active)] ' +
      "data-[preview~='hover']:[--surface-face:var(--primitive-control-solid-hover)] data-[preview~='active']:[--surface-face:var(--primitive-control-solid-active)]",
  ),
  secondary: cn(
    pressable,
    '[--surface-face:var(--muted)] dark:[--surface-face:var(--primitive-control-face)] text-[var(--foreground)]',
  ),
  outline: cn(pressable, '[--surface-face:transparent] text-[var(--foreground)]'),
  ghost: cn(pressable, 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'),
  white: cn(
    pressable,
    '[--surface-face:var(--primitive-surface-elevated)] text-[var(--foreground)] ' +
      'dark:[--surface-face:var(--primitive-control-solid)] dark:text-[var(--primitive-control-solid-foreground)] ' +
      'dark:hover:[--surface-face:var(--primitive-control-solid-hover)] dark:active:[--surface-face:var(--primitive-control-solid-active)] ' +
      "dark:data-[preview~='hover']:[--surface-face:var(--primitive-control-solid-hover)] dark:data-[preview~='active']:[--surface-face:var(--primitive-control-solid-active)]",
  ),
  destructive: cn(
    pressable,
    '[--surface-face:var(--primitive-destructive)] text-[var(--primitive-destructive-foreground)] ' +
      'hover:[--surface-face:var(--primitive-destructive-hover)] active:[--surface-face:var(--primitive-destructive-active)] ' +
      "data-[preview~='hover']:[--surface-face:var(--primitive-destructive-hover)] data-[preview~='active']:[--surface-face:var(--primitive-destructive-active)]",
  ),
  link:
    'h-auto border border-transparent bg-transparent px-0 font-medium text-[var(--foreground)] underline-offset-4 ' +
    'hover:text-[var(--muted-foreground)] hover:underline hover:decoration-[color-mix(in_srgb,var(--foreground)_35%,transparent)] ' +
    'active:translate-y-0 active:text-[var(--foreground)]',
};

const sizes = {
  default: 'h-9 gap-2 px-4 text-sm has-[>svg]:px-3.5',
  md: 'h-9 gap-2 px-4 text-sm has-[>svg]:px-3.5',
  sm: 'h-8 gap-1.5 px-3.5 text-xs has-[>svg]:px-3',
  xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
  lg: 'h-10 gap-2 px-5 text-[15px] has-[>svg]:px-4',
  icon: 'size-9 gap-0 p-0',
  'icon-xs': "size-7 gap-0 p-0 [&_svg:not([class*='size-'])]:size-3.5",
  'icon-sm': 'size-8 gap-0 p-0',
  'icon-lg': 'size-10 gap-0 p-0',
};

const buttonVariants = cva(base, {
  variants: {
    variant: variants,
    size: sizes,
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const ICON_SHELL = 'relative z-10 inline-flex shrink-0 items-center justify-center';
const ICON_MOTION_SHELL = 'btn-icon-motion inline-flex shrink-0 origin-center transform-gpu';

const leftIconMotionClass = {
  trash: cn(ICON_MOTION_SHELL, 'btn-icon-motion--trash'),
  mail: cn(ICON_MOTION_SHELL, 'btn-icon-motion--mail'),
} as const;

const rightIconMotionClass = {
  arrow: cn(ICON_MOTION_SHELL, 'btn-icon-motion--arrow'),
  download: cn(ICON_MOTION_SHELL, 'btn-icon-motion--download'),
} as const;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      loading = false,
      disabled = false,
      focusableWhenDisabled,
      leftIcon,
      rightIcon,
      leftIconMotion,
      rightIconMotion,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const hasIconMotion = Boolean(leftIconMotion || rightIconMotion);
    const resolvedVariant = (variant ?? 'default') as ButtonVariant;
    const surface = buttonSurface[resolvedVariant];

    const composedClassName = cn(
      buttonVariants({ variant, size, className }),
      hasIconMotion && 'group',
    );

    const isIconSize =
      size === 'icon' || size === 'icon-xs' || size === 'icon-sm' || size === 'icon-lg';

    const content = isIconSize ? (
      loading ? (
        <ButtonSpinner />
      ) : (
        <span className={cn(ICON_SHELL)}>{leftIcon || children}</span>
      )
    ) : (
      <>
        {loading ? <ButtonSpinner /> : null}
        {!loading && leftIcon ? (
          <span className={cn(ICON_SHELL, leftIconMotion && leftIconMotionClass[leftIconMotion])}>
            {leftIcon}
          </span>
        ) : null}
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {!loading && rightIcon ? (
          <span
            className={cn(ICON_SHELL, rightIconMotion && rightIconMotionClass[rightIconMotion])}
          >
            {rightIcon}
          </span>
        ) : null}
      </>
    );

    if (asChild) {
      return (
        <Slot.Root
          data-slot="button"
          data-wensity-primitive=""
          data-surface={surface}
          data-variant={resolvedVariant}
          data-size={size ?? 'default'}
          ref={ref}
          aria-busy={loading ? true : undefined}
          data-loading={loading ? '' : undefined}
          data-disabled={isDisabled ? '' : undefined}
          className={composedClassName}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </Slot.Root>
      );
    }

    return (
      <button
        data-slot="button"
        data-wensity-primitive=""
        data-surface={surface}
        data-variant={resolvedVariant}
        data-size={size ?? 'default'}
        ref={ref}
        disabled={isDisabled}
        type={type ?? 'button'}
        className={composedClassName}
        aria-busy={loading ? true : undefined}
        data-loading={loading ? '' : undefined}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';

function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="relative z-10 size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent opacity-80 motion-safe:animate-spin"
    />
  );
}

export { Button, buttonVariants };
