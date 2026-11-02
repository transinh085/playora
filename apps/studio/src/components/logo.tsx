import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

/** Playora mark: a play button under a spotlight. Colours follow Ora brand palette (#F25C05, #FFFBF5, #0D9488). */
function LogoMark({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Playora"
      className={cx('size-8 shrink-0', className)}
      {...props}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-brand-primary, #F25C05)" />
      <path
        d="M11.5 10.2v11.6c0 .8.9 1.3 1.6.9l9.4-5.8c.6-.4.6-1.4 0-1.8l-9.4-5.8c-.7-.4-1.6.1-1.6.9Z"
        fill="var(--color-brand-cream, #FFFBF5)"
      />
      <circle cx="24.5" cy="7.5" r="3.5" fill="var(--color-brand-teal, #0D9488)" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark is always lowercase, set in the display face. */
function Logo({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="logo"
      className={cx('inline-flex items-center gap-2 font-display text-lg font-semibold', className)}
      {...props}
    >
      <LogoMark className="size-[1.6em]" aria-hidden />
      <span className="tracking-tight">playora</span>
    </span>
  );
}

export { Logo, LogoMark };
