'use client';

import type React from 'react';

/**
 * Bordered card that holds a list page's table flush to its edges, with an optional toolbar
 * (search, filters, bulk actions) above it. BoardUI rounded container.
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
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-card">
      {header}
      {toolbar && (
        <div className="flex min-h-[48px] items-center justify-between bg-background-primary-default p-3">
          {toolbar}
        </div>
      )}
      {children}
    </div>
  );
}
