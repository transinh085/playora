import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-neutral-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:placeholder:text-[#737373]',
        'focus-visible:border-neutral-400 dark:focus-visible:border-white/30',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
