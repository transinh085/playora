'use client';

import { Card, Separator } from '@playora/ui/components';
import type React from 'react';

/**
 * Bordered HeroUI Card that holds a list page's table flush to its edges, with an optional toolbar
 * (search, filters, bulk actions) above it.
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
    <Card className="overflow-hidden p-0">
      {header}
      {toolbar && (
        <>
          <div className="flex min-h-[48px] items-center justify-between p-3">{toolbar}</div>
          <Separator />
        </>
      )}
      {children}
    </Card>
  );
}
