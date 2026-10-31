'use client';

import { IconButton } from '@playora/ui/components/base/buttons/icon-button';
import { ArrowLeft } from '@playora/ui/icons';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type React from 'react';

/**
 * Page title row for every Studio page (docs/engineering/design-system.md §5, after games-vt's PageHeader): bold title with
 * inline tags, a one-line description under it, an outlined back button, and actions on the right.
 */
export function PageHeader({
  title,
  description,
  tags,
  extra,
  backHref,
  backLabel,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  tags?: React.ReactNode;
  extra?: React.ReactNode;
  backHref?: Route;
  backLabel?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <IconButton
            icon={ArrowLeft}
            size="medium"
            aria-label={backLabel ?? 'Back'}
            title={backLabel}
            onClick={() => router.push(backHref)}
          />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-title-2-semibold text-text-primary">{title}</h1>
            {tags}
          </div>
          {description && (
            <p className="mt-0.5 block text-body-2-regular text-text-secondary">{description}</p>
          )}
        </div>
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
}
