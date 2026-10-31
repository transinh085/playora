'use client';

import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'bg-neutral-50 dark:bg-[#0A0A0A] [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-neutral-200 dark:[&_th:not(:last-child)]:border-white/10 [&_tr]:border-b [&_tr]:border-neutral-200 dark:[&_tr]:border-white/10',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        '[&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-neutral-200 dark:[&_td:not(:last-child)]:border-white/10 [&_tr:last-child]:border-0',
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-neutral-200 bg-neutral-100 font-medium dark:border-white/10 dark:bg-[#171717] [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-neutral-200 transition-colors hover:bg-neutral-50 has-aria-expanded:bg-neutral-50 data-[state=selected]:bg-neutral-100 dark:border-white/10 dark:hover:bg-white/5 dark:has-aria-expanded:bg-white/5 dark:data-[state=selected]:bg-white/10',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-[44px] px-2 text-left align-middle text-sm font-normal whitespace-nowrap text-neutral-600 dark:text-[#A3A3A3] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-[44px] p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
