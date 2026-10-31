'use client';

import { Card } from '@playora/ui/components/card';
import type React from 'react';

/**
 * Bordered card that holds a list page's table flush to its edges, with an optional toolbar
 * (search, filters, bulk actions) above it. Luma style rounded container.
 */
export function TableCard({
  toolbar,
  header,
  children,
}: {
  toolbar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      {header}
      {toolbar && (
        <div className="flex min-h-[48px] items-center justify-between border-b border-neutral-200 bg-white p-2 dark:border-white/10 dark:bg-[#0A0A0A]">
          {toolbar}
        </div>
      )}
      {children}
    </Card>
  );
}
