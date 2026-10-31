import { cn } from '@playora/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-[#A3A3A3] [a&]:hover:bg-secondary/90',
        destructive:
          'border-rose-200 bg-rose-100 text-rose-700 focus-visible:ring-destructive/20 dark:border-rose-900 dark:bg-rose-500/20 dark:text-rose-300 [a&]:hover:bg-rose-500/15',
        outline:
          'border-neutral-200 bg-background text-foreground dark:border-white/10 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
        success:
          'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
        warning:
          'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
        info: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-500/20 dark:text-blue-300',
        live: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
        /* Louis CRM / Attio pastel categorical tags */
        orange:
          'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
        teal: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
        blue: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-500/20 dark:text-blue-300',
        sky: 'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900 dark:bg-sky-500/20 dark:text-sky-300',
        cyan: 'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900 dark:bg-sky-500/20 dark:text-sky-300',
        purple:
          'border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900 dark:bg-purple-500/20 dark:text-purple-300',
        pink: 'border-pink-200 bg-pink-100 text-pink-700 dark:border-pink-900 dark:bg-pink-500/20 dark:text-pink-300',
        rose: 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900 dark:bg-rose-500/20 dark:text-rose-300',
        indigo:
          'border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
