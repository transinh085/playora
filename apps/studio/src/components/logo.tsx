import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

/** Playora mark: Ora the Lucky Otter mascot logo. */
function LogoMark({ className, alt = 'Playora', ...props }: React.ComponentProps<'img'>) {
  return (
    // biome-ignore lint/performance/noImgElement: static brand logo svg
    <img
      src="/assets/logo.svg"
      alt={alt}
      className={cx('size-8 shrink-0 object-contain', className)}
      {...props}
    />
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
      <LogoMark className="size-[1.6em]" aria-hidden alt="" />
      <span className="tracking-tight">playora</span>
    </span>
  );
}

export { Logo, LogoMark };
