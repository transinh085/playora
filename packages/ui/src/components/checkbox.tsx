'use client';

import { CheckIcon } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-3.5 shrink-0 rounded-[4px] border border-[#D4D4D4] bg-white transition-all outline-none hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-[#171717] data-[state=checked]:bg-[#171717] data-[state=checked]:text-white dark:border-white/[0.22] dark:bg-transparent dark:hover:border-white/40 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:border-[#FAFAFA] dark:data-[state=checked]:bg-[#FAFAFA] dark:data-[state=checked]:text-[#0A0A0A]',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-2.5 stroke-[2.2]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
