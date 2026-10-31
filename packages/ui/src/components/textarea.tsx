import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-900 shadow-xs transition-colors outline-none placeholder:text-neutral-400 focus-visible:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:placeholder:text-[#737373] dark:focus-visible:border-white/30 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
