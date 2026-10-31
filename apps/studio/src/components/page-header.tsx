'use client';

import { Button } from '@playora/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
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
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-md shadow-xs"
                  aria-label={backLabel}
                  onClick={() => router.push(backHref)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              {backLabel && <TooltipContent>{backLabel}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[22px] leading-7 font-semibold tracking-tight text-neutral-900 dark:text-[#FAFAFA]">
              {title}
            </h1>
            {tags}
          </div>
          {description && (
            <p className="mt-0.5 block text-[13px] leading-5 text-neutral-500 dark:text-[#A3A3A3]">
              {description}
            </p>
          )}
        </div>
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
}
