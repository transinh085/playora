'use client';

import { Avatar, type AvatarProps } from '@playora/ui/components/base/avatar/avatar';
import { Button, type ButtonProps } from '@playora/ui/components/base/buttons/button';
import { CloseButton } from '@playora/ui/components/base/buttons/close-button';
import { Spinner } from '@playora/ui/components/base/spinner/spinner';
import { useDirection } from '@playora/ui/components/foundations/direction/direction';
import { cx, sortCx } from '@playora/ui/utils/cx';
import {
  RiAlertFill,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
  RiNotification3Fill,
} from '@remixicon/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType, HTMLAttributes, ReactNode, Ref } from 'react';
import { Children, isValidElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export type NotificationStatus =
  | 'neutral'
  | 'information'
  | 'success'
  | 'error'
  | 'warning'
  | 'loading';

export type NotificationPosition =
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

export type NotificationAvatar = Omit<AvatarProps, 'size'> & {
  presence?: 'online' | 'busy' | 'offline';
};

export type NotificationAction = {
  label: ReactNode;
  onClick?: () => void;
  variant?: ButtonProps['variant'];
};

export interface NotificationProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'title' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  status?: NotificationStatus;
  /** Custom leading icon. Defaults to the icon associated with `status`. */
  icon?: IconComponent;
  /** Avatar leading visual. When set, it takes precedence over `icon`. */
  avatar?: NotificationAvatar;
  /** Optional small BoardUI action buttons rendered below the message. */
  actions?: NotificationAction[];
  dismissible?: boolean;
  closeLabel?: string;
  /** Called after the dismiss animation completes. */
  onDismiss?: () => void;
  /**
   * Automatically dismiss after this many milliseconds.
   */
  autoDismissDuration?: number;
  /**
   * Whether to render a countdown progress bar along the bottom edge.
   * Defaults to false for a clean, modern aesthetic.
   */
  showProgressBar?: boolean;
  /**
   * Hold the auto-dismiss countdown, e.g. while the pointer or
   * focus is in a toast stack. The countdown resumes where it stopped.
   */
  paused?: boolean;
  /** Dismiss from outside: plays the exit animation, then calls `onDismiss`. */
  dismissed?: boolean;
  /** Optional entrance delay in seconds. */
  introDelay?: number;
  ref?: Ref<HTMLDivElement>;
}

export interface NotificationViewportProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  children?: ReactNode;
  /** Edge or corner where the notification stack is anchored. */
  position?: NotificationPosition;
  /** @deprecated Use `position` instead. */
  placement?: Extract<NotificationPosition, 'bottom-left' | 'bottom-right'>;
}

const STATUS_ICON: Record<Exclude<NotificationStatus, 'loading'>, IconComponent> = {
  neutral: RiNotification3Fill,
  information: RiInformationFill,
  success: RiCheckboxCircleFill,
  error: RiErrorWarningFill,
  warning: RiAlertFill,
};

const styles = sortCx({
  card: [
    'relative flex w-full overflow-hidden transition-all duration-200',
    'rounded-2xl border border-border-button-default/80 dark:border-white/10',
    'bg-background-primary-default/95 dark:bg-background-secondary-default/95 backdrop-blur-md',
    'shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1),0_4px_12px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]',
  ].join(' '),
  visual: 'relative flex size-8 shrink-0 items-center justify-center rounded-full',
  icon: 'size-4.5',
  content: 'flex min-w-0 flex-1 flex-col justify-center',
  header: 'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5',
  title: 'text-body-medium font-medium text-text-primary tracking-tight',
  timestamp: 'text-caption-1-regular text-text-tertiary',
  description: 'text-caption-1-regular text-text-secondary leading-relaxed mt-0.5',
  actions: 'mt-2 flex flex-wrap items-center gap-2',
  close:
    'absolute shrink-0 p-1 rounded-full cursor-pointer select-none transition-colors duration-150',
  status: {
    neutral: 'bg-background-tertiary-default text-text-secondary',
    information: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-400',
    success: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400',
    error: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400',
    loading: 'bg-accent-500/15 text-accent-600 dark:bg-accent-500/25 dark:text-accent-400',
  },
  presence: {
    online: 'bg-lime-500',
    busy: 'bg-rose-500',
    offline: 'bg-background-quaternary-hover',
  },
});

const VIEWPORT_POSITION = {
  'top-start': 'top-3 start-3 items-start sm:top-5 sm:start-5',
  'top-end': 'top-3 end-3 items-end sm:top-5 sm:end-5',
  'bottom-start': 'bottom-3 start-3 items-start sm:bottom-5 sm:start-5',
  'bottom-end': 'end-3 bottom-3 items-end sm:end-5 sm:bottom-5',
  'top-left': 'top-3 left-3 items-start sm:top-5 sm:left-5',
  'top-center': 'top-3 left-1/2 -translate-x-1/2 items-center sm:top-5',
  'top-right': 'top-3 right-3 items-end sm:top-5 sm:right-5',
  'bottom-left': 'bottom-3 left-3 items-start sm:bottom-5 sm:left-5',
  'bottom-center': 'bottom-3 left-1/2 -translate-x-1/2 items-center sm:bottom-5',
  'bottom-right': 'right-3 bottom-3 items-end sm:right-5 sm:bottom-5',
} satisfies Record<NotificationPosition, string>;

const subscribeToHydration = () => () => {};

function NotificationAvatarVisual({ presence, className, ...avatar }: NotificationAvatar) {
  return (
    <span className="relative shrink-0">
      <Avatar {...avatar} size="lg" className={cx('size-8', className)} />
      {presence ? (
        <span
          aria-hidden
          className={cx(
            'absolute end-0 bottom-0 size-2.5 rounded-full border-2 border-background-primary-default',
            styles.presence[presence],
          )}
        />
      ) : null}
    </span>
  );
}

export function Notification({
  title,
  description,
  timestamp,
  status = 'neutral',
  icon,
  avatar,
  actions,
  dismissible = true,
  closeLabel = 'Dismiss notification',
  onDismiss,
  autoDismissDuration,
  showProgressBar = false,
  paused = false,
  dismissed: dismissedProp = false,
  introDelay,
  className,
  ref,
  role,
  ...props
}: NotificationProps) {
  const [dismissedState, setDismissed] = useState(false);
  const dismissed = dismissedProp || dismissedState;
  const Icon = icon ?? (status !== 'loading' ? STATUS_ICON[status] : RiNotification3Fill);
  const hasIntro = introDelay !== undefined;
  const introDelayMs = (introDelay ?? 0) * 1000;
  const timed = Boolean(autoDismissDuration && autoDismissDuration > 0);
  const hasDetails = Boolean(description || actions?.length || timestamp);

  const barRef = useRef<HTMLSpanElement>(null);
  const bar = useRef<Animation | null>(null);
  const remaining = useRef((autoDismissDuration ?? 0) + introDelayMs);

  useEffect(() => {
    const element = barRef.current;
    if (!timed || !showProgressBar || !element) return;
    bar.current = element.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: autoDismissDuration,
      delay: introDelayMs,
      easing: 'linear',
      fill: 'forwards',
    });
    return () => bar.current?.cancel();
  }, [timed, showProgressBar, autoDismissDuration, introDelayMs]);

  useEffect(() => {
    if (!timed || dismissed) return;
    if (paused) {
      bar.current?.pause();
      return;
    }
    bar.current?.play();
    const startedAt = performance.now();
    const timer = window.setTimeout(() => setDismissed(true), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [timed, paused, dismissed]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {!dismissed ? (
        <motion.div
          ref={ref}
          role={role ?? (status === 'error' ? 'alert' : 'status')}
          initial={hasIntro ? { opacity: 0, y: -10, scale: 0.96 } : false}
          animate={
            hasIntro
              ? {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.22,
                    delay: introDelay,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }
              : undefined
          }
          exit={{
            opacity: 0,
            scale: 0.94,
            transition: { duration: 0.16, ease: 'easeOut' },
          }}
          className={cx(
            styles.card,
            hasDetails
              ? 'items-start gap-3 p-3.5 pe-10 sm:p-4 sm:pe-11'
              : 'items-center gap-3 px-3.5 py-2.5 pe-9 sm:px-4 sm:py-3 sm:pe-10 min-h-[48px]',
            className,
          )}
          {...props}
        >
          {status === 'loading' ? (
            <span className={cx(styles.visual, styles.status.loading)}>
              <Spinner size="xs" className="text-accent-600 dark:text-accent-400" />
            </span>
          ) : avatar ? (
            <NotificationAvatarVisual {...avatar} />
          ) : (
            <span className={cx(styles.visual, styles.status[status])}>
              <Icon className={styles.icon} aria-hidden />
            </span>
          )}

          <div className={styles.content}>
            <div className={styles.header}>
              <p className={styles.title}>{title}</p>
              {timestamp ? <span className={styles.timestamp}>{timestamp}</span> : null}
            </div>
            {description ? <p className={styles.description}>{description}</p> : null}

            {actions?.length ? (
              <div className={styles.actions}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant={action.variant ?? (index === 0 ? 'secondary' : 'primary')}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {dismissible ? (
            <CloseButton
              size="xs"
              aria-label={closeLabel}
              onClick={() => setDismissed(true)}
              className={cx(
                styles.close,
                hasDetails ? 'top-3 end-3' : 'top-1/2 -translate-y-1/2 end-2.5',
                'bg-transparent text-text-tertiary hover:text-text-primary hover:bg-background-tertiary-default transition-colors',
              )}
            />
          ) : null}

          {timed && showProgressBar ? (
            <span
              ref={barRef}
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2.5px] origin-left rtl:origin-right bg-accent-600"
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Viewport-level notification region. Anchor the stack to any corner or
 * horizontal center with `position`; children with stable keys move smoothly
 * as notifications enter and leave.
 */
export function NotificationViewport({
  children,
  position,
  placement,
  className,
  'aria-label': ariaLabel = 'Notifications',
  ...props
}: NotificationViewportProps) {
  const direction = useDirection();
  const resolvedPosition = position ?? placement ?? 'bottom-end';
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      layoutRoot
      dir={direction}
      aria-label={ariaLabel}
      className={cx(
        'pointer-events-none fixed z-[9999] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2 sm:gap-2.5',
        VIEWPORT_POSITION[resolvedPosition],
        className,
      )}
      {...props}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {Children.toArray(children).map((child, index) => (
          <motion.div
            layout
            key={isValidElement(child) && child.key !== null ? child.key : index}
            className="pointer-events-auto w-full"
            transition={{
              layout: {
                type: 'spring',
                stiffness: 520,
                damping: 42,
                mass: 0.7,
              },
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
