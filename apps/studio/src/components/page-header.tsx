'use client';

import type React from 'react';

/**
 * Page title row for every Studio page (docs/engineering/design-system.md §5, after games-vt's PageHeader): bold title with
 * inline tags, a one-line description under it, and actions on the right.
 * Navigation is handled via the system-wide breadcrumb trail in the AppShell header.
 */
export function PageHeader({
  title,
  description,
  tags,
  extra,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  tags?: React.ReactNode;
  extra?: React.ReactNode;
  /** @deprecated Navigation is handled by AppShell breadcrumb */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-title-2-semibold text-text-primary">{title}</h1>
          {tags}
        </div>
        {description && (
          <p className="mt-0.5 block text-body-2-regular text-text-secondary">{description}</p>
        )}
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
}
