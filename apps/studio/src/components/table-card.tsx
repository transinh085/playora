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
    <Card className="overflow-hidden rounded-2xl border border-border/80 p-0 shadow-xs">
      {header}
      {toolbar && <div className="p-4 border-b border-border/60">{toolbar}</div>}
      {children}
    </Card>
  );
}
