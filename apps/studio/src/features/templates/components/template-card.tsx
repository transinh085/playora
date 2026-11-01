'use client';

import { Button, Card } from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiEyeLine,
  RiMagicLine,
  RiTimeLine,
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
    <Card
      className={cx(
        'group relative flex flex-col overflow-hidden border-[0.5px] border-border-card-default bg-background-secondary-default p-0',
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

        {/* Honest play duration pill */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-background-primary-default/90 px-2 py-0.5 border border-border-card-default shadow-2xs backdrop-blur-xs">
          <RiTimeLine className="size-3 text-accent-500" />
          <span className="text-[10px] font-medium text-text-primary tracking-tight">
            {template.playDuration}
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
            size="sm"
            className="w-full max-w-[140px] justify-center shadow-sm"
            onPress={() => onPreview(template)}
          >
            <RiEyeLine className="size-4" />
            {t('preview')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="w-full max-w-[140px] justify-center shadow-sm"
            onPress={() => onUse(template)}
          >
            <RiMagicLine className="size-4" />
            {t('use')}
          </Button>
        </div>
      </div>

      {/* Card Info Body - Title only, focused on preview */}
      <Card.Footer className="flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="truncate text-left text-body-2-semibold tracking-tight text-text-primary hover:text-accent-500 transition-colors"
          title={template.name}
        >
          {template.name}
        </button>
      </Card.Footer>
    </Card>
  );
}
