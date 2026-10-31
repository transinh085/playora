'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { cx } from '@playora/ui/utils/cx';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiEyeLine,
  RiFireLine,
  RiMagicLine,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { FitScreen } from '@/features/builder-lab/components/editor/fit-screen';
import type { CatalogTemplate } from '../data/mock-templates';

export function TemplateCard({
  template,
  onPreview,
  onUse,
  isSaved = false,
  onToggleSave,
}: {
  template: CatalogTemplate;
  onPreview: (template: CatalogTemplate) => void;
  onUse: (template: CatalogTemplate) => void;
  isSaved?: boolean;
  onToggleSave?: (templateId: string) => void;
}) {
  const t = useTranslations('templatesCatalog.card');
  const coverScreen = template.screens.cover;

  return (
    <article
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-2xl border-[0.5px] border-border-card-default bg-background-secondary-default',
        'transition-all duration-200 hover:border-border-card-hover hover:shadow-card',
      )}
    >
      {/* Real Canvas Preview Container */}
      <div className="relative aspect-[9/13] w-full overflow-hidden bg-background-tertiary-default border-b border-border-card-default">
        {coverScreen && (
          <div className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]">
            <FitScreen screen={coverScreen} brand={template.brand} />
          </div>
        )}

        {/* Usage count micro-stat pill */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-background-primary-default/90 px-2 py-0.5 border border-border-card-default shadow-2xs backdrop-blur-xs">
          <RiFireLine className="size-3 text-orange-500 fill-orange-500" />
          <span className="text-[10px] font-medium text-text-primary tracking-tight">
            {t('usageTag', { count: template.usageCount })}
          </span>
        </div>

        {/* Bookmark / Save for later button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(template.id);
          }}
          aria-label={isSaved ? t('saved') : t('save')}
          title={isSaved ? t('saved') : t('save')}
          className={cx(
            'absolute right-2.5 top-2.5 z-20 flex size-7 items-center justify-center rounded-full transition-all cursor-pointer shadow-2xs',
            isSaved
              ? 'bg-accent-500 text-white shadow-xs'
              : 'bg-background-primary-default/85 text-text-secondary backdrop-blur-xs border border-border-card-default hover:text-text-primary hover:bg-background-primary-default opacity-80 group-hover:opacity-100',
          )}
        >
          {isSaved ? (
            <RiBookmarkFill className="size-3.5 fill-current" />
          ) : (
            <RiBookmarkLine className="size-3.5" />
          )}
        </button>

        {/* Hover action overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/45 p-3 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiEyeLine}
            className="w-full max-w-[140px] shadow-sm justify-center"
            onClick={() => onPreview(template)}
          >
            {t('preview')}
          </Button>
          <Button
            variant="primary"
            size="small"
            leadingIcon={RiMagicLine}
            className="w-full max-w-[140px] shadow-sm justify-center"
            onClick={() => onUse(template)}
          >
            {t('use')}
          </Button>
        </div>
      </div>

      {/* Card Info Body - Title only, focused on preview */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="truncate text-left text-body-2-semibold tracking-tight text-text-primary hover:text-accent-500 transition-colors"
          title={template.name}
        >
          {template.name}
        </button>
      </div>
    </article>
  );
}
